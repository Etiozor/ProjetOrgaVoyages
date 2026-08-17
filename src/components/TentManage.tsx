"use client";

import { useState } from "react";
import { deleteTent, updateTent } from "@/lib/actions";
import { CapacityStepper } from "./CapacityStepper";
import { SubmitButton } from "./SubmitButton";

/**
 * « Gérer » d'une tente (maquette TRIP'IN Mobile) — visible par le propriétaire
 * et l'admin. Le bouton « ⋯ » déplie un panneau de modification (nom, capacité)
 * suivi de la suppression. Les actions serveur revalident la propriété.
 */
export function TentManage({
  tripId,
  tent,
  declaredBy,
}: {
  tripId: number;
  tent: { id: number; label: string; capacity: number };
  declaredBy: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Gérer cette tente"
        aria-label="Gérer cette tente"
        className="self-end flex items-center gap-[3px] px-2 h-6 rounded-[3px]"
        style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
      >
        <span className="text-[0.7rem] tracking-[0.04em] pr-1">Gérer</span>
        <span className="w-[3px] h-[3px] rounded-full bg-current" />
        <span className="w-[3px] h-[3px] rounded-full bg-current" />
        <span className="w-[3px] h-[3px] rounded-full bg-current" />
      </button>
    );
  }

  return (
    <div
      className="flex flex-col gap-2.5 pt-3"
      style={{ borderTop: "1px solid var(--hair)", animation: "sheetin .14s ease-out" }}
    >
      <p className="eyebrow" style={{ color: "var(--accent)" }}>
        Modification · {declaredBy ?? "ajoutée par l'admin"}
      </p>

      <form action={updateTent} className="flex flex-col gap-2.5">
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="tentId" value={tent.id} />
        <div className="flex gap-2">
          <input
            name="label"
            className="input"
            defaultValue={tent.label}
            placeholder="Nom (ex. Quechua 4p)"
            required
          />
          <CapacityStepper name="capacity" defaultValue={tent.capacity} min={1} max={12} />
        </div>
        <div
          className="flex items-center justify-between gap-2.5 pt-2.5"
          style={{ borderTop: "1px solid var(--hair)" }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="muted text-xs min-h-[38px] px-1"
          >
            Fermer
          </button>
          <SubmitButton
            className="btn !min-h-[38px] !text-xs"
            savedLabel="✓ Modifié"
          >
            Enregistrer
          </SubmitButton>
        </div>
      </form>

      <form action={deleteTent}>
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="tentId" value={tent.id} />
        <button
          className="w-full text-left min-h-[46px] px-3 rounded-[3px] flex items-center justify-between gap-2.5 text-[0.8rem]"
          style={{
            background: "var(--card-raised)",
            border: "1px solid rgba(188,75,81,.45)",
            color: "var(--danger)",
          }}
        >
          <span>Supprimer la tente</span>
          <span style={{ opacity: 0.55 }}>→</span>
        </button>
      </form>
    </div>
  );
}
