"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import {
  DEFAULT_GEAR_CATEGORIES,
  generateTripCode,
  getCar,
  getGearCategories,
  getParticipant,
  getParticipantByUser,
  getParticipants,
  getTent,
  getTripByCode,
  getTripById,
  getUserByPhone,
  createUser,
  normalizePhone,
} from "./db";
import { isThemeId } from "./themes";
import { isAnnounceFont } from "./announceFonts";
import { sendAnnouncementEmail } from "./mail";
import { issueMagicLink } from "./magiclink";
import { maskEmail } from "./mask";
import {
  clearSession,
  currentUser,
  readSession,
  requireUser,
  tripIdentity,
  writeSession,
  type TripIdentity,
} from "./session";

function refresh() {
  revalidatePath("/", "layout");
}

// ---------- Auth (AUTH-10/11) ----------

/** N'autorise qu'un chemin interne relatif comme destination (anti open-redirect). */
function safeNext(raw: string): string {
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "";
}

// Validation légère d'une adresse (même règle qu'à l'inscription).
function isValidEmail(e: string): boolean {
  return /^\S+@\S+\.\S+$/.test(e);
}

export async function loginWithPhone(formData: FormData) {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const next = safeNext(String(formData.get("next") ?? ""));
  if (phone.replace(/\D/g, "").length < 8) {
    const p = new URLSearchParams({ error: "phone" });
    if (next) p.set("next", next);
    redirect(`/login?${p.toString()}`);
  }
  const user = await getUserByPhone(phone);
  if (!user) {
    // Nouveau numéro → on bascule sur l'inscription (nom + courriel).
    const p = new URLSearchParams({ step: "name", phone });
    if (next) p.set("next", next);
    redirect(`/login?${p.toString()}`);
  }
  // Compte existant → on envoie un lien de connexion par courriel.
  let sent = true;
  try {
    await issueMagicLink({ id: user.id, email: user.email, firstName: user.firstName }, next);
  } catch (err) {
    console.error("[MAGIC LINK] Échec de l'envoi (login) :", err);
    sent = false;
  }
  if (!sent) {
    const p = new URLSearchParams({ error: "send", phone });
    if (next) p.set("next", next);
    redirect(`/login?${p.toString()}`);
  }
  const p = new URLSearchParams({ step: "sent", email: maskEmail(user.email) });
  if (next) p.set("next", next);
  redirect(`/login?${p.toString()}`);
}

export async function registerUser(formData: FormData) {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? ""));
  if (phone.replace(/\D/g, "").length < 8) redirect("/login?error=phone");

  const back = (error: string) => {
    const params = new URLSearchParams({ step: "name", phone, error });
    if (firstName) params.set("firstName", firstName);
    if (lastName) params.set("lastName", lastName);
    if (email) params.set("email", email);
    if (next) params.set("next", next);
    redirect(`/login?${params.toString()}`);
  };
  if (!firstName || !lastName) back("name");
  if (!/^\S+@\S+\.\S+$/.test(email)) back("email");

  const user =
    (await getUserByPhone(phone)) ??
    (await createUser({ phone, firstName, lastName, email }));
  // Inscription/connexion par lien : on envoie le magic link au courriel saisi.
  let sent = true;
  try {
    await issueMagicLink({ id: user.id, email: user.email, firstName: user.firstName }, next);
  } catch (err) {
    console.error("[MAGIC LINK] Échec de l'envoi (inscription) :", err);
    sent = false;
  }
  if (!sent) back("send");
  const p = new URLSearchParams({ step: "sent", email: maskEmail(user.email) });
  if (next) p.set("next", next);
  redirect(`/login?${p.toString()}`);
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

// ---------- Vérification d'adresse (migration magic link, étape 2) ----------

/**
 * Renvoie un lien de vérification à l'utilisateur connecté, sur l'adresse déjà
 * en base. Utilisé par le bandeau et la page /verify. Silencieux si un lien a
 * été demandé il y a moins d'une minute (anti-spam géré dans issueMagicLink).
 */
export async function resendMyVerification() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.emailVerifiedAt) redirect("/");
  try {
    await issueMagicLink(
      { id: user.id, email: user.email, firstName: user.firstName },
      "/"
    );
  } catch (err) {
    console.error("[MAGIC LINK] Échec du renvoi (self) :", err);
    redirect("/verify?error=send");
  }
  redirect(`/verify?sent=${encodeURIComponent(maskEmail(user.email))}`);
}

