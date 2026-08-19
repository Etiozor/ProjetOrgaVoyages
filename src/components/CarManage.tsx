"use client";

import { deleteCar, updateCar } from "@/lib/actions";
import { CapacityStepper } from "./CapacityStepper";
import { SubmitButton } from "./SubmitButton";
import { useManage } from "./Manage";

/**
 * Panneau « Gérer » d'une voiture (maquette TRIP'IN Mobile). Rendu au bas de la
 * carte, il se déplie quand le « ⋯ » de l'en-tête est actif (état partagé via
 * <Manage>). Modification (nom, lieu, heure, places) puis suppression ; les
 * actions serveur revalident la propriété.
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
  const { open, setOpen } = useManage();
  if (!open) return null;

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
          className="w-full text-left min-h-[46px] px-3 rounded-[8px] flex items-center justify-between gap-2.5 text-[0.8rem]"
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
