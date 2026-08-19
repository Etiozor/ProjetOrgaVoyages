/**
 * Étiquette de capacité (maquette TRIP'IN Mobile) — voitures & tentes.
 * Vert bordé « N libre(s) » tant qu'il reste de la place, rouge bordé pour
 * « Complet / Complète ». Barlow 11px gras uppercase, comme la maquette.
 */
export function CapacityBadge({
  free,
  fullLabel,
}: {
  free: number;
  /** Libellé quand il n'y a plus de place (« Complet » voiture, « Complète » tente) */
  fullLabel: string;
}) {
  const available = free > 0;
  const base = available ? "var(--accent)" : "var(--danger)";
  const text = available ? "var(--accent-text)" : "var(--danger-text)";
  return (
    <span
      className="shrink-0 whitespace-nowrap uppercase"
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.09em",
        padding: "4px 8px",
        borderRadius: 8,
        color: text,
        background: `color-mix(in srgb, ${base} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${base} 45%, transparent)`,
      }}
    >
      {available ? `${free} libre${free > 1 ? "s" : ""}` : fullLabel}
    </span>
  );
}