/**
 * Correction self-service : l'utilisateur connecté (mais non encore vérifié)
 * corrige lui-même son adresse et reçoit aussitôt un lien à la nouvelle adresse.
 * Filet anti-verrouillage principal tant que la session reste valide.
 */
export async function updateMyEmail(formData: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.emailVerifiedAt) redirect("/");
  const email = String(formData.get("email") ?? "").trim();
  if (!isValidEmail(email)) redirect("/verify?error=email");
  await prisma.user.update({ where: { id: user.id }, data: { email } });
  try {
    // force : l'ancien lien pointait vers l'ancienne adresse, on en émet un neuf.
    await issueMagicLink({ id: user.id, email, firstName: user.firstName }, "/", {
      force: true,
    });
  } catch (err) {
    console.error("[MAGIC LINK] Échec après correction self :", err);
    redirect("/verify?error=send");
  }
  redirect(`/verify?sent=${encodeURIComponent(maskEmail(email))}`);
}

/**
 * Filet anti-verrouillage côté admin : un admin de voyage corrige l'adresse d'un
 * membre relié à un compte et lui renvoie un lien. Réservé aux membres du voyage
 * possédant déjà un compte (userId non nul).
 */
export async function adminFixUserEmail(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  if (!(await requireAdmin(tripId))) return;
  const pid = Number(formData.get("pid"));
  const email = String(formData.get("email") ?? "").trim();
  const p = await getParticipant(pid);
  if (!p || p.tripId !== tripId || !p.userId) return;
  if (!isValidEmail(email)) redirect(`/t/${tripId}/participants?fix=email`);
  const target = await prisma.user.findUnique({ where: { id: p.userId } });
  if (!target) return;
  await prisma.user.update({ where: { id: target.id }, data: { email } });
  // On aligne aussi la copie d'e-mail du participant (fallback des annonces).
  await prisma.participant.update({ where: { id: p.id }, data: { email } });
  try {
    await issueMagicLink({ id: target.id, email, firstName: target.firstName }, "/", {
      force: true,
    });
  } catch (err) {
    console.error("[MAGIC LINK] Échec après correction admin :", err);
    redirect(`/t/${tripId}/participants?fix=send`);
  }
  refresh();
  redirect(`/t/${tripId}/participants?fix=ok`);
}

// ---------- Voyages (TRIP-01..04) ----------

export async function submitTripCode(formData: FormData) {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").trim();
  const trip = code ? await getTripByCode(code) : null;
  if (!trip) redirect("/?error=code");
  if (await getParticipantByUser(trip.id, user.id)) redirect(`/t/${trip.id}`);
  redirect(`/join?code=${encodeURIComponent(trip.accessCode)}`);
}

export async function claimParticipant(formData: FormData) {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "");
  const pid = Number(formData.get("pid"));
  const trip = await getTripByCode(code);
  if (!trip) redirect("/?error=code");
  if (await getParticipantByUser(trip.id, user.id)) redirect(`/t/${trip.id}`);
  const p = await getParticipant(pid);
  if (!p || p.tripId !== trip.id || p.userId !== null) {
    redirect(`/join?code=${encodeURIComponent(code)}&error=taken`);
  }
  // updateMany + condition userId=null : imperméable à deux réclamations simultanées
  const claimed = await prisma.participant.updateMany({
    where: { id: p.id, userId: null },
    data: { userId: user.id, phone: user.phone, email: user.email },
  });
  if (claimed.count === 0) {
    redirect(`/join?code=${encodeURIComponent(code)}&error=taken`);
  }
  refresh();
  redirect(`/t/${trip.id}`);
}

export async function joinAsNewParticipant(formData: FormData) {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "");
  const trip = await getTripByCode(code);
  if (!trip) redirect("/?error=code");
  if (await getParticipantByUser(trip.id, user.id)) redirect(`/t/${trip.id}`);
  if ((await getParticipants(trip.id)).length >= trip.capacity) {
    redirect(`/join?code=${encodeURIComponent(code)}&error=full`);
  }
  await prisma.participant.create({
    data: {
      tripId: trip.id,
      userId: user.id,
      name: user.firstName,
      phone: user.phone,
      email: user.email,
    },
  });
  refresh();
  redirect(`/t/${trip.id}`);
}

