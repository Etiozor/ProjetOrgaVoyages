// Thèmes de voyage (D-25) — chaque thème est un jeu de design tokens défini
// dans globals.css sous [data-trip-theme="..."], décliné en clair et sombre.
// Ajouter un thème = ajouter une entrée ici + un bloc de tokens CSS, rien d'autre.

export const THEMES = [
  { id: "foret", label: "Forêt", emoji: "🌲", accent: "#2d6a4f" },
  { id: "ocean", label: "Océan", emoji: "🌊", accent: "#1d6fa5" },
  { id: "feu", label: "Feu de camp", emoji: "🔥", accent: "#c2410c" },
  { id: "nuit", label: "Nuit boréale", emoji: "🌌", accent: "#6d28d9" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export function isThemeId(value: string): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}
