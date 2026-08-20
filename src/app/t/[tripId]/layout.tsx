import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getParticipants, getPendingCount, getTripById } from "@/lib/db";
import { requireTripIdentity } from "@/lib/session";
import { adminActAs, toggleTravelerView } from "@/lib/actions";
import { TabBar } from "@/components/TabBar";
import { TripMenu } from "@/components/TripMenu";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId: tripIdRaw } = await params;
  const tripId = Number(tripIdRaw);
  if (!Number.isInteger(tripId)) redirect("/");
  const identity = await requireTripIdentity(tripId);
  const trip = await getTripById(tripId);
  if (!trip) redirect("/");

  const store = await cookies();
  const theme = store.get("theme")?.value === "dark" ? "dark" : "light";
  const pending = await getPendingCount(tripId, identity.effective.id);
  const participants = identity.role === "admin" ? await getParticipants(tripId) : [];

  const identityLine =
    identity.role === "admin"
      ? identity.isImpersonating
        ? `${identity.user.firstName} — agit pour ${identity.effective.name}`
        : `${identity.user.firstName} · admin`
      : `Connecté · ${identity.effective.name}`;

  const nav = [
    { href: `/t/${tripId}`, label: "Annonces" },
    { href: `/t/${tripId}/participants`, label: "Groupe" },
    ...(trip.pageCarpool ? [{ href: `/t/${tripId}/carpool`, label: "Voitures" }] : []),
    ...(trip.pageMeals ? [{ href: `/t/${tripId}/meals`, label: "Repas" }] : []),
    ...(trip.pageTents ? [{ href: `/t/${tripId}/tents`, label: "Tentes" }] : []),
    ...(trip.pageGear ? [{ href: `/t/${tripId}/gear`, label: "Matos" }] : []),
    // L'Administration n'est plus un onglet : elle passe dans le menu « … ».
  ];

  return (
    <div
      data-trip-theme={trip.theme}
      className="min-h-dvh flex flex-col"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <header className="sticky top-0 z-20">
        {/* Bandeau-marque encre */}
        <div
          className="flex items-center justify-center"
          style={{ height: 38, background: "#2b2b2b" }}
        >
          <span
            className="font-[family-name:var(--font-oswald)] text-sm font-bold uppercase"
            style={{ letterSpacing: "0.26em", color: "#fdf8e8" }}
          >
            TRIPPIN
          </span>
        </div>

        {/* Sous-en-tête sable : retour · voyage · contrôles */}
        <div
          className="border-b"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="mx-auto max-w-xl flex items-center gap-3 px-4 py-2.5">
            <Link
              href={`/t/${tripId}`}
              className="shrink-0 flex items-center justify-center rounded-[8px]"
              style={{ width: 34, height: 34, border: "1px solid var(--border)", color: "var(--text)" }}
              title="Accueil du voyage"
              aria-label="Accueil du voyage"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 11.2L12 4.5l8 6.7" />
                <path d="M6.2 12.6V19.5h11.6v-6.9" />
                <path d="M10.2 19.5v-4.4h3.6v4.4" />
              </svg>
            </Link>
            <div className="min-w-0 flex-1 text-center">
              <div className="font-[family-name:var(--font-oswald)] text-[1.05rem] font-semibold uppercase leading-tight tracking-[0.04em] truncate">
                {trip.name}
              </div>
              <div className="text-[0.7rem] tracking-[0.04em] muted truncate">
                {identityLine}
              </div>
            </div>
            <TripMenu
              tripId={tripId}
              tripName={trip.name}
              identityLine={identityLine}
              accessCode={trip.accessCode}
              isAdmin={identity.role === "admin"}
              isActuallyAdmin={identity.isActuallyAdmin}
              viewingAsParticipant={identity.viewingAsParticipant}
              theme={theme}
            />
          </div>

          {identity.role === "admin" && (
            <form action={adminActAs} className="mx-auto max-w-xl px-4 pb-2.5">
              <input type="hidden" name="tripId" value={tripId} />
              <div
                className="flex items-center gap-2 rounded-[8px] py-1 pl-2.5 pr-1"
                style={{
                  background: identity.isImpersonating
                    ? "var(--accent-soft)"
                    : "var(--card-raised)",
                  border: `1px solid ${
                    identity.isImpersonating ? "var(--accent)" : "var(--border)"
                  }`,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="shrink-0"
                  style={{ color: identity.isImpersonating ? "var(--accent)" : "var(--muted)" }}
                >
                  <circle cx="8.5" cy="9" r="2.5" />
                  <path d="M4 18c0-2.6 2-4.2 4.5-4.2s4.5 1.6 4.5 4.2" />
                  <path d="M15.5 8.6a2.2 2.2 0 0 1 0 4.4" />
                  <path d="M15.2 14.4c2.2.2 3.6 1.7 3.6 3.6" />
                </svg>
                <span
                  className="shrink-0 text-[0.6rem] font-medium uppercase tracking-[0.1em]"
                  style={{
                    color: identity.isImpersonating ? "var(--accent-text)" : "var(--muted)",
                  }}
                >
                  Agir en tant que
                </span>
                <select
                  name="pid"
                  aria-label="Agir en tant que"
                  className="flex-1 min-w-0 bg-transparent text-sm py-1 focus:outline-none"
                  style={{ color: "var(--text)" }}
                  defaultValue={identity.isImpersonating ? identity.effective.id : 0}
                >
                  <option value={0}>Moi-même · {identity.user.firstName}</option>
                  {participants
                    .filter((p) => p.id !== identity.participant.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <button className="btn shrink-0 !min-h-0 !px-3 !py-1.5 !text-xs">OK</button>
              </div>
            </form>
          )}
        </div>

        {identity.isImpersonating && (
          <div
            className="px-4 py-2 text-[0.7rem] font-medium tracking-[0.04em] border-b"
            style={{
              background: "var(--warn-bg)",
              color: "var(--warn-text)",
              borderColor: "rgba(0,0,0,.12)",
            }}
          >
            Mode « agir en tant que » : tes actions sont faites au nom de{" "}
            {identity.effective.name}.
          </div>
        )}

        {identity.viewingAsParticipant && (
          <form
            action={toggleTravelerView}
            className="mx-auto flex w-full max-w-xl items-center justify-between gap-2 border-b px-4 py-2"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent)",
              borderColor: "var(--border)",
            }}
          >
            <input type="hidden" name="tripId" value={tripId} />
            <span className="text-[0.7rem] font-medium tracking-[0.04em]">
              Mode voyageur — aperçu de l&apos;app sans les droits admin.
            </span>
            <button
              type="submit"
              className="btn-ghost shrink-0 !min-h-0 !px-2.5 !py-1 !text-[0.7rem]"
            >
              Revenir en admin
            </button>
          </form>
        )}
      </header>

      <main className="flex-1 mx-auto w-full max-w-xl px-4 py-4 pb-36">{children}</main>

      {trip.requireReaction && pending > 0 && (
        <Link
          href={`/t/${tripId}`}
          className="fixed left-0 right-0 z-30 px-4 py-3 text-center text-sm font-medium tracking-[0.03em]"
          style={{
            background: "var(--warn-bg)",
            color: "var(--warn-text)",
            bottom: "4.6rem",
          }}
        >
          {pending} annonce{pending > 1 ? "s" : ""} à valider — réagis pour confirmer →
        </Link>
      )}

      <TabBar items={nav} />
    </div>
  );
}