/**
 * Normalise un lien de carte fourni par l'utilisateur.
 * Accepte seulement http/https (ajoute https:// si le schéma manque) — évite
 * les href dangereux type `javascript:`. Renvoie "" si ce n'est pas une URL.
 */
function sanitizeMapUrl(raw: string): string {
  let s = String(raw ?? "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) {
    // « maps.google.com/… » sans schéma → on préfixe, sinon on rejette.
    if (/^[\w-]+(\.[\w-]+)+/.test(s)) s = "https://" + s;
    else return "";
  }
  try {
    const u = new URL(s);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    /* URL invalide */
  }
  return "";
}

export async function createTrip(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/new?error=name");
  const location = String(formData.get("location") ?? "").trim();
  const locationUrl = sanitizeMapUrl(String(formData.get("locationUrl") ?? ""));
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const meetingPoint = String(formData.get("meetingPoint") ?? "").trim();
  const capacityRaw = Number(formData.get("capacity"));
  const capacity = capacityRaw >= 1 ? capacityRaw : 10;

  const trip = await prisma.trip.create({
    data: {
      name,
      location,
      locationUrl,
      startDate,
      endDate,
      meetingPoint,
      capacity,
      accessCode: await generateTripCode(),
      // Le créateur devient l'admin du voyage (TRIP-04)
      participants: {
        create: {
          userId: user.id,
          role: "admin",
          name: user.firstName,
          phone: user.phone,
          email: user.email,
        },
      },
      gearCategories: { create: DEFAULT_GEAR_CATEGORIES.map((cat) => ({ name: cat })) },
    },
  });
  refresh();
  redirect(`/t/${trip.id}`);
}

// ---------- Administration (ADM-02..06) ----------

async function requireAdmin(tripId: number) {
  const identity = await tripIdentity(tripId);
  if (!identity || identity.role !== "admin") return null;
  return identity;
}

export async function updateTripSettings(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  if (!(await requireAdmin(tripId))) return;
  const name = String(formData.get("name") ?? "").trim();
  const capacity = Number(formData.get("capacity"));
  if (!name || !(capacity >= 1)) return;
  const location = String(formData.get("location") ?? "").trim();
  const locationUrl = sanitizeMapUrl(String(formData.get("locationUrl") ?? ""));
  await prisma.trip.update({
    where: { id: tripId },
    data: { name, capacity, location, locationUrl },
  });
  refresh();
}

/**
 * Suppression définitive d'un voyage (ADM). Réservé à l'admin. Porte de
 * validation côté serveur, dernier rempart si les gardes de l'UI sont
 * contournées : le nom saisi doit correspondre exactement au nom du voyage.
 * La suppression cascade sur tout ce qui dépend du voyage (participants,
 * annonces, voitures, tentes, matos, repas — FK onDelete: Cascade).
 */
export async function deleteTrip(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  if (!(await requireAdmin(tripId))) return;
  const trip = await getTripById(tripId);
  if (!trip) return;
  const confirmName = String(formData.get("confirmName") ?? "").trim();
  if (confirmName !== trip.name) redirect(`/t/${tripId}/admin?del=mismatch`);
  await prisma.trip.delete({ where: { id: tripId } });
  refresh();
  redirect("/");
}

export async function setTripTheme(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  if (!(await requireAdmin(tripId))) return;
  const theme = String(formData.get("theme") ?? "");
  if (!isThemeId(theme)) return;
  await prisma.trip.update({ where: { id: tripId }, data: { theme } });
  refresh();
}

export async function adminActAs(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await requireAdmin(tripId);
  if (!identity) return;
  const pid = Number(formData.get("pid"));
  await writeSession({
    uid: identity.user.id,
    actAs: pid > 0 && pid !== identity.participant.id ? pid : undefined,
  });
  refresh();
}

// Bascule admin ↔ voyageur : un vrai admin peut voir l'app comme un voyageur
// ordinaire (rôle effectif « participant »), et revenir quand il veut.
export async function toggleTravelerView(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity || !identity.isActuallyAdmin) return;
  const session = await readSession();
  await writeSession({
    ...session,
    viewParticipant: !identity.viewingAsParticipant,
    // En vue voyageur on abandonne toute impersonation active (cohérence de vue).
    actAs: undefined,
  });
  refresh();
}

