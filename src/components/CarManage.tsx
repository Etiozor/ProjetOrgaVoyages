"use client";

import { useState } from "react";
import { deleteCar, updateCar } from "@/lib/actions";
import { CapacityStepper } from "./CapacityStepper";
import { SubmitButton } from "./SubmitButton";

/**
 * « Gérer » d'une voiture (maquette TRIP'IN Mobile) — visible par le propriétaire
 * et l'admin. Le bouton « ⋯ » déplie un panneau de modification (nom, lieu, heure,
 * places) suivi de la suppression. Les actions serveur revalident la propriété.
 */
export function CarManage({
  tripId,
  car,
  declaredBy,
}: {
  tripId: number;
  car: {
    id: number;
    label: string;
    departPlace: string;
    departTime: string;
    seats: number;
  };
  declaredBy: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Gérer cette voiture"
        aria-label="Gérer cette voiture"
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

      <form action={updateCar} className="flex flex-col gap-2.5">
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="carId" value={car.id} />
        <input
          name="label"
          className="input"
          defaultValue={car.label}
          placeholder="Nom (ex. Voiture de Max)"
          required
        />
        <input
          name="departPlace"
          className="input"
          defaultValue={car.departPlace}
          placeholder="Lieu de départ"
        />
        <div className="flex gap-2">
          <input
            name="departTime"
            className="input"
            defaultValue={car.departTime}
            placeholder="Heure"
          />
          <CapacityStepper name="seats" defaultValue={car.seats} min={1} max={9} />
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

      <form action={deleteCar}>
        <input type="hidden" name="tripId" value={tripId} />
        <input type="hidden" name="carId" value={car.id} />
        <button
          className="w-full text-left min-h-[46px] px-3 rounded-[3px] flex items-center justify-between gap-2.5 text-[0.8rem]"
          style={{
            background: "var(--card-raised)",
            border: "1px solid rgba(188,75,81,.45)",
            color: "var(--danger)",
          }}
        >
          <span>Supprimer la voiture</span>
          <span style={{ opacity: 0.55 }}>→</span>
        </button>
      </form>
    </div>
  );
}
