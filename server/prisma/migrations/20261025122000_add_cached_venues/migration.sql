-- CreateTable
CREATE TABLE IF NOT EXISTS "cached_venues" (
    "id" TEXT NOT NULL,
    "gridKey" TEXT NOT NULL,
    "placeKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "address" TEXT,
    "locality" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "priceLevel" INTEGER NOT NULL DEFAULT 2,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "reviews" INTEGER NOT NULL DEFAULT 120,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cached_venues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "cached_venues_placeKey_key" ON "cached_venues"("placeKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cached_venues_gridKey_idx" ON "cached_venues"("gridKey");