// Réglages « Pages & permissions » de la maquette : chaque interrupteur s'applique
// immédiatement (un seul flag basculé par appel). La liste blanche évite qu'un
// champ de formulaire forgé ne modifie une colonne arbitraire.
const TRIP_FLAGS = [
  "allowMemberCars",
  "allowMemberTents",
  "pageCarpool",
  "pageMeals",
  "pageTents",
  "pageGear",
  "requireReaction",
] as const;

export async function toggleTripFlag(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  if (!(await requireAdmin(tripId))) return;
  const flag = String(formData.get("flag") ?? "");
  if (!(TRIP_FLAGS as readonly string[]).includes(flag)) return;
  const trip = await getTripById(tripId);
  if (!trip) return;
  const current = Boolean((trip as unknown as Record<string, boolean>)[flag]);
  await prisma.trip.update({ where: { id: tripId }, data: { [flag]: !current } });
  refresh();
}

// Multi-admins : un admin peut en nommer un autre ; il ne peut pas se révoquer lui-même
// (garantit qu'un voyage garde toujours au moins un admin).

export async function promoteToAdmin(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  if (!(await requireAdmin(tripId))) return;
  const pid = Number(formData.get("pid"));
  const p = await getParticipant(pid);
  if (!p || p.tripId !== tripId) return;
  await prisma.participant.update({ where: { id: pid }, data: { role: "admin" } });
  refresh();
}

export async function demoteAdmin(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await requireAdmin(tripId);
  if (!identity) return;
  const pid = Number(formData.get("pid"));
  if (pid === identity.participant.id) return; // pas soi-même
  const p = await getParticipant(pid);
  if (!p || p.tripId !== tripId) return;
  await prisma.participant.update({ where: { id: pid }, data: { role: "participant" } });
  refresh();
}

// Voitures/tentes : déclarées par les participants (si autorisé) ou créées par l'admin.
// Le propriétaire (ownerId) et l'admin peuvent modifier/supprimer.

export async function declareCar(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const trip = await getTripById(tripId);
  if (!trip || (!trip.allowMemberCars && identity.role !== "admin")) return;
  if (identity.effective.carId) return; // déjà dans une voiture
  const departPlace = String(formData.get("departPlace") ?? "").trim();
  const departTime = String(formData.get("departTime") ?? "").trim();
  const seats = Number(formData.get("seats"));
  if (!(seats >= 1)) return;
  const label =
    String(formData.get("label") ?? "").trim() || `Voiture de ${identity.effective.name}`;
  const car = await prisma.car.create({
    data: { tripId, ownerId: identity.effective.id, label, departPlace, departTime, seats },
  });
  await prisma.participant.update({
    where: { id: identity.effective.id },
    data: { carId: car.id },
  });
  refresh();
}

export async function updateCar(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const carId = Number(formData.get("carId"));
  const car = await getCar(carId);
  if (!car || car.tripId !== tripId) return;
  if (identity.role !== "admin" && car.ownerId !== identity.effective.id) return;
  const label = String(formData.get("label") ?? "").trim();
  const departPlace = String(formData.get("departPlace") ?? "").trim();
  const departTime = String(formData.get("departTime") ?? "").trim();
  const seats = Number(formData.get("seats"));
  if (!label || !(seats >= 1)) return;
  await prisma.car.update({
    where: { id: carId },
    data: { label, departPlace, departTime, seats },
  });
  refresh();
}

export async function deleteCar(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const carId = Number(formData.get("carId"));
  const car = await getCar(carId);
  if (!car || car.tripId !== tripId) return;
  if (identity.role !== "admin" && car.ownerId !== identity.effective.id) return;
  // La FK participant.carId est en SetNull : les occupants sont libérés automatiquement
  await prisma.car.delete({ where: { id: carId } });
  refresh();
}

