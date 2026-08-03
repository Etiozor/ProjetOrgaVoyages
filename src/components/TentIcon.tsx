/**
 * Pictogramme de tente — dessin « volume trois-quarts » de la maquette
 * TRIP'IN Mobile (façade éclairée, flanc ombré, haubans), décliné en trois
 * gabarits selon la capacité : petite (≤2), familiale (3–4), grande + auvent (≥5).
 *
 * Les couleurs suivent les tokens du thème (encre = currentColor, toile =
 * --card-raised) pour rester lisible en clair comme en sombre.
 */
export function TentIcon({ capacity }: { capacity: number }) {
  const size = capacity <= 2 ? "tiny" : capacity <= 4 ? "small" : "large";
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { flex: "none", color: "var(--text)" },
  };

  if (size === "tiny") {
    return (
      <svg width={46} height={38} viewBox="0 0 46 38" {...common}>
        <path d="M4 33h38" strokeOpacity={0.28} />
        <path d="M9 32L23 7l14 25H9z" fill="var(--card-raised)" />
        <path d="M14 32l7-17h4l7 17H14z" fill="currentColor" fillOpacity={0.5} stroke="none" />
        <rect x={16.7} y={26} width={5.6} height={4.4} rx={1.5} fill="var(--card-raised)" stroke="none" />
        <rect x={23.7} y={26} width={5.6} height={4.4} rx={1.5} fill="var(--card-raised)" stroke="none" />
        <path d="M17.3 27.3h4.4M24.3 27.3h4.4" strokeOpacity={0.4} strokeWidth={1.1} />
        <path d="M23 7L7.5 26M23 7l15.5 19" strokeOpacity={0.45} strokeWidth={1} />
        <path d="M7.5 26v3.4M38.5 26v3.4" />
        <path d="M23 7V2.5l5.6 1.7L23 5.9" fill="currentColor" />
      </svg>
    );
  }

  if (size === "small") {
    return (
      <svg width={60} height={38} viewBox="0 0 60 38" {...common}>
        <path d="M4 33h52" strokeOpacity={0.28} />
        <path d="M11 32L30 6l19 26H11z" fill="var(--card-raised)" />
        <path d="M17 32l10-20h6l10 20H17z" fill="currentColor" fillOpacity={0.5} stroke="none" />
        <rect x={23.1} y={20.3} width={6.2} height={3.8} rx={1.4} fill="var(--card-raised)" stroke="none" />
        <rect x={30.7} y={20.3} width={6.2} height={3.8} rx={1.4} fill="var(--card-raised)" stroke="none" />
        <rect x={20.75} y={25.6} width={8.4} height={4.4} rx={1.5} fill="var(--card-raised)" stroke="none" />
        <rect x={30.85} y={25.6} width={8.4} height={4.4} rx={1.5} fill="var(--card-raised)" stroke="none" />
        <path d="M23.7 21.4h5M31.3 21.4h5" strokeOpacity={0.4} strokeWidth={1.1} />
        <path d="M21.5 26.9h6.9M31.6 26.9h6.9" strokeOpacity={0.4} strokeWidth={1.1} />
        <path d="M30 6L5 25M30 6l25 19" strokeOpacity={0.45} strokeWidth={1} />
        <path d="M5 25v3.4M55 25v3.4" />
        <path d="M30 6V1.5l6 1.7L30 4.9" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg width={82} height={38} viewBox="0 0 82 38" {...common}>
      <path d="M3 33h76" strokeOpacity={0.28} />
      <path d="M8 15.5l24-6v3l-24 6z" fill="currentColor" fillOpacity={0.12} stroke="none" />
      <path d="M8 15.5V32M8 15.5L3.5 11.5" />
      <path d="M22 32L34 8h26l12 24H22z" fill="var(--card-raised)" />
      <path d="M32 8h30" />
      <path d="M30 32l8.5-19h17L64 32H30z" fill="currentColor" fillOpacity={0.5} stroke="none" />
      <rect x={36} y={20.3} width={6.4} height={3.8} rx={1.4} fill="var(--card-raised)" stroke="none" />
      <rect x={43.8} y={20.3} width={6.4} height={3.8} rx={1.4} fill="var(--card-raised)" stroke="none" />
      <rect x={51.6} y={20.3} width={6.4} height={3.8} rx={1.4} fill="var(--card-raised)" stroke="none" />
      <rect x={33.4} y={25.6} width={8} height={4.4} rx={1.5} fill="var(--card-raised)" stroke="none" />
      <rect x={43} y={25.6} width={8} height={4.4} rx={1.5} fill="var(--card-raised)" stroke="none" />
      <rect x={52.6} y={25.6} width={8} height={4.4} rx={1.5} fill="var(--card-raised)" stroke="none" />
      <path d="M36.6 21.4h5.2M44.4 21.4h5.2M52.2 21.4h5.2" strokeOpacity={0.4} strokeWidth={1.1} />
      <path d="M34.2 26.9h6.4M43.8 26.9h6.4M53.4 26.9h6.4" strokeOpacity={0.4} strokeWidth={1.1} />
      <path d="M60 8l17 19" strokeOpacity={0.45} strokeWidth={1} />
      <path d="M77 27v3.4" />
      <path d="M34 8V3.5l6 1.7L34 6.9" fill="currentColor" />
    </svg>
  );
}
