// Trois services par jour — libellés fixes repris de la maquette « TRIP'IN Mobile ».
export const MEALS = [
  { label: "Petit-déjeuner", short: "Matin", time: "8h – 9h30" },
  { label: "Déjeuner", short: "Midi", time: "12h30" },
  { label: "Souper", short: "Soir", time: "19h" },
] as const;

export interface TripDay {
  index: number;
  /** Libellé long, ex. « Samedi 21 » */
  label: string;
  /** Libellé court, ex. « Sam 21 » */
  short: string;
}

function cap1(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Liste des jours du séjour, dérivée des dates ISO (« YYYY-MM-DD ») du voyage.
// Sans date de début, on retombe sur un jour générique pour garder la page utilisable.
export function tripDays(startDate: string, endDate: string): TripDay[] {
  if (!startDate) return [{ index: 0, label: "Jour 1", short: "Jour 1" }];
  const start = new Date(startDate + "T12:00:00");
  if (Number.isNaN(start.getTime())) {
    return [{ index: 0, label: "Jour 1", short: "Jour 1" }];
  }
  const end = endDate ? new Date(endDate + "T12:00:00") : start;
  const days: TripDay[] = [];
  const cur = new Date(start);
  const CAP = 21; // garde-fou contre une plage de dates aberrante
  for (let i = 0; i < CAP && cur <= end; i++) {
    days.push({
      index: i,
      label: cap1(cur.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })),
      short: cap1(
        cur.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }).replace(".", "")
      ),
    });
    cur.setDate(cur.getDate() + 1);
  }
  return days.length ? days : [{ index: 0, label: "Jour 1", short: "Jour 1" }];
}
