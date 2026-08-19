"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Feuille de partage du voyage (maquette « TRIP'IN Mobile »).
 * En-tête (voyage · fermer), bloc « Code d'accès » copiable, lien d'invitation,
 * puis une grille bordée de services avec icônes dessinées. Sur PC on construit
 * les liens web officiels de chaque service (Gmail/Outlook/… absents de
 * `navigator.share`) ; sur mobile, « Autres applications… » ouvre la feuille
 * native pour atteindre les apps installées.
 */
function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function ShareSheet({
  open,
  onClose,
  code,
  tripName,
}: {
  open: boolean;
  onClose: () => void;
  /** Code d'accès — sert à bâtir le lien /join?code=… et s'affiche en gros */
  code: string;
  tripName: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [url, setUrl] = useState("");
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [note, setNote] = useState("");

  // Le portal ne peut cibler document.body qu'après le montage (SSR-safe).
  useEffect(() => setMounted(true), []);
  // window.location / navigator ne sont dispo que côté client.
  useEffect(() => {
    setUrl(`${window.location.origin}/join?code=${encodeURIComponent(code)}`);
    setCanNativeShare(typeof navigator !== "undefined" && Boolean(navigator.share));
  }, [code]);

  const title = `Rejoins « ${tripName} » sur TRIP'IN`;

  // Liens de partage officiels de chaque service (ouverts dans un nouvel onglet).
  const targets = useMemo(() => {
    if (!url)
      return [] as { key: string; label: string; href: string; icon: ReactNode }[];
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(title);
    const body = encodeURIComponent(`${title}\n\n${url}`);
    const textUrl = encodeURIComponent(`${title} ${url}`);
    return [
      {
        key: "email",
        label: "Email",
        href: `mailto:?subject=${t}&body=${body}`,
        icon: (
          <Glyph>
            <rect x="3.6" y="6" width="16.8" height="12" rx="1.6" />
            <path d="M4.2 7L12 13l7.8-6" />
          </Glyph>
        ),
      },
      {
        key: "gmail",
        label: "Gmail",
        href: `https://mail.google.com/mail/?view=cm&fs=1&su=${t}&body=${body}`,
        icon: (
          <Glyph>
            <rect x="3.6" y="6" width="16.8" height="12" rx="1.6" />
            <path d="M3.8 6.6L12 13.4l8.2-6.8" />
            <path d="M8.2 17.4V9.6M15.8 17.4V9.6" />
          </Glyph>
        ),
      },
      {
        key: "outlook",
        label: "Outlook",
        href: `https://outlook.office.com/mail/deeplink/compose?subject=${t}&body=${body}`,
        icon: (
          <Glyph>
            <rect x="3.6" y="6" width="16.8" height="12" rx="1.6" />
            <path d="M4.2 7L12 13l7.8-6" />
            <ellipse cx="12" cy="14.4" rx="2.6" ry="3" />
          </Glyph>
        ),
      },
      {
        key: "whatsapp",
        label: "WhatsApp",
        href: `https://wa.me/?text=${textUrl}`,
        icon: (
          <Glyph>
            <path d="M4.6 19.4l1.2-3.6a7.4 7.4 0 1 1 2.6 2.5L4.6 19.4z" />
            <path d="M9.6 10.2c.2 2.5 1.8 4 4.2 4.4" />
          </Glyph>
        ),
      },
      {
        key: "facebook",
        label: "Facebook",
        href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
        icon: (
          <Glyph>
            <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="2.4" />
            <path d="M14.6 8.4h-1.4c-1 0-1.6.6-1.6 1.6v9.8" />
            <path d="M9.8 12.6h4.2" />
          </Glyph>
        ),
      },
      {
        key: "telegram",
        label: "Telegram",
        href: `https://t.me/share/url?url=${u}&text=${t}`,
        icon: (
          <Glyph>
            <path d="M20.4 4.6L3.8 11.2l4.6 1.7 1.5 5 2.6-3.2 4.3 3.1 3.6-13.2z" />
            <path d="M8.4 12.9l9.6-6.4-6.1 7.7" />
          </Glyph>
        ),
      },
      {
        key: "x",
        label: "X",
        href: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
        icon: (
          <Glyph>
            <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="2.4" />
            <path d="M8.6 8.4l6.8 7.2M15.4 8.4l-6.8 7.2" />
          </Glyph>
        ),
      },
    ];
  }, [url, title]);

  if (!open || !mounted) return null;

  const copyTo = async (text: string, flag: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      flag(true);
      setTimeout(() => flag(false), 2000);
    } catch {
      window.prompt("Copie ceci :", text);
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: "TRIP'IN", text: title, url });
      onClose();
    } catch {
      /* partage annulé — rien à faire */
    }
  };

  // Instagram n'expose aucun partage de lien par URL : on copie et on explique.
  const shareInstagram = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard indispo — le lien reste visible dans le champ ci-dessus */
    }
    setNote("Lien copié — ouvre Instagram et colle-le dans ta story ou tes messages.");
    setTimeout(() => setNote(""), 4000);
  };

  const cell =
    "min-h-[66px] px-1 py-[9px] flex flex-col items-center justify-center gap-[7px] text-[0.65rem] tracking-[0.02em]";
  const cellStyle = {
    color: "var(--text)",
    borderRight: "1px solid var(--hair)",
    borderBottom: "1px solid var(--hair)",
  } as const;

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Partager le voyage">
      <button
        type="button"
        aria-label="Fermer le partage"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: "rgba(43,43,43,.42)" }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 mx-auto flex w-full max-w-xl flex-col overflow-hidden"
        style={{
          background: "var(--card-raised)",
          borderTop: "1px solid var(--border)",
          borderRadius: "8px 8px 0 0",
          animation: "sheetin .16s ease-out",
        }}
      >
        {/* En-tête : poignée · voyage · fermer */}
        <div
          className="flex flex-col items-center gap-[11px] px-[18px] pt-[9px] pb-3.5"
          style={{ background: "var(--card)", borderBottom: "1px solid var(--hair)" }}
        >
          <span
            aria-hidden
            className="rounded-[8px]"
            style={{ width: 34, height: 3, background: "rgba(128,128,128,.28)" }}
          />
          <div className="w-full flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="eyebrow">Inviter au voyage</div>
              <div className="font-[family-name:var(--font-oswald)] text-[1.25rem] font-semibold uppercase leading-[1.15] tracking-[0.05em] truncate mt-1">
                {tripName}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le partage"
              className="shrink-0 flex items-center justify-center rounded-[8px] text-[0.95rem] leading-none"
              style={{ width: 30, height: 30, border: "1px solid var(--border)", color: "var(--muted)" }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Code d'accès + lien d'invitation */}
        <div className="flex flex-col gap-2.5 px-[18px] pt-4">
          <div
            className="flex items-center justify-between gap-3 px-3.5 py-3"
            style={{
              background: "var(--card)",
              border: "1px solid var(--hair)",
              borderLeft: "6px solid var(--accent)",
              borderRadius: 8,
            }}
          >
            <div className="min-w-0">
              <div
                className="font-[family-name:var(--font-oswald)] font-bold text-[1.75rem] leading-none"
                style={{ letterSpacing: "0.18em", color: "var(--accent-text)" }}
              >
                {code}
              </div>
              <div className="muted text-[0.7rem] tracking-[0.04em] mt-1.5">
                Code d&apos;accès — à entrer dans « Ajouter un voyage »
              </div>
            </div>
            <button
              type="button"
              onClick={() => copyTo(code, setCopiedCode)}
              className="btn-ghost shrink-0 !min-h-[40px] !py-0 !text-xs"
            >
              {copiedCode ? "Copié ✓" : "Copier"}
            </button>
          </div>

          <div
            className="flex items-center justify-between gap-2.5 px-3 py-2.5"
            style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
          >
            <div className="min-w-0 flex flex-col gap-0.5">
              <span className="muted text-[0.625rem] uppercase tracking-[0.09em]">
                Lien d&apos;invitation
              </span>
              <span className="text-[0.8rem] font-semibold truncate" style={{ color: "var(--text)" }}>
                {url}
              </span>
            </div>
            <button
              type="button"
              onClick={() => copyTo(url, setCopiedLink)}
              className="btn-ghost shrink-0 !min-h-[40px] !py-0 !text-xs"
            >
              {copiedLink ? "Copié ✓" : "Copier"}
            </button>
          </div>
        </div>

        {/* Envoyer par — grille de services */}
        <div className="flex flex-col gap-2.5 px-[18px] pt-4">
          <span className="eyebrow">Envoyer par</span>
          <div
            className="grid grid-cols-4 overflow-hidden"
            style={{ border: "1px solid var(--hair)", borderRadius: 8, marginRight: -1, marginBottom: -1 }}
          >
            {targets.map((tg) => (
              <a
                key={tg.key}
                href={tg.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className={cell}
                style={cellStyle}
              >
                {tg.icon}
                <span className="whitespace-nowrap">{tg.label}</span>
              </a>
            ))}
            <button type="button" onClick={shareInstagram} className={cell} style={cellStyle}>
              <Glyph>
                <rect x="4.2" y="4.2" width="15.6" height="15.6" rx="4.2" />
                <circle cx="12" cy="12" r="3.6" />
                <circle cx="16.6" cy="7.4" r="0.9" fill="currentColor" stroke="none" />
              </Glyph>
              <span className="whitespace-nowrap">Instagram</span>
            </button>
          </div>
        </div>

        {note && (
          <p className="px-[18px] pt-3 text-[0.7rem] font-semibold leading-snug" style={{ color: "var(--ok)" }}>
            {note}
          </p>
        )}

        {/* Autres applications — feuille native (mobile) */}
        <div className="px-[18px] pt-3.5 pb-8">
          {canNativeShare ? (
            <button
              type="button"
              onClick={nativeShare}
              className="w-full flex items-center justify-between gap-2.5 min-h-[44px] text-[0.75rem] tracking-[0.03em]"
              style={{ color: "var(--muted)", borderTop: "1px solid var(--hair)", paddingTop: 14 }}
            >
              <span>Autres applications…</span>
              <span className="whitespace-nowrap">→</span>
            </button>
          ) : (
            <div style={{ height: 8 }} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
