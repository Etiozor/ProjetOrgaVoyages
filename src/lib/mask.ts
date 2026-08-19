// Masque une adresse pour l'affichage (écrans de confirmation, bandeau) :
// « etienne@gmail.com » → « e******@gmail.com ». Ne révèle jamais l'adresse complète.
export function maskEmail(e: string): string {
  const [u, d] = e.split("@");
  if (!d) return "ton adresse";
  return `${u.slice(0, 1)}${"*".repeat(Math.max(1, u.length - 1))}@${d}`;
}
