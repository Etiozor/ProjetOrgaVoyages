"use client";

import { useState } from "react";

/**
 * Sélecteur de places — pas à pas « − N + » (maquette TRIP'IN Mobile).
 * S'utilise dans un <form> : la valeur courante est portée par un champ caché
 * pour être soumise à l'action serveur.
 */
export function CapacityStepper({
  name,
  defaultValue = 4,
  min = 1,
  max = 12,
}: {
  name: string;
  defaultValue?: number;
  min?: number;
  max?: number;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div
      className="flex-none flex items-center rounded-[8px]"
      style={{ border: "1px solid rgba(0,0,0,.14)", background: "var(--card-raised)" }}
    >
      <button
        type="button"
        aria-label="Moins de places"
        onClick={() => setValue((v) => Math.max(min, v - 1))}
        className="w-[38px] h-11 text-base"
        style={{ color: "var(--accent)" }}
      >
        −
      </button>
      <span className="w-[26px] text-center text-sm font-bold">{value}</span>
      <button
        type="button"
        aria-label="Plus de places"
        onClick={() => setValue((v) => Math.min(max, v + 1))}
        className="w-[38px] h-11 text-base"
        style={{ color: "var(--accent)" }}
      >
        +
      </button>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
