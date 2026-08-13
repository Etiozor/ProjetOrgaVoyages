import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { sendMagicLinkEmail } from "./mail";

const TOKEN_TTL_MS = 20 * 60_000; // 20 minutes
const RESEND_COOLDOWN_MS = 60_000; // 1 min entre deux envois pour un même compte

// On ne stocke jamais le jeton en clair : seule son empreinte SHA-256 va en base.
function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// Base absolue pour le lien : APP_URL en priorité, sinon reconstruite depuis
// les en-têtes de la requête (utile si la variable n'est pas encore posée).
async function baseUrl(): Promise<string> {
  const env = (process.env.APP_URL ?? "").replace(/\/+$/, "");
  if (env) return env;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Crée un jeton et envoie le lien de connexion à l'utilisateur. Silencieux si
 * un lien a déjà été demandé il y a moins d'une minute (anti-spam). L'appelant
 * n'apprend rien sur l'existence du compte (pas d'énumération).
 */
export async function issueMagicLink(
  user: { id: number; email: string; firstName: string },
  next: string
): Promise<void> {
  const recent = await prisma.loginToken.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
      createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
    },
  });
  if (recent) return;

  const raw = randomBytes(32).toString("base64url");
  await prisma.loginToken.create({
    data: {
      tokenHash: hashToken(raw),
      userId: user.id,
      next,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });
  const url = `${await baseUrl()}/auth/verify?token=${raw}`;
  await sendMagicLinkEmail({ to: user.email, firstName: user.firstName, url });
}

export interface VerifyResult {
  ok: boolean;
  userId?: number;
  next?: string;
}

/**
 * Valide un jeton et le consomme (usage unique). Marque le compte comme vérifié
 * lors de la première utilisation. Renvoie l'utilisateur et la destination.
 */
export async function consumeMagicLink(raw: string): Promise<VerifyResult> {
  if (!raw) return { ok: false };
  const token = await prisma.loginToken.findUnique({
    where: { tokenHash: hashToken(raw) },
  });
  if (!token || token.usedAt || token.expiresAt < new Date()) return { ok: false };

  // Consommation atomique : imperméable au double-clic / rejeu.
  const claimed = await prisma.loginToken.updateMany({
    where: { id: token.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) return { ok: false };

  // Marque la vérification à la 1re fois seulement (préserve la date d'origine).
  await prisma.user.updateMany({
    where: { id: token.userId, emailVerifiedAt: null },
    data: { emailVerifiedAt: new Date() },
  });
  return { ok: true, userId: token.userId, next: token.next };
}