export async function declareTent(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const trip = await getTripById(tripId);
  if (!trip || (!trip.allowMemberTents && identity.role !== "admin")) return;
  if (identity.effective.tentId) return; // déjà dans une tente
  const capacity = Number(formData.get("capacity"));
  if (!(capacity >= 1)) return;
  const label =
    String(formData.get("label") ?? "").trim() || `Tente de ${identity.effective.name}`;
  const tent = await prisma.tent.create({
    data: { tripId, ownerId: identity.effective.id, label, capacity },
  });
  await prisma.participant.update({
    where: { id: identity.effective.id },
    data: { tentId: tent.id },
  });
  refresh();
}

export async function updateTent(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const tentId = Number(formData.get("tentId"));
  const tent = await getTent(tentId);
  if (!tent || tent.tripId !== tripId) return;
  if (identity.role !== "admin" && tent.ownerId !== identity.effective.id) return;
  const label = String(formData.get("label") ?? "").trim();
  const capacity = Number(formData.get("capacity"));
  if (!label || !(capacity >= 1)) return;
  await prisma.tent.update({ where: { id: tentId }, data: { label, capacity } });
  refresh();
}

export async function deleteTent(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const tentId = Number(formData.get("tentId"));
  const tent = await getTent(tentId);
  if (!tent || tent.tripId !== tripId) return;
  if (identity.role !== "admin" && tent.ownerId !== identity.effective.id) return;
  await prisma.tent.delete({ where: { id: tentId } });
  refresh();
}

// ---------- Thème clair/sombre (préférence utilisateur, UX-02) ----------

export async function toggleTheme() {
  const store = await cookies();
  const current = store.get("theme")?.value ?? "light";
  store.set("theme", current === "dark" ? "light" : "dark", { maxAge: 60 * 60 * 24 * 365 });
  refresh();
}

// ---------- Annonces ----------

export async function publishAnnouncement(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await requireAdmin(tripId);
  if (!identity) return;
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;
  const fontRaw = String(formData.get("font") ?? "barlow");
  const font = isAnnounceFont(fontRaw) ? fontRaw : "barlow";
  const authorLabel = identity.isImpersonating
    ? `${identity.user.firstName} (pour ${identity.effective.name})`
    : `${identity.user.firstName} (admin)`;
  await prisma.announcement.create({
    data: { tripId, content, font, authorLabel, createdAt: new Date().toISOString() },
  });
  // ANN-05 — destinataires : le courriel du compte lié, sinon celui saisi par l'admin.
  const recipients = await prisma.participant.findMany({
    where: { tripId, isActive: true },
    include: { user: { select: { email: true } } },
  });
  const emails = new Set(
    recipients.map((p) => p.user?.email ?? p.email).filter((e): e is string => Boolean(e))
  );
  // On ne se notifie pas soi-même : l'auteur reçoit déjà une copie (champ « To »).
  emails.delete(identity.user.email);
  // L'e-mail ne doit jamais faire échouer la publication de l'annonce.
  try {
    const trip = await getTripById(tripId);
    await sendAnnouncementEmail({
      tripId,
      tripName: trip?.name ?? "Voyage",
      authorLabel,
      content,
      recipients: [...emails],
    });
  } catch (err) {
    console.error("[EMAIL] Échec de l'envoi de la notification d'annonce :", err);
  }
  refresh();
}

// Édition/suppression réservée à l'admin (seul l'admin peut publier).
export async function updateAnnouncement(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  if (!(await requireAdmin(tripId))) return;
  const announcementId = Number(formData.get("announcementId"));
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;
  const fontRaw = String(formData.get("font") ?? "barlow");
  const font = isAnnounceFont(fontRaw) ? fontRaw : "barlow";
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
  });
  if (!announcement || announcement.tripId !== tripId) return;
  await prisma.announcement.update({
    where: { id: announcementId },
    data: { content, font },
  });
  refresh();
}

export async function deleteAnnouncement(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  if (!(await requireAdmin(tripId))) return;
  const announcementId = Number(formData.get("announcementId"));
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
  });
  if (!announcement || announcement.tripId !== tripId) return;
  // Les réactions liées sont supprimées en cascade (FK onDelete: Cascade)
  await prisma.announcement.delete({ where: { id: announcementId } });
  refresh();
}

export async function reactToAnnouncement(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const announcementId = Number(formData.get("announcementId"));
  const emoji = String(formData.get("emoji") ?? "👍");
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
  });
  if (!announcement || announcement.tripId !== tripId) return;
  await prisma.reaction.upsert({
    where: {
      announcementId_participantId: { announcementId, participantId: identity.effective.id },
    },
    update: { emoji },
    create: {
      announcementId,
      participantId: identity.effective.id,
      emoji,
      createdAt: new Date().toISOString(),
    },
  });
  refresh();
}

