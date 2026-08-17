"use client";

import { useEffect, useState } from "react";
import { AnnouncementComposer } from "./AnnouncementComposer";
import { useManage } from "./Manage";

/**
 * Panneau de gestion d'une annonce (maquette TRIP'IN Mobile). Le « ⋯ » de
 * l'en-tête ouvre d'abord un petit menu (Modifier le texte / Supprimer), puis
 * « Modifier » déplie l'éditeur complet — mêmes options d'écriture (Gras /
 * Italique, choix de police) que la publication. État d'ouverture partagé via
 * <Manage> ; le sous-état menu/édition se réinitialise à chaque fermeture.
 */
export function AnnouncementManage({
  tripId,
  announcementId,
  defaultContent,
  defaultFont,
  updateAction,
  deleteAction,
}: {
  tripId: number;
  announcementId: number;
  defaultContent: string;
  defaultFont: string;
  updateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
}) {
  const { open, setOpen } = useManage();
  const [mode, setMode] = useState<"menu" | "editing">("menu");

  // Rouvrir le « ⋯ » repart toujours du menu, jamais de l'éditeur laissé ouvert.
  useEffect(() => {
    if (!open) setMode("menu");
  }, [open]);

  if (!open) return null;

  const rowBase =
    "text-left min-h-[46px] px-3 rounded-[3px] flex items-center justify-between gap-2.5 text-[0.8rem]";

  return (
    <div
      className="flex flex-col gap-2 pt-3"
      style={{ borderTop: "1px solid var(--hair)", animation: "sheetin .14s ease-out" }}
    >
      {mode === "menu" ? (
        <>
          <button
            type="button"
            onClick={() => setMode("editing")}
            className={rowBase}
            style={{
              background: "var(--card-raised)",
              border: "1px solid rgba(91,142,125,.55)",
              color: "var(--accent)",
            }}
          >
            <span>Modifier le texte</span>
            <span style={{ opacity: 0.6 }}>→</span>
          </button>
          <form action={deleteAction}>
            <input type="hidden" name="tripId" value={tripId} />
            <input type="hidden" name="announcementId" value={announcementId} />
            <button
              className={`w-full ${rowBase}`}
              style={{
                background: "var(--card-raised)",
                border: "1px solid rgba(188,75,81,.45)",
                color: "var(--danger)",
              }}
            >
              <span>Supprimer l&apos;annonce</span>
              <span style={{ opacity: 0.55 }}>→</span>
            </button>
          </form>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setMode("menu")}
            className="muted text-xs min-h-[34px] self-start px-1"
          >
            ← Retour
          </button>
          <AnnouncementComposer
            tripId={tripId}
            action={updateAction}
            announcementId={announcementId}
            defaultContent={defaultContent}
            defaultFont={defaultFont}
            submitLabel="Enregistrer"
            eyebrow="Modifier l'annonce"
            note="Sélectionne du texte puis Gras / Italique. Les réactions déjà reçues sont conservées."
          />
        </div>
      )}
    </div>
  );
}
