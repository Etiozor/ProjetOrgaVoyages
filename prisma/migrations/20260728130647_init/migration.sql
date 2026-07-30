-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "startDate" TEXT NOT NULL DEFAULT '',
    "endDate" TEXT NOT NULL DEFAULT '',
    "meetingPoint" TEXT NOT NULL DEFAULT '',
    "transport" TEXT NOT NULL DEFAULT '',
    "capacity" INTEGER NOT NULL DEFAULT 10,
    "accessCode" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'foret',
    "allowMemberCars" BOOLEAN NOT NULL DEFAULT true,
    "allowMemberTents" BOOLEAN NOT NULL DEFAULT true,
    "pageCarpool" BOOLEAN NOT NULL DEFAULT true,
    "pageMeals" BOOLEAN NOT NULL DEFAULT true,
    "pageTents" BOOLEAN NOT NULL DEFAULT true,
    "pageGear" BOOLEAN NOT NULL DEFAULT true,
    "requireReaction" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant" (
    "id" SERIAL NOT NULL,
    "tripId" INTEGER NOT NULL,
    "userId" INTEGER,
    "role" TEXT NOT NULL DEFAULT 'participant',
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "dietary" TEXT NOT NULL DEFAULT '',
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "carId" INTEGER,
    "tentId" INTEGER,

    CONSTRAINT "participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement" (
    "id" SERIAL NOT NULL,
    "tripId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "authorLabel" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reaction" (
    "announcementId" INTEGER NOT NULL,
    "participantId" INTEGER NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "reaction_pkey" PRIMARY KEY ("announcementId","participantId")
);

-- CreateTable
CREATE TABLE "car" (
    "id" SERIAL NOT NULL,
    "tripId" INTEGER NOT NULL,
    "ownerId" INTEGER,
    "label" TEXT NOT NULL DEFAULT '',
    "departPlace" TEXT NOT NULL DEFAULT '',
    "departTime" TEXT NOT NULL DEFAULT '',
    "seats" INTEGER NOT NULL,
    "menu" TEXT NOT NULL DEFAULT '',
    "shopping" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tent" (
    "id" SERIAL NOT NULL,
    "tripId" INTEGER NOT NULL,
    "ownerId" INTEGER,
    "label" TEXT NOT NULL DEFAULT '',
    "capacity" INTEGER NOT NULL,

    CONSTRAINT "tent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gear_category" (
    "id" SERIAL NOT NULL,
    "tripId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "gear_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gear_item" (
    "id" SERIAL NOT NULL,
    "tripId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "qtyRequired" INTEGER NOT NULL DEFAULT 1,
    "createdById" INTEGER,

    CONSTRAINT "gear_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gear_claim" (
    "itemId" INTEGER NOT NULL,
    "participantId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "gear_claim_pkey" PRIMARY KEY ("itemId","participantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_phone_key" ON "user"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "trip_accessCode_key" ON "trip"("accessCode");

-- CreateIndex
CREATE UNIQUE INDEX "participant_tripId_userId_key" ON "participant"("tripId", "userId");

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_carId_fkey" FOREIGN KEY ("carId") REFERENCES "car"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_tentId_fkey" FOREIGN KEY ("tentId") REFERENCES "tent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car" ADD CONSTRAINT "car_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car" ADD CONSTRAINT "car_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tent" ADD CONSTRAINT "tent_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tent" ADD CONSTRAINT "tent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gear_category" ADD CONSTRAINT "gear_category_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gear_item" ADD CONSTRAINT "gear_item_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gear_item" ADD CONSTRAINT "gear_item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "gear_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gear_claim" ADD CONSTRAINT "gear_claim_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "gear_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gear_claim" ADD CONSTRAINT "gear_claim_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
