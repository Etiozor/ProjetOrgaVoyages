// Envoi via l'API HTTPS de Resend (port 443), et non plus en SMTP.
//
// Pourquoi : Railway bloque les ports SMTP sortants (25/465/587 → TIMEOUT) ;
// seul le 443 sort. On l'a prouvé côté réseau (www.google.com:443 OK en 3 ms,
// tous les ports SMTP en timeout), donc aucun réglage nodemailer ne pouvait
// marcher. L'API HTTPS règle le blocage ET la délivrabilité d'un coup.
//
// Variables d'environnement :
//   RESEND_API_KEY  requis pour activer l'envoi (sinon désactivé proprement)
//   MAIL_FROM       expéditeur, ex. `TRIP'IN <no-reply@ton-domaine.fr>`.
//                   Par défaut `onboarding@resend.dev` (test : ne délivre qu'à
//                   l'adresse du compte Resend tant que le domaine n'est pas
//                   vérifié).
//   MAIL_OWNER      adresse visible en `To:` des annonces (les participants
//                   restent en copie cachée). Défaut : l'adresse de MAIL_FROM.
//   APP_URL         base absolue pour les liens (inchangé).

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "TRIP'IN <onboarding@resend.dev>";

/** Vrai si l'envoi d'e-mails est configuré (clé Resend présente). */
export function mailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function fromAddress(): string {
  return process.env.MAIL_FROM || DEFAULT_FROM;
}

/** Extrait l'adresse nue d'un « Nom <adresse> » (ou renvoie tel quel). */
function bareAddress(addr: string): string {
  const m = addr.match(/<([^>]+)>/);
  return (m ? m[1] : addr).trim();
}

interface ResendPayload {
  to: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html: string;
}

/**
 * Poste un e-mail à l'API Resend. Lève en cas d'échec (l'appelant enveloppe
 * dans un try/catch pour ne jamais casser l'action métier). Renvoie l'id du
 * message renvoyé par Resend, ou null si l'envoi est désactivé.
 */
async function sendViaResend(payload: ResendPayload): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromAddress(), ...payload }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status} ${res.statusText}: ${detail}`);
  }
  const data = (await res.json().catch(() => null)) as { id?: string } | null;
  return data?.id ?? null;
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
): Promise<string | null> {
  if (!mailEnabled()) {
    console.log(
      `[EMAIL désactivé] « ${mail.tripName} » → ${mail.recipients.length} destinataire(s) (Resend non configuré)`
    );
    return null;
  }
  if (mail.recipients.length === 0) {
    console.log(`[EMAIL] « ${mail.tripName} » — aucun destinataire avec adresse, rien à envoyer`);
    return null;
  }

  // Adresse visible en To: ; les participants restent en copie cachée.
  const owner = process.env.MAIL_OWNER || bareAddress(fromAddress());
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

  const id = await sendViaResend({
    to: [owner],
    bcc: mail.recipients,
    subject: `Nouvelle annonce — ${mail.tripName}`,
    text: textLines.join("\n"),
    html,
  });
  console.log(
    `[EMAIL] Annonce « ${mail.tripName} » envoyée à ${mail.recipients.length} destinataire(s) — id ${id}`
  );
  return id;
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
  if (!mailEnabled()) {
    console.log(`[EMAIL désactivé] Magic link pour ${to} : ${url}`);
    return;
  }
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#222">
      <p style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.08em;color:#888;margin:0 0 4px">TRIP'IN · Connexion</p>
      <p style="font-size:1rem;line-height:1.5;margin:0 0 16px">Salut ${escapeHtml(firstName)}, clique pour te connecter (lien valable 20 minutes) :</p>
      <p style="margin:0 0 16px"><a href="${url}" style="display:inline-block;background:#8cb369;color:#fff;text-decoration:none;padding:12px 22px;border-radius:4px;font-size:0.95rem">Me connecter</a></p>
      <p style="font-size:0.75rem;color:#888;margin:0">Si tu n'es pas à l'origine de cette demande, ignore ce message.</p>
    </div>`;
  await sendViaResend({
    to: [to],
    subject: "Ton lien de connexion TRIP'IN",
    text: `Salut ${firstName},\n\nClique pour te connecter (lien valable 20 minutes) :\n${url}\n\nSi tu n'es pas à l'origine de cette demande, ignore ce message.`,
    html,
  });
  console.log(`[EMAIL] Magic link envoyé à ${to}`);
}
