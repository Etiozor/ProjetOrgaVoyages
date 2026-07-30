// Polices proposées pour les annonces. « barlow » = défaut, sans-serif non italique.
export const ANNOUNCE_FONTS = [
  { id: "barlow", label: "Barlow (défaut)" },
  { id: "serif", label: "Élégant (serif italique)" },
  { id: "oswald", label: "Titre (Oswald)" },
] as const;

export type AnnounceFont = (typeof ANNOUNCE_FONTS)[number]["id"];

export function isAnnounceFont(value: string): value is AnnounceFont {
  return ANNOUNCE_FONTS.some((f) => f.id === value);
}

// Style CSS correspondant (famille + italique éventuel) pour l'aperçu et l'affichage.
export function fontStyleFor(font: string): {
  fontFamily: string;
  fontStyle: "normal" | "italic";
} {
  switch (font) {
    case "serif":
      return { fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic" };
    case "oswald":
      return { fontFamily: "var(--font-oswald), sans-serif", fontStyle: "normal" };
    default:
      return { fontFamily: "var(--font-barlow), sans-serif", fontStyle: "normal" };
  }
}
