import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_GEAR_CATEGORIES } from "../src/lib/gear";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Voyage de référence, joignable avec le code CAMP2026 — idempotent
  const existing = await prisma.trip.findUnique({ where: { accessCode: "CAMP2026" } });
  if (existing) {
    console.log("Seed déjà présent (voyage CAMP2026), rien à faire.");
    return;
  }

  const trip = await prisma.trip.create({
    data: {
      name: "Camping 2026",
      location: "Île Beaurivage, parc national des 1000 Îles",
      startDate: "2026-06-21",
      endDate: "2026-06-23",
      meetingPoint: "Marina de Gananoque (~2h30 de Montréal)",
      transport:
        "Kayak (location 300$/2 pers.) ou navette (à réserver) — emplacements BR1, BR2, BR3",
      capacity: 18,
      accessCode: "CAMP2026",
      theme: "foret",
      gearCategories: { create: DEFAULT_GEAR_CATEGORIES.map((name) => ({ name })) },
    },
  });

  // Étienne (l'organisateur) est l'admin du voyage de seed ; il récupère ce
  // rôle en réclamant son nom à la première connexion
  const seedNames: [string, string | null, string][] = [
    ["Étienne", "etienne.le.pironnec1@gmail.com", "admin"],
    ["Camille", null, "participant"],
    ["Maxime", null, "participant"],
    ["Julie", null, "participant"],
    ["Antoine", null, "participant"],
    ["Sarah", null, "participant"],
    ["Nicolas", null, "participant"],
    ["Laura", null, "participant"],
  ];
  for (const [name, email, role] of seedNames) {
    await prisma.participant.create({ data: { tripId: trip.id, name, email, role } });
  }

  await prisma.announcement.create({
    data: {
      tripId: trip.id,
      content:
        "Bienvenue sur TRIP'IN ! 🏕️ Réservation confirmée pour les emplacements BR1, BR2 et BR3. Réagissez à ce message pour confirmer que vous l'avez vu.",
      authorLabel: "Admin",
      createdAt: new Date().toISOString(),
    },
  });

  console.log(`Seed créé : voyage "${trip.name}" (code ${trip.accessCode}).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