// ---------- Participants ----------

export async function confirmParticipant(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const pid = Number(formData.get("pid"));
  const p = await getParticipant(pid);
  if (!p || p.tripId !== tripId) return;
  await prisma.participant.update({
    where: { id: pid },
    data: { isConfirmed: true, confirmedBy: identity.effective.name },
  });
  refresh();
}

export async function updateDietary(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const dietary = String(formData.get("dietary") ?? "").trim();
  await prisma.participant.update({
    where: { id: identity.effective.id },
    data: { dietary },
  });
  refresh();
}

// Photo de profil : data URL image redimensionnée côté client. On borne la taille
// pour éviter qu'une image trop lourde n'entre en base (~500 Ko d'image ≈ 700 Ko b64).
export async function setPhoto(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const photo = String(formData.get("photo") ?? "");
  if (!photo.startsWith("data:image/") || photo.length > 700_000) return;
  await prisma.participant.update({
    where: { id: identity.effective.id },
    data: { photo },
  });
  refresh();
}

export async function removePhoto(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  await prisma.participant.update({
    where: { id: identity.effective.id },
    data: { photo: "" },
  });
  refresh();
}

export async function addParticipant(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  if (!(await requireAdmin(tripId))) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const trip = await getTripById(tripId);
  if (!trip) return;
  if ((await getParticipants(tripId)).length >= trip.capacity) return; // limite atteinte
  await prisma.participant.create({ data: { tripId, name } });
  refresh();
}

export async function removeParticipant(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  if (!(await requireAdmin(tripId))) return;
  const pid = Number(formData.get("pid"));
  const p = await getParticipant(pid);
  if (!p || p.tripId !== tripId || p.role === "admin") return;
  // Soft-delete (D-P2-04)
  await prisma.participant.update({ where: { id: pid }, data: { isActive: false } });
  refresh();
}

// ---------- Covoiturage (CARP-02) ----------

export async function joinCar(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const carId = Number(formData.get("carId"));
  const car = await getCar(carId);
  if (!car || car.tripId !== tripId) return;
  const occupants = await prisma.participant.count({ where: { carId, isActive: true } });
  if (occupants >= car.seats) return; // complet
  await prisma.participant.update({
    where: { id: identity.effective.id },
    data: { carId },
  });
  refresh();
}

export async function leaveCar(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const car = identity.effective.carId ? await getCar(identity.effective.carId) : null;
  if (car && car.ownerId === identity.effective.id) {
    // Le propriétaire annule sa voiture : tous les occupants sont libérés (FK SetNull)
    await prisma.car.delete({ where: { id: car.id } });
  } else {
    await prisma.participant.update({
      where: { id: identity.effective.id },
      data: { carId: null },
    });
  }
  refresh();
}

// ---------- Repas : équipes par créneau (jour × service) ----------

// Un créneau est modifiable (menu, courses) par un membre de l'équipe inscrite,
// ou par l'admin hors « vue participant ». Reflète le canEdit de la maquette.
function canEditMealSlot(
  identity: TripIdentity,
  slot: { carId: number | null }
): boolean {
  if (!slot.carId) return false;
  const mine = identity.effective.carId === slot.carId;
  return mine || (identity.role === "admin" && !identity.isImpersonating);
}

// Réserver un créneau pour son équipe, le reprendre à une autre, ou le libérer
// (carId vide). N'importe quel membre de l'équipe concernée peut le faire.
export async function bookMealSlot(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const day = Number(formData.get("day"));
  const meal = Number(formData.get("meal"));
  if (!(day >= 0) || !(meal >= 0 && meal <= 2)) return;
  const isAdmin = identity.role === "admin";
  const carRaw = String(formData.get("carId") ?? "");
  const slot = await prisma.mealSlot.findUnique({
    where: { tripId_day_meal: { tripId, day, meal } },
  });

  if (carRaw === "") {
    // Libérer : réservé à un membre de l'équipe inscrite (ou à l'admin)
    if (!slot || !slot.carId) return;
    if (identity.effective.carId !== slot.carId && !isAdmin) return;
    await prisma.mealSlot.update({ where: { id: slot.id }, data: { carId: null } });
  } else {
    // Un créneau marqué « N/A » par l'admin n'est pas réservable
    if (slot?.disabled) return;
    // Réserver / reprendre : on ne peut inscrire que sa propre équipe
    const carId = Number(carRaw);
    const car = await getCar(carId);
    if (!car || car.tripId !== tripId) return;
    if (identity.effective.carId !== carId && !isAdmin) return;
    await prisma.mealSlot.upsert({
      where: { tripId_day_meal: { tripId, day, meal } },
      update: { carId },
      create: { tripId, day, meal, carId },
    });
  }
  refresh();
}

