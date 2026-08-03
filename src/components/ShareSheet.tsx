"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Feuille de partage « classique » du lien d'invitation d'un voyage.
 *
 * Pourquoi une feuille maison plutôt que seulement `navigator.share` : sur PC,
 * `navigator.share` (quand il existe, ex. Edge/Chrome Windows) ouvre la feuille
 * du système d'exploitation, qui ne propose pas Facebook / Gmail / Outlook —
 * seulement les apps installées. On construit donc nous-mêmes les liens de
 * partage web officiels de chaque service, identiques sur PC et mobile.
 *
 * Sur mobile, un bouton « Autres applications… » ouvre en plus la feuille
 * native (`navigator.share`) pour atteindre les apps installées (Messenger,
 * SMS, etc.).
 */
export function ShareSheet({
  open,
  onClose,
  code,
  tripName,
}: {
  open: boolean;
  onClose: () => void;
  /** Code d'accès — sert à bâtir le lien /join?code=… */
  code: string;
  tripName: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [url, setUrl] = useState("");
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);
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
    if (!url) return [] as { key: string; label: string; icon: string; href: string }[];
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(title);
    const body = encodeURIComponent(`${title}\n\n${url}`);
    const textUrl = encodeURIComponent(`${title} ${url}`);
    return [
      { key: "email", label: "Email", icon: "✉️", href: `mailto:?subject=${t}&body=${body}` },
      {
        key: "gmail",
        label: "Gmail",
        icon: "📧",
        href: `https://mail.google.com/mail/?view=cm&fs=1&su=${t}&body=${body}`,
      },
      {
        key: "outlook",
        label: "Outlook",
        icon: "📨",
        href: `https://outlook.office.com/mail/deeplink/compose?subject=${t}&body=${body}`,
      },
      { key: "whatsapp", label: "WhatsApp", icon: "🟢", href: `https://wa.me/?text=${textUrl}` },
      {
        key: "facebook",
        label: "Facebook",
        icon: "🔵",
        href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      },
      { key: "telegram", label: "Telegram", icon: "✈️", href: `https://t.me/share/url?url=${u}&text=${t}` },
      { key: "x", label: "X", icon: "✖️", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    ];
  }, [url, title]);

  if (!open || !mounted) return null;

  const flashCopied = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      flashCopied();
    } catch {
      window.prompt("Copie ce lien :", url);
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

  const tileClass =
    "flex flex-col items-center gap-1 rounded-[3px] border px-1 py-2.5 text-[0.65rem] tracking-[0.02em]";
  const tileStyle = { borderColor: "var(--border)", color: "var(--text)" } as const;

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
        className="absolute bottom-0 left-0 right-0 mx-auto flex w-full max-w-xl flex-col gap-3 px-4 pb-8 pt-5"
        style={{
          background: "var(--card-raised)",
          borderTop: "1px solid var(--border)",
          borderRadius: "3px 3px 0 0",
          animation: "sheetin .16s ease-out",
        }}
      >
        <p className="eyebrow mb-0.5">Partager « {tripName} »</p>

        {/* Champ lien + copie */}
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="input flex-1 !min-h-0 !py-2 text-xs"
            aria-label="Lien d'invitation"
          />
          <button type="button" onClick={copy} className="btn shrink-0 !min-h-0 !py-2">
            {copied ? "Copié ✓" : "Copier"}
          </button>
        </div>

        {/* Cibles de partage classiques */}
        <div className="grid grid-cols-4 gap-2">
          {targets.map((tg) => (
            <a
              key={tg.key}
              href={tg.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className={tileClass}
              style={tileStyle}
            >
              <span className="text-lg leading-none">{tg.icon}</span>
              <span>{tg.label}</span>
            </a>
          ))}
          <button type="button" onClick={shareInstagram} className={tileClass} style={tileStyle}>
            <span className="text-lg leading-none">📷</span>
            <span>Instagram</span>
          </button>
        </div>

        {note && (
          <p className="text-[0.7rem] font-medium" style={{ color: "var(--accent)" }}>
            {note}
          </p>
        )}

        {canNativeShare && (
          <button type="button" onClick={nativeShare} className="menu-item">
            <span>Autres applications…</span>
            <span className="text-[0.65rem] muted whitespace-nowrap">partage du système</span>
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}
