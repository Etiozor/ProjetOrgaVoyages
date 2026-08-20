"use client";

import { useState } from "react";
import Link from "next/link";
import { MealPlanningGrid, type MealCell } from "./MealPlanningGrid";

/** Une tuile de sélection de jour, sous la matrice des repas. */
export interface DayTile {
  index: number;
  /** Libellé long, ex. « Samedi 21 » */
  label: string;
  /** Nombre de créneaux réservables ce jour-là (hors « N/A ») */
  bookable: number;
  /** Nombre de créneaux pourvus ce jour-là */
  booked: number;
}

interface Props {
  tripId: number;
  /** En-têtes de colonnes : un par jour du séjour */
  days: { index: number; short: string }[];
  /** Libellés courts des services (lignes) */
  meals: string[];
  /** Cases aplaties (service × jour) */
  cells: MealCell[];
  /** Tuiles de sélection de jour (une par jour, dans l'ordre) */
  tiles: DayTile[];
  /** Jour actuellement sélectionné */
  selectedDay: number;
  /** Nombre de jours affichés par page */
  pageSize?: number;
  /** Compteurs d'en-tête de la carte */
  bookedSlots: number;
  totalSlots: number;
  coverAll: boolean;
}

// Regroupe la matrice des repas et les tuiles de sélection de jour pour qu'un
// même état de pagination filtre les deux : quand le séjour dépasse `pageSize`
// jours, la matrice et les tuiles n'affichent que la fenêtre de jours courante.
export function MealPlanningBoard({
  tripId,
  days,
  meals,
  cells,
  tiles,
  selectedDay,
  pageSize = 3,
  bookedSlots,
  totalSlots,
  coverAll,
}: Props) {
  const paginate = days.length > pageSize;
  // Au chargement, on ouvre la page qui contient le jour sélectionné.
  const [start, setStart] = useState(
    paginate ? Math.floor(Math.max(0, selectedDay) / pageSize) * pageSize : 0
  );
  const maxStart = Math.max(0, days.length - pageSize);
  const clampedStart = Math.min(start, maxStart);
  const windowTiles = paginate
    ? tiles.filter((t) => t.index >= clampedStart && t.index < clampedStart + pageSize)
    : tiles;

  return (
    <>
      {/* Vue d'ensemble : grille services × jours */}
      <div className="card flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-2.5">
          <span className="eyebrow">Planning du séjour</span>
          <span
            className="text-[0.7rem] whitespace-nowrap"
            style={{ color: coverAll ? "var(--accent)" : "var(--warn-bg)" }}
          >
            {bookedSlots}/{totalSlots} créneaux pourvus
          </span>
        </div>
        <MealPlanningGrid
          tripId={tripId}
          days={days}
          meals={meals}
          cells={cells}
          pageSize={pageSize}
          start={start}
          onStartChange={setStart}
        />
        <div className="flex flex-wrap gap-3 pt-0.5 text-[0.625rem] muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: "var(--accent)" }} />
            mon équipe
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: "var(--accent-soft)" }} />
            autre équipe
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-[2px]"
              style={{ border: "1px dashed var(--warn-bg)" }}
            />
            libre
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-[2px]"
              style={{ border: "1px solid var(--border)", opacity: 0.65 }}
            />
            N/A
          </span>
        </div>
      </div>

      {/* Sélecteur de jour — limité à la fenêtre de pagination de la matrice */}
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${windowTiles.length}, 1fr)` }}
      >
        {windowTiles.map((t) => {
          const active = t.index === selectedDay;
          return (
            <Link
              key={t.index}
              href={`/t/${tripId}/meals?day=${t.index}`}
              className="min-h-12 rounded-[8px] flex flex-col items-center justify-center gap-0.5"
              style={{
                background: active ? "var(--card)" : "transparent",
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              <span
                className="font-[family-name:var(--font-oswald)] text-sm font-semibold uppercase tracking-[0.05em]"
                style={{ color: active ? "var(--text)" : "var(--muted)" }}
              >
                {t.label}
              </span>
              <span
                className="text-[0.625rem] tracking-[0.04em]"
                style={{
                  color:
                    t.bookable === 0
                      ? "var(--muted)"
                      : t.booked < t.bookable
                        ? "var(--warn-bg)"
                        : "var(--accent)",
                }}
              >
                {t.bookable === 0 ? "N/A" : `${t.booked}/${t.bookable}`}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
