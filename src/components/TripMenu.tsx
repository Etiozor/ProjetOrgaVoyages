"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { logout, toggleTheme, toggleTravelerView } from "@/lib/actions";

/**
 * Menu du voyage — bouton « … » en haut à droite (maquette « TRIP'IN Mobile »).
 * Ouvre une feuille par le bas : Administration (admin), bascule admin↔voyageur,
 * Mes voyages, thème, déconnexion. L'Administration n'est plus un onglet.
 */
export function TripMenu({
  tripId,
  tripName,
  accessCode,
  isAdmin,
  isActuallyAdmin,
  viewingAsParticipant,
  theme,
}: {
  tripId: number;
  tripName: string;
  /** Code d'accès du voyage — sert à construire le lien d'invitation partageable */
  accessCode: string;
  /** Rôle effectif admin (faux en vue voyageur) — pilote le lien Administration */
  isAdmin: boolean;
  /** Vrai admin du voyage, indépendamment de la vue courante */
  isActuallyAdmin: boolean;
  /** Un admin regarde actuellement l'app en mode voyageur */
  viewingAsParticipant: boolean;
  theme: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const close = () => setOpen(false);

  // Le portal ne peut cibler document.body qu'après le montage (SSR-safe).
  useEffect(() => setMounted(true), []);

  // Lien direct vers le voyage : /join?code=… — même cible que le champ « code »
  // de l'accueil. Le destinataire rejoint sans avoir à retaper le code ; s'il est
  // déjà membre, il atterrit droit sur le voyage.
  async function shareTrip() {
    const url = `${window.location.origin}/join?code=${encodeURIComponent(accessCode)}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `TRIP'IN — ${tripName}`,
          text: `Rejoins « ${tripName} » sur TRIP'IN`,
          url,
        });
      } catch {
        /* partage annulé par l'utilisateur — rien à faire */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copie ce lien pour inviter au voyage :", url);
    }
  }

  const hint = "text-[0.65rem] muted whitespace-nowrap";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menu du voyage"
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn-ghost shrink-0 !min-h-0 !px-2.5 !py-1.5 !text-base"
      >
        …
      </button>

      {/* Rendu dans <body> : sinon la feuille reste piégée dans le contexte
          d'empilement du <header> (sticky) et passe sous la barre d'onglets. */}
      {open &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={close}
            className="absolute inset-0 cursor-default"
            style={{ background: "rgba(43,43,43,.42)" }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 mx-auto flex w-full max-w-xl flex-col gap-2.5 px-4 pb-8 pt-5"
            style={{
              background: "var(--card-raised)",
              borderTop: "1px solid var(--border)",
              borderRadius: "3px 3px 0 0",
              animation: "sheetin .16s ease-out",
            }}
          >
            <p className="eyebrow mb-0.5">{tripName}</p>

            <button
              type="button"
              onClick={shareTrip}
              className="menu-item"
              style={{ color: "var(--accent)", borderColor: "var(--accent)" }}
            >
              <span>{copied ? "Lien copié ✓" : "Partager le voyage"}</span>
              <span className={hint}>
                {copied ? "collez-le où vous voulez" : "inviter · lien direct"}
              </span>
            </button>

            {isAdmin && (
              <Link
                href={`/t/${tripId}/admin`}
                onClick={close}
                className="menu-item"
              >
                <span>Administration du voyage</span>
                <span className={hint}>code, pages, thème</span>
              </Link>
            )}

            {isActuallyAdmin && (
              <form action={toggleTravelerView}>
                <input type="hidden" name="tripId" value={tripId} />
                <button
                  type="submit"
                  className="menu-item"
                  style={{ color: "var(--accent)", borderColor: "var(--accent)" }}
                >
                  <span>
                    {viewingAsParticipant
                      ? "Revenir en mode admin"
                      : "Passer en mode voyageur"}
                  </span>
                  <span className={hint}>
                    {viewingAsParticipant ? "↩ admin" : "aperçu voyageur"}
                  </span>
                </button>
              </form>
            )}

            <Link href="/" onClick={close} className="menu-item">
              <span>Mes voyages</span>
            </Link>

            <form action={toggleTheme}>
              <button
                type="submit"
                className="menu-item"
                style={{ color: "var(--accent)", borderColor: "var(--accent)" }}
              >
                <span>{theme === "dark" ? "Passer en clair" : "Passer en sombre"}</span>
                <span className={hint}>{theme === "dark" ? "☀" : "☾"}</span>
              </button>
            </form>

            <form action={logout}>
              <button
                type="submit"
                className="menu-item"
                style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
              >
                <span>Se déconnecter</span>
              </button>
            </form>
          </div>
        </div>,
          document.body
        )}
    </>
  );
}
