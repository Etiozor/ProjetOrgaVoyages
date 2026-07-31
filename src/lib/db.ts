import { prisma } from "./prisma";
import type {
  Announcement,
  Car,
  GearCategory,
  GearClaim,
  GearItem,
  MealShopItem,
  MealSlot,
  Participant,
  Reaction,
  Tent,
  Trip,
  User,
} from "@/generated/prisma/client";

export type {
  Announcement,
  Car,
  GearCategory,
  GearClaim,
  GearItem,
  MealShopItem,
  MealSlot,
  Participant,
  Reaction,
  Tent,
  Trip,
  User,
};

export type MealSlotWithShop = MealSlot & { shop: MealShopItem[] };

export { DEFAULT_GEAR_CATEGORIES } from "./gear";

// ---------- Users ----------

export function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? "+" + cleaned.slice(1).replace(/\+/g, "") : cleaned;
}

export function getUserByPhone(phone: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { phone } });
}

export function getUserById(id: number): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export function createUser(data: {
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
}): Promise<User> {
  return prisma.user.create({ data });
}

// ---------- Trips ----------

export function getTripById(id: number): Promise<Trip | null> {
  return prisma.trip.findUnique({ where: { id } });
}

export function getTripByCode(code: string): Promise<Trip | null> {
  return prisma.trip.findFirst({
    where: { accessCode: { equals: code, mode: "insensitive" } },
  });
}

export async function getUserTrips(
  userId: number
): Promise<(Trip & { role: string; participantCount: number })[]> {
  const memberships = await prisma.participant.findMany({
    where: { userId, isActive: true },
    include: {
      trip: {
        include: {
          _count: { select: { participants: { where: { isActive: true } } } },
        },
      },
    },
    orderBy: [{ trip: { startDate: "desc" } }, { trip: { id: "desc" } }],
  });
  return memberships.map(({ trip, role }) => {
    const { _count, ...rest } = trip;
    return { ...rest, role, participantCount: _count.participants };
  });
}

export async function generateTripCode(): Promise<string> {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans caractères ambigus
  for (;;) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    if (!(await getTripByCode(code))) return code;
  }
}

// ---------- Participants ----------

// La photo (data URL) peut peser des dizaines de Ko ; on l'exclut des listes
// (chargées sur presque chaque page) et on la récupère à part via getParticipantPhotos.
export function getParticipants(tripId: number): Promise<Omit<Participant, "photo">[]> {
  return prisma.participant.findMany({
    where: { tripId, isActive: true },
    orderBy: { name: "asc" },
    omit: { photo: true },
  });
}

// { id → photo } pour les participants d'un voyage qui ont une photo de profil.
export function getParticipantPhotos(
  tripId: number
): Promise<{ id: number; photo: string }[]> {
  return prisma.participant.findMany({
    where: { tripId, isActive: true, NOT: { photo: "" } },
    select: { id: true, photo: true },
  });
}

export function getParticipant(id: number): Promise<Participant | null> {
  return prisma.participant.findFirst({ where: { id, isActive: true } });
}

export function getParticipantByUser(
  tripId: number,
  userId: number
): Promise<Participant | null> {
  return prisma.participant.findFirst({ where: { tripId, userId, isActive: true } });
}

export function getUnclaimedParticipants(tripId: number): Promise<Participant[]> {
  return prisma.participant.findMany({
    where: { tripId, userId: null, isActive: true },
    orderBy: { name: "asc" },
  });
}

// ---------- Annonces ----------

export function getAnnouncements(tripId: number): Promise<Announcement[]> {
  return prisma.announcement.findMany({
    where: { tripId },
    orderBy: { createdAt: "desc" },
  });
}

export function getReactions(tripId: number): Promise<Reaction[]> {
  return prisma.reaction.findMany({ where: { announcement: { tripId } } });
}

export function getPendingCount(tripId: number, participantId: number): Promise<number> {
  return prisma.announcement.count({
    where: { tripId, reactions: { none: { participantId } } },
  });
}

// ---------- Voitures & tentes ----------

export function getCars(tripId: number): Promise<Car[]> {
  return prisma.car.findMany({ where: { tripId }, orderBy: { id: "asc" } });
}

export function getCar(id: number): Promise<Car | null> {
  return prisma.car.findUnique({ where: { id } });
}

export function getTents(tripId: number): Promise<Tent[]> {
  return prisma.tent.findMany({ where: { tripId }, orderBy: { id: "asc" } });
}

export function getTent(id: number): Promise<Tent | null> {
  return prisma.tent.findUnique({ where: { id } });
}

// ---------- Matos ----------

export function getGearCategories(tripId: number): Promise<GearCategory[]> {
  return prisma.gearCategory.findMany({ where: { tripId }, orderBy: { id: "asc" } });
}

export function getGearItems(tripId: number): Promise<GearItem[]> {
  return prisma.gearItem.findMany({ where: { tripId }, orderBy: { name: "asc" } });
}

export function getGearClaims(tripId: number): Promise<GearClaim[]> {
  return prisma.gearClaim.findMany({ where: { item: { tripId } } });
}

// ---------- Repas ----------

export function getMealSlots(tripId: number): Promise<MealSlotWithShop[]> {
  return prisma.mealSlot.findMany({
    where: { tripId },
    include: { shop: { orderBy: { id: "asc" } } },
    orderBy: [{ day: "asc" }, { meal: "asc" }],
  });
}
