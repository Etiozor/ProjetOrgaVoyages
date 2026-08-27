"use client";

import { useState } from "react";
import { deleteTrip } from "@/lib/actions";
import { SubmitButton } from "./SubmitButton";

/**
 * Zone dangereuse de la page admin : suppression définitive du voyage, protégée
 * par plusieurs portes de validation pour éviter tout clic accidentel.
 *   1. La zone reste repliée : il faut « armer » la suppression pour la révéler.
 *   2. Une case à cocher d'accusé de réception (action irréversible).
 *   3. Le nom exact du voyage doit être retapé à l'identique.
 *   4. Une dernière confirmation native à la soumission.
 * Le serveur revérifie le nom (deleteTrip) au cas où ces gardes seraient contournées.
 */
export function DeleteTripSection({
  tripId,
  tripName,
  mismatch = false,
}: {
  tripId: number;
  tripName: string;
  mismatch?: boolean;
}) {
  // Armée d'entrée si le serveur a renvoyé une non-correspondance (on garde le contexte).
  const [armed, setArmed] = useState(mismatch);
  const [ack, setAck] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const nameMatches = confirmName.trim() === tripName.trim();
  const canDelete = ack && nameMatches;

  const reset = () => {
    setArmed(false);
    setAck(false);
    setConfirmName("");
  };

  return (
    <div
      className="card flex flex-col gap-2.5"
      style={{ border: "1px solid rgba(188,75,81,.45)" }}
    >
      <p className="eyebrow" style={{ color: "var(--danger)" }}>
        Zone dangereuse
      </p>
      <p className="muted text-xs leading-relaxed">
        Supprimer le voyage efface définitivement toutes ses données —
        participants, annonces, voitures, tentes, matos et repas. Cette action
        est irréversible.
      </p>

      {!armed ? (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="w-full min-h-[46px] px-3 rounded-[8px] flex items-center justify-between gap-2.5 text-[0.8rem]"
          style={{
            background: "var(--card-raised)",
            border: "1px solid rgba(188,75,81,.45)",
            color: "var(--danger)",
          }}
        >
          <span>Supprimer le voyage…</span>
          <span style={{ opacity: 0.55 }}>→</span>
        </button>
      ) : (
        <form
          action={deleteTrip}
          className="flex flex-col gap-2.5"
          onSubmit={(e) => {
            if (
              !window.confirm(
                `Dernière confirmation : supprimer définitivement « ${tripName} » et toutes ses données ? Cette action est irréversible.`
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="tripId" value={tripId} />

          {mismatch && (
            <p className="text-xs" style={{ color: "var(--danger)" }}>
              Le nom saisi ne correspondait pas au nom du voyage. Réessaie.
            </p>
          )}

          <label className="flex items-start gap-2 text-xs leading-relaxed cursor-pointer">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-0.5 shrink-0"
              style={{ accentColor: "var(--danger)" }}
            />
            <span>
              Je comprends que cette action est définitive et supprimera toutes
              les données du voyage.
            </span>
          </label>

          <label className="eyebrow !normal-case !tracking-normal">
            Retape le nom du voyage pour confirmer : «&nbsp;{tripName}&nbsp;»
          </label>
          <input
            name="confirmName"
            className="input"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={tripName}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />

          <div
            className="flex items-center justify-between gap-2.5 pt-2.5"
            style={{ borderTop: "1px solid var(--hair)" }}
          >
            <button
              type="button"
              onClick={reset}
              className="muted text-xs min-h-[38px] px-1"
            >
              Annuler
            </button>
            <SubmitButton
              className="btn !min-h-[38px] !text-xs"
              pendingLabel="Suppression…"
              savedLabel="Supprimé"
              disabled={!canDelete}
              style={
                canDelete
                  ? { background: "var(--danger)", borderColor: "var(--danger)" }
                  : undefined
              }
            >
              Supprimer définitivement
            </SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