// Marquer un créneau « N/A » (aucun repas prévu) ou le réactiver. Réservé à
// l'admin (hors vue participant / impersonation). Désactiver libère l'équipe.
export async function setMealSlotDisabled(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  if (identity.role !== "admin" || identity.isImpersonating) return;
  const day = Number(formData.get("day"));
  const meal = Number(formData.get("meal"));
  if (!(day >= 0) || !(meal >= 0 && meal <= 2)) return;
  const disabled = String(formData.get("disabled")) === "1";
  await prisma.mealSlot.upsert({
    where: { tripId_day_meal: { tripId, day, meal } },
    // Désactiver libère aussi le créneau (plus d'équipe inscrite)
    update: disabled ? { disabled: true, carId: null } : { disabled: false },
    create: { tripId, day, meal, disabled },
  });
  refresh();
}

export async function updateMealMenu(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const day = Number(formData.get("day"));
  const meal = Number(formData.get("meal"));
  const slot = await prisma.mealSlot.findUnique({
    where: { tripId_day_meal: { tripId, day, meal } },
  });
  if (!slot || !canEditMealSlot(identity, slot)) return;
  const menu = String(formData.get("menu") ?? "");
  await prisma.mealSlot.update({ where: { id: slot.id }, data: { menu } });
  refresh();
}

export async function addMealShopItem(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const day = Number(formData.get("day"));
  const meal = Number(formData.get("meal"));
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  const slot = await prisma.mealSlot.findUnique({
    where: { tripId_day_meal: { tripId, day, meal } },
  });
  if (!slot || !canEditMealSlot(identity, slot)) return;
  await prisma.mealShopItem.create({ data: { slotId: slot.id, text } });
  refresh();
}

export async function toggleMealShopItem(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const itemId = Number(formData.get("itemId"));
  const item = await prisma.mealShopItem.findUnique({
    where: { id: itemId },
    include: { slot: true },
  });
  if (!item || item.slot.tripId !== tripId || !canEditMealSlot(identity, item.slot)) return;
  await prisma.mealShopItem.update({ where: { id: itemId }, data: { done: !item.done } });
  refresh();
}

export async function deleteMealShopItem(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const itemId = Number(formData.get("itemId"));
  const item = await prisma.mealShopItem.findUnique({
    where: { id: itemId },
    include: { slot: true },
  });
  if (!item || item.slot.tripId !== tripId || !canEditMealSlot(identity, item.slot)) return;
  await prisma.mealShopItem.delete({ where: { id: itemId } });
  refresh();
}

// ---------- Tentes (TENT-01 rev) ----------

export async function joinTent(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const tentId = Number(formData.get("tentId"));
  const tent = await getTent(tentId);
  if (!tent || tent.tripId !== tripId) return;
  const occupants = await prisma.participant.count({ where: { tentId, isActive: true } });
  if (occupants >= tent.capacity) return;
  await prisma.participant.update({
    where: { id: identity.effective.id },
    data: { tentId },
  });
  refresh();
}

export async function leaveTent(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const tent = identity.effective.tentId ? await getTent(identity.effective.tentId) : null;
  if (tent && tent.ownerId === identity.effective.id) {
    // Le propriétaire retire sa tente : tous les occupants sont libérés (FK SetNull)
    await prisma.tent.delete({ where: { id: tent.id } });
  } else {
    await prisma.participant.update({
      where: { id: identity.effective.id },
      data: { tentId: null },
    });
  }
  refresh();
}

// ---------- Matos (MAT-01..04) ----------

