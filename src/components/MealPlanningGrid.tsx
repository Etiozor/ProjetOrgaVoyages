"use client";

import { useState } from "react";
import Link from "next/link";

export type MealCellKind = "mine" | "other" | "free" | "disabled";

export interface MealCell {
  dayIndex: number;
  mealIndex: number;
  kind: MealCellKind;
  /** Texte affiché dans la case (initiales, « libre » ou « N/A ») */
  label: string;
  /** Infobulle */
  title: string;
}

interface Props {
  tripId: number;
  /** En-têtes de colonnes : un par jour du séjour */
  days: { index: number; short: string }[];
  /** Libellés courts des services (lignes) */
  meals: string[];
  /** Cases aplaties (service × jour) */
  cells: MealCell[];
  /** Nombre de jours affichés par page */
  pageSize?: number;
}

function cellStyle(kind: MealCellKind): React.CSSProperties {
  switch (kind) {
    case "mine":
      return { background: "var(--accent)", color: "var(--bg)", border: "1px solid var(--accent)" };
    case "other":
      return {
        background: "var(--accent-soft)",
        color: "var(--accent)",
        border: "1px solid var(--accent-soft)",
      };
    case "disabled":
      return {
        background: "transparent",
        color: "var(--muted)",
        border: "1px solid var(--border)",
        opacity: 0.65,
      };
    default: // free
      return { background: "transparent", color: "#a05a20", border: "1px dashed var(--warn-bg)" };
  }
}

// Grille d'ensemble du planning. Au lieu de scroller horizontalement quand le
// séjour dépasse quelques jours, on pagine les colonnes avec des boutons ‹ ›.
export function MealPlanningGrid({ tripId, days, meals, cells, pageSize = 3 }: Props) {
  const paginate = days.length > pageSize;
  const [start, setStart] = useState(0);
  const maxStart = Math.max(0, days.length - pageSize);
  const clampedStart = Math.min(start, maxStart);
  const windowDays = paginate ? days.slice(clampedStart, clampedStart + pageSize) : days;
  const shown = new Set(windowDays.map((d) => d.index));
  const end = clampedStart + windowDays.length;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `48px repeat(${windowDays.length}, minmax(52px, 1fr))` }}
      >
        <span />
        {windowDays.map((d) => (
          <span
            key={d.index}
            className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-center muted"
          >
            {d.short}
          </span>
        ))}
        {meals.map((mShort, mi) => (
          <div key={mi} className="contents">
            <span className="text-[0.625rem] uppercase tracking-[0.06em] muted flex items-center">
              {mShort}
            </span>
            {cells
              .filter((c) => c.mealIndex === mi && shown.has(c.dayIndex))
              .map((c) => (
                <Link
                  key={c.dayIndex}
                  href={`/t/${tripId}/meals?day=${c.dayIndex}#slot-${mi}`}
                  title={c.title}
                  className="min-h-10 rounded-[3px] flex items-center justify-center text-[0.7rem] font-semibold tracking-[0.04em]"
                  style={cellStyle(c.kind)}
                >
                  {c.label}
                </Link>
              ))}
          </div>
        ))}
      </div>

      {paginate && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setStart((s) => Math.max(0, Math.min(s, maxStart) - pageSize))}
            disabled={clampedStart === 0}
            aria-label="Jours précédents"
            className="btn-ghost !min-h-0 !py-1 !px-2.5 disabled:opacity-40"
          >
            ‹
          </button>
          <span className="text-[0.625rem] tracking-[0.06em] muted">
            Jours {clampedStart + 1}–{end} / {days.length}
          </span>
          <button
            type="button"
            onClick={() => setStart((s) => Math.min(maxStart, Math.min(s, maxStart) + pageSize))}
            disabled={end >= days.length}
            aria-label="Jours suivants"
            className="btn-ghost !min-h-0 !py-1 !px-2.5 disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
