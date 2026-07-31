-- CreateTable
CREATE TABLE "meal_slot" (
    "id" SERIAL NOT NULL,
    "tripId" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "meal" INTEGER NOT NULL,
    "carId" INTEGER,
    "menu" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "meal_slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_shop_item" (
    "id" SERIAL NOT NULL,
    "slotId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "meal_shop_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_slot_tripId_day_meal_key" ON "meal_slot"("tripId", "day", "meal");

-- AddForeignKey
ALTER TABLE "meal_slot" ADD CONSTRAINT "meal_slot_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_slot" ADD CONSTRAINT "meal_slot_carId_fkey" FOREIGN KEY ("carId") REFERENCES "car"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_shop_item" ADD CONSTRAINT "meal_shop_item_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "meal_slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
