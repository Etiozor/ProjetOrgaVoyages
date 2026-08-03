"use client";

import { useEffect, useState } from "react";

/**
 * Bandeau discret « ouvre dans le navigateur », affiché uniquement dans les
 * navigateurs intégrés des apps (Messenger, Facebook, Instagram). Ces WebViews
 * emprisonnent la session et rendent pénible le va-et-vient avec TRIP'IN ; on
 * propose donc d'en sortir vers le vrai navigateur.
 *
 * - Android : lien `intent://` qui bascule directement vers Chrome.
 * - iOS : aucune ouverture programmatique fiable n'existe → on copie le lien et
 *   on explique le geste (le coller dans Safari, ou le menu « … » de l'app).
 * Refermable ; le choix est mémorisé (localStorage).
 */

const DISMISS_KEY = "tripin-iab-dismissed";
const INK = "#2b2b2b";
const CREAM = "#fdf8e8";
const TEAL = "#5b8e7d";

export function InAppBrowserBanner() {
  const [show, setShow] = useState(false);
  const [os, setOs] = useState<"android" | "ios" | "other">("other");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    // Marqueurs des WebViews Facebook / Messenger / Instagram.
    const inApp = /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram/i.test(ua);
    if (!inApp) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* localStorage indisponible (navigation privée) — on affiche quand même */
    }
    setOs(
      /Android/i.test(ua)
        ? "android"
        : /iPhone|iPad|iPod/i.test(ua)
          ? "ios"
          : "other"
    );
    setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  // intent:// → force l'ouverture dans Chrome sur Android.
  const androidIntent = () => {
    const rest = window.location.href.replace(/^https?:\/\//i, "");
    return `intent://${rest}#Intent;scheme=https;package=com.android.chrome;end`;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copie ce lien puis ouvre-le dans ton navigateur :", window.location.href);
    }
  };

  const message =
    os === "ios"
      ? copied
        ? "Lien copié — ouvre Safari et colle-le dans la barre d’adresse."
        : "Tu es dans le navigateur intégré de l’app. Ouvre TRIP’IN dans Safari pour une meilleure expérience."
      : "Tu es dans le navigateur intégré de l’app. Ouvre TRIP’IN dans ton navigateur pour une meilleure expérience.";

  const actionStyle = {
    background: TEAL,
    color: CREAM,
    borderRadius: "3px",
  } as const;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60]"
      role="region"
      aria-label="Ouvrir dans le navigateur"
      style={{
        background: INK,
        color: CREAM,
        borderBottom: "1px solid rgba(255,255,255,.14)",
      }}
    >
      <div className="mx-auto flex max-w-xl items-center gap-2.5 px-4 py-2">
        <p className="min-w-0 flex-1 text-[0.72rem] font-medium leading-snug tracking-[0.02em]">
          {message}
        </p>

        {os === "android" ? (
          <a
            href={androidIntent()}
            className="shrink-0 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.06em]"
            style={actionStyle}
          >
            Ouvrir
          </a>
        ) : (
          <button
            type="button"
            onClick={copyLink}
            className="shrink-0 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.06em]"
            style={actionStyle}
          >
            {copied ? "Copié ✓" : "Copier le lien"}
          </button>
        )}

        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer le bandeau"
          className="shrink-0 px-1.5 py-1 text-base leading-none"
          style={{ color: "rgba(253,248,232,.7)" }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
