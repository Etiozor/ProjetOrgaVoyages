import { setDefaultResultOrder } from "node:dns";
import nodemailer, { type SentMessageInfo, type Transporter } from "nodemailer";

// Railway (et autres hébergeurs sans egress IPv6) : depuis Node 18 la résolution
// DNS est en « verbatim » et renvoie souvent l'IPv6 en premier. smtp.gmail.com
// tombe alors sur une adresse IPv6 injoignable → ENETUNREACH sur le port 465.
// On force l'IPv4 en tête pour tout le process.
setDefaultResultOrder("ipv4first");

// Transport SMTP (Gmail) en singleton — comme prisma, il survit au hot-reload
// de dev. Si les variables SMTP ne sont pas définies, l'envoi est simplement
// désactivé (l'app continue de tourner, on journalise à la place).
const g = globalThis as unknown as { __tripinMailer?: Transporter | null };

function getTransport(): Transporter | null {
  if (g.__tripinMailer !== undefined) return g.__tripinMailer;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    g.__tripinMailer = null;
    return null;
  }
  // Par défaut : Gmail (host/port/secure pré-configurés, `pass` = mot de passe
  // d'application). Si SMTP_HOST est fourni, on l'utilise à la place — utile
  // pour un autre fournisseur SMTP ou un compte de test.
  const host = process.env.SMTP_HOST;
  g.__tripinMailer = host
    ? nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user, pass },
      })
    : nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  return g.__tripinMailer;
}

/** Vrai si l'envoi d'e-mails est configuré (variables SMTP présentes). */
export function mailEnabled(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

// ---------- Rendu du contenu ----------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Le corps des annonces accepte un balisage léger (**gras**, _italique_).
// On le retire pour la version texte, on le convertit pour la version HTML.
function toPlain(content: string): string {
  return content.replace(/\*\*(.+?)\*\*/g, "$1").replace(/_(.+?)_/g, "$1");
}

function toHtml(content: string): string {
  return escapeHtml(content)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

// ---------- Envoi ----------

export interface AnnouncementMail {
  tripId: number;
  tripName: string;
  authorLabel: string;
  content: string;
  /** Adresses des destinataires (mises en copie cachée) */
  recipients: string[];
}

/**
 * Notifie les participants d'une nouvelle annonce. Un seul e-mail est envoyé,
 * les destinataires en copie cachée (BCC) — personne ne voit les adresses des
 * autres. L'appelant devrait envelopper l'appel dans un try/catch pour que la
 * publication de l'annonce n'échoue jamais à cause de l'e-mail.
 */
export async function sendAnnouncementEmail(
  mail: AnnouncementMail
): Promise<SentMessageInfo | null> {
  const transport = getTransport();
  if (!transport) {
    console.log(
      `[EMAIL désactivé] « ${mail.tripName} » → ${mail.recipients.length} destinataire(s) (SMTP non configuré)`
    );
    return null;
  }
  if (mail.recipients.length === 0) {
    console.log(`[EMAIL] « ${mail.tripName} » — aucun destinataire avec adresse, rien à envoyer`);
    return null;
  }

  const from = process.env.SMTP_USER!;
  const appUrl = (process.env.APP_URL ?? "").replace(/\/+$/, "");
  const link = appUrl ? `${appUrl}/t/${mail.tripId}` : "";

  const textLines = [
    `${mail.authorLabel} a publié une nouvelle annonce sur « ${mail.tripName} » :`,
    "",
    toPlain(mail.content),
  ];
  if (link) textLines.push("", `Voir dans TRIP'IN : ${link}`);

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#222">
      <p style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.08em;color:#888;margin:0 0 4px">
        Nouvelle annonce · ${escapeHtml(mail.tripName)}
      </p>
      <div style="border-left:3px solid #8cb369;padding:12px 16px;background:#f7f7f4;border-radius:4px">
        <p style="margin:0 0 8px;font-size:1rem;line-height:1.5">${toHtml(mail.content)}</p>
        <p style="margin:0;font-size:0.75rem;color:#888">${escapeHtml(mail.authorLabel)}</p>
      </div>
      ${
        link
          ? `<p style="margin:16px 0 0"><a href="${link}" style="display:inline-block;background:#8cb369;color:#fff;text-decoration:none;padding:10px 18px;border-radius:4px;font-size:0.9rem">Ouvrir dans TRIP'IN</a></p>`
          : ""
      }
    </div>`;

  const info = await transport.sendMail({
    from: `"TRIP'IN" <${from}>`,
    // Le compte d'envoi en visible ; les participants en copie cachée.
    to: from,
    bcc: mail.recipients,
    subject: `Nouvelle annonce — ${mail.tripName}`,
    text: textLines.join("\n"),
    html,
  });
  console.log(
    `[EMAIL] Annonce « ${mail.tripName} » envoyée à ${mail.recipients.length} destinataire(s) — id ${info.messageId}` +
      (info.rejected?.length ? ` (rejetés: ${info.rejected.join(", ")})` : "")
  );
  return info;
}

/**
 * Envoie un lien de connexion (magic link) à une seule adresse. Si le SMTP
 * n'est pas configuré (dev), on journalise l'URL pour pouvoir la coller à la
 * main. À appeler dans un try/catch côté appelant.
 */
export async function sendMagicLinkEmail(opts: {
  to: string;
  firstName: string;
  url: string;
}): Promise<void> {
  const { to, firstName, url } = opts;
  const transport = getTransport();
  if (!transport) {
    console.log(`[EMAIL désactivé] Magic link pour ${to} : ${url}`);
    return;
  }
  const from = process.env.SMTP_USER!;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#222">
      <p style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.08em;color:#888;margin:0 0 4px">TRIP'IN · Connexion</p>
      <p style="font-size:1rem;line-height:1.5;margin:0 0 16px">Salut ${escapeHtml(firstName)}, clique pour te connecter (lien valable 20 minutes) :</p>
      <p style="margin:0 0 16px"><a href="${url}" style="display:inline-block;background:#8cb369;color:#fff;text-decoration:none;padding:12px 22px;border-radius:4px;font-size:0.95rem">Me connecter</a></p>
      <p style="font-size:0.75rem;color:#888;margin:0">Si tu n'es pas à l'origine de cette demande, ignore ce message.</p>
    </div>`;
  await transport.sendMail({
    from: `"TRIP'IN" <${from}>`,
    to,
    subject: "Ton lien de connexion TRIP'IN",
    text: `Salut ${firstName},\n\nClique pour te connecter (lien valable 20 minutes) :\n${url}\n\nSi tu n'es pas à l'origine de cette demande, ignore ce message.`,
    html,
  });
  console.log(`[EMAIL] Magic link envoyé à ${to}`);
}
