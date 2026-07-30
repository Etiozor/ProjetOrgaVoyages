import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getParticipant,
  getParticipantByUser,
  getUserById,
  type Participant,
  type User,
} from "./db";

export interface SessionData {
  uid?: number;
  /** Participant impersonné par un admin (D-16 porté sur le modèle téléphone) */
  actAs?: number;
}

export interface TripIdentity {
  user: User;
  role: "admin" | "participant";
  /** Ligne participant de l'utilisateur connecté dans ce voyage */
  participant: Participant;
  /** Participant effectif au nom duquel on agit (= participant, ou actAs pour l'admin) */
  effective: Participant;
  isImpersonating: boolean;
}

// ---------- Cookie signé (HMAC-SHA256) ----------

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET doit être défini en production");
  }
  console.warn("⚠️ SESSION_SECRET absent — secret de dev utilisé (ne pas déployer ainsi)");
  return "tripin-dev-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export async function readSession(): Promise<SessionData> {
  const store = await cookies();
  const raw = store.get("session")?.value;
  if (!raw) return {};
  const dot = raw.lastIndexOf(".");
  if (dot < 1) return {};
  const payload = raw.slice(0, dot);
  const signature = Buffer.from(raw.slice(dot + 1));
  const expected = Buffer.from(sign(payload));
  // Signature invalide = session ignorée (cookie forgé ou secret changé)
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) {
    return {};
  }
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionData;
  } catch {
    return {};
  }
}

export async function writeSession(data: SessionData) {
  const store = await cookies();
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  store.set("session", `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete("session");
}

// ---------- Identité ----------

export async function currentUser(): Promise<User | null> {
  const s = await readSession();
  if (!s.uid) return null;
  return getUserById(s.uid);
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** Identité de l'utilisateur dans un voyage donné, ou null s'il n'en est pas membre. */
export async function tripIdentity(tripId: number): Promise<TripIdentity | null> {
  const s = await readSession();
  if (!s.uid) return null;
  const user = await getUserById(s.uid);
  if (!user) return null;
  const participant = await getParticipantByUser(tripId, user.id);
  if (!participant) return null;
  const role = participant.role === "admin" ? "admin" : "participant";

  let effective = participant;
  let isImpersonating = false;
  if (role === "admin" && s.actAs && s.actAs !== participant.id) {
    const target = await getParticipant(s.actAs);
    if (target && target.tripId === tripId) {
      effective = target;
      isImpersonating = true;
    }
  }
  return { user, role, participant, effective, isImpersonating };
}

export async function requireTripIdentity(tripId: number): Promise<TripIdentity> {
  const user = await currentUser();
  if (!user) redirect("/login");
  const identity = await tripIdentity(tripId);
  if (!identity) redirect("/");
  return identity;
}
