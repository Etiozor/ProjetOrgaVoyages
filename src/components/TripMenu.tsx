"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { logout, toggleTheme, toggleTravelerView } from "@/lib/actions";
import { ShareSheet } from "@/components/ShareSheet";

/**
 * Menu du voyage — bouton hamburger en haut à droite (maquette « TRIP'IN Mobile »).
 * Ouvre une feuille par le bas : poignée + en-tête (voyage · identité · fermer),
 * puis une liste continue d'options à rail coloré, et la déconnexion détachée.
 */

const ROW =
  "w-full text-left flex items-center gap-[13px] min-h-[56px] px-[18px] py-[11px]";
const ROW_BORDER = { borderBottom: "1px solid var(--hair)" };

/** Contenu commun d'une ligne : rail coloré · libellé + indice · flèche. */
function RowInner({
  label,
  hint,
  rail,
  arrow,
}: {
  label: string;
  hint: string;
  /** Couleur du rail vertical à gauche (accent, neutre, alerte…) */
  rail: string;
  /** Couleur de la flèche de droite */
  arrow: string;
}) {
  return (
    <>
      <span
        aria-hidden
        className="flex-none self-stretch rounded-[3px]"
        style={{ width: 3, background: rail }}
      />
      <span className="flex-1 min-w-0 flex flex-col gap-[3px]">
        <span className="text-[0.875rem] font-semibold tracking-[0.03em]">{label}</span>
        {hint && <span className="text-[0.7rem] leading-snug muted">{hint}</span>}
      </span>
      <span aria-hidden className="shrink-0 text-[0.875rem]" style={{ color: arrow }}>
        →
      </span>
    </>
  );
}

export function TripMenu({
  tripId,
  tripName,
  identityLine,
  accessCode,
  isAdmin,
  isActuallyAdmin,
  viewingAsParticipant,
  theme,
}: {
  tripId: number;
  tripName: string;
  /** Ligne d'identité affichée sous le nom du voyage (ex. « Étienne · admin ») */
  identityLine: string;
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
  const [shareOpen, setShareOpen] = useState(false);
  const close = () => setOpen(false);

  // Le portal ne peut cibler document.body qu'après le montage (SSR-safe).
  useEffect(() => setMounted(true), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menu du voyage"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Menu du voyage"
        className="shrink-0 flex flex-col items-center justify-center gap-[3.5px] rounded-[3px]"
        style={{ width: 34, height: 34, border: "1px solid var(--border)", color: "var(--text)" }}
      >
        <span style={{ width: 15, height: 1.6, borderRadius: 2, background: "currentColor" }} />
        <span style={{ width: 15, height: 1.6, borderRadius: 2, background: "currentColor" }} />
        <span style={{ width: 9, height: 1.6, borderRadius: 2, background: "currentColor" }} />
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
              className="absolute bottom-0 left-0 right-0 mx-auto flex w-full max-w-xl flex-col overflow-hidden"
              style={{
                background: "var(--card-raised)",
                borderTop: "1px solid var(--border)",
                borderRadius: "3px 3px 0 0",
                animation: "sheetin .16s ease-out",
              }}
            >
              {/* En-tête : poignée · voyage / identité · fermer */}
              <div
                className="flex flex-col items-center gap-[11px] px-[18px] pt-[9px] pb-3.5"
                style={{ background: "var(--card)", borderBottom: "1px solid var(--hair)" }}
              >
                <span
                  aria-hidden
                  className="rounded-[3px]"
                  style={{ width: 34, height: 3, background: "rgba(128,128,128,.28)" }}
                />
                <div className="w-full flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-[family-name:var(--font-oswald)] text-[1.1rem] font-semibold uppercase leading-[1.1] tracking-[0.05em] truncate">
                      {tripName}
                    </div>
                    <div className="text-[0.7rem] tracking-[0.04em] muted mt-1 truncate">
                      {identityLine}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Fermer le menu"
                    className="shrink-0 flex items-center justify-center rounded-[3px] text-[0.95rem] leading-none"
                    style={{ width: 30, height: 30, border: "1px solid var(--border)", color: "var(--muted)" }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Options : liste continue à rail coloré */}
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => {
                    close();
                    setShareOpen(true);
                  }}
                  className={ROW}
                  style={ROW_BORDER}
                >
                  <RowInner
                    label="Partager le voyage"
                    hint="Inviter le groupe · lien direct"
                    rail="var(--accent)"
                    arrow="var(--accent)"
                  />
                </button>

                {isAdmin && (
                  <Link
                    href={`/t/${tripId}/admin`}
                    onClick={close}
                    className={ROW}
                    style={ROW_BORDER}
                  >
                    <RowInner
                      label="Administration du voyage"
                      hint="Code d'invitation, réglages, pages actives"
                      rail="var(--border)"
                      arrow="var(--muted)"
                    />
                  </Link>
                )}

                {isActuallyAdmin && (
                  <form action={toggleTravelerView}>
                    <input type="hidden" name="tripId" value={tripId} />
                    <button type="submit" className={ROW} style={ROW_BORDER}>
                      <RowInner
                        label={
                          viewingAsParticipant
                            ? "Revenir en mode admin"
                            : "Voir comme un participant"
                        }
                        hint={
                          viewingAsParticipant
                            ? "Aperçu — rétablit les outils d'admin"
                            : "Aperçu — masque les outils d'admin"
                        }
                        rail="var(--accent)"
                        arrow="var(--accent)"
                      />
                    </button>
                  </form>
                )}

                <Link href="/" onClick={close} className={ROW} style={ROW_BORDER}>
                  <RowInner
                    label="Mes voyages"
                    hint="Changer de voyage ou en rejoindre un"
                    rail="var(--border)"
                    arrow="var(--muted)"
                  />
                </Link>

                <form action={toggleTheme}>
                  <button type="submit" className={ROW} style={ROW_BORDER}>
                    <RowInner
                      label={theme === "dark" ? "Passer en clair" : "Passer en sombre"}
                      hint="Apparence de l'application"
                      rail="var(--border)"
                      arrow="var(--muted)"
                    />
                  </button>
                </form>
              </div>

              {/* Déconnexion — détachée, en bas */}
              <div className="px-[18px] pt-3.5 pb-8">
                <form action={logout}>
                  <button
                    type="submit"
                    className="w-full min-h-[44px] rounded-[3px] text-[0.8rem] tracking-[0.05em]"
                    style={{ border: "1px solid var(--danger)", color: "var(--danger)" }}
                  >
                    Se déconnecter
                  </button>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        code={accessCode}
        tripName={tripName}
      />
    </>
  );
}