export async function addGearCategory(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const exists = await prisma.gearCategory.findFirst({
    where: { tripId, name: { equals: name, mode: "insensitive" } },
  });
  if (exists) return;
  await prisma.gearCategory.create({ data: { tripId, name } });
  refresh();
}

export async function addGearItem(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = Number(formData.get("categoryId"));
  const qtyRaw = Number(formData.get("qtyRequired"));
  const qtyRequired = qtyRaw >= 1 ? qtyRaw : 1;
  if (!name) return;
  const category = (await getGearCategories(tripId)).find((c) => c.id === categoryId);
  if (!category) return;
  await prisma.gearItem.create({
    data: { tripId, categoryId, name, qtyRequired, createdById: identity.effective.id },
  });
  refresh();
}

// Édition/suppression d'un item : l'admin, ou le participant qui l'a ajouté
// (même logique de propriété que les voitures/tentes).
export async function updateGearItem(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const itemId = Number(formData.get("itemId"));
  const item = await prisma.gearItem.findUnique({ where: { id: itemId } });
  if (!item || item.tripId !== tripId) return;
  if (identity.role !== "admin" && item.createdById !== identity.effective.id) return;
  const name = String(formData.get("name") ?? "").trim();
  const qtyRaw = Number(formData.get("qtyRequired"));
  const qtyRequired = qtyRaw >= 1 ? qtyRaw : 1;
  if (!name) return;
  const categoryId = Number(formData.get("categoryId"));
  const category = (await getGearCategories(tripId)).find((c) => c.id === categoryId);
  await prisma.gearItem.update({
    where: { id: itemId },
    // La catégorie n'est modifiée que si le nouvel id est valide pour ce voyage
    data: { name, qtyRequired, ...(category ? { categoryId } : {}) },
  });
  refresh();
}

export async function deleteGearItem(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const itemId = Number(formData.get("itemId"));
  const item = await prisma.gearItem.findUnique({ where: { id: itemId } });
  if (!item || item.tripId !== tripId) return;
  if (identity.role !== "admin" && item.createdById !== identity.effective.id) return;
  // Les réservations liées partent en cascade (FK onDelete: Cascade)
  await prisma.gearItem.delete({ where: { id: itemId } });
  refresh();
}

// Renommer/supprimer une catégorie : admin uniquement (élément structurant).
export async function updateGearCategory(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  if (!(await requireAdmin(tripId))) return;
  const categoryId = Number(formData.get("categoryId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const category = await prisma.gearCategory.findUnique({ where: { id: categoryId } });
  if (!category || category.tripId !== tripId) return;
  const clash = await prisma.gearCategory.findFirst({
    where: { tripId, name: { equals: name, mode: "insensitive" }, id: { not: categoryId } },
  });
  if (clash) return; // pas de doublon de nom
  await prisma.gearCategory.update({ where: { id: categoryId }, data: { name } });
  refresh();
}

export async function deleteGearCategory(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  if (!(await requireAdmin(tripId))) return;
  const categoryId = Number(formData.get("categoryId"));
  const category = await prisma.gearCategory.findUnique({ where: { id: categoryId } });
  if (!category || category.tripId !== tripId) return;
  // Sécurité : on ne supprime pas une catégorie qui contient encore des items
  // (sinon la cascade effacerait silencieusement items + réservations).
  const itemCount = await prisma.gearItem.count({ where: { categoryId } });
  if (itemCount > 0) return;
  await prisma.gearCategory.delete({ where: { id: categoryId } });
  refresh();
}

export async function setGearClaim(formData: FormData) {
  const tripId = Number(formData.get("tripId"));
  const identity = await tripIdentity(tripId);
  if (!identity) return;
  const itemId = Number(formData.get("itemId"));
  const qty = Number(formData.get("qty"));
  if (!(qty >= 0)) return;
  const item = await prisma.gearItem.findUnique({ where: { id: itemId } });
  if (!item || item.tripId !== tripId) return;
  if (qty === 0) {
    await prisma.gearClaim.deleteMany({
      where: { itemId, participantId: identity.effective.id },
    });
  } else {
    await prisma.gearClaim.upsert({
      where: {
        itemId_participantId: { itemId, participantId: identity.effective.id },
      },
      update: { qty },
      create: { itemId, participantId: identity.effective.id, qty },
    });
  }
  refresh();
}
