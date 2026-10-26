-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('CONFIGURING', 'SUGGESTING', 'VOTING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "OptionSource" AS ENUM ('GOOGLE_API', 'USER_CUSTOM');

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'CONFIGURING',
    "theme" TEXT,
    "radius" INTEGER,
    "winnerOptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "budgetCap" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "options" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" "OptionSource" NOT NULL,
    "googlePlaceId" TEXT,
    "priceLevel" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_analytics" (
    "id" TEXT NOT NULL,
    "googlePlaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "truePriceAvg" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "consensusWinRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "satisfactionAvg" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venue_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "satisfactionScore" INTEGER NOT NULL,
    "priceAccuracyScore" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key" ON "rooms"("pin");

-- CreateIndex
CREATE INDEX "participants_roomId_idx" ON "participants"("roomId");

-- CreateIndex
CREATE INDEX "options_roomId_idx" ON "options"("roomId");

-- CreateIndex
CREATE INDEX "options_googlePlaceId_idx" ON "options"("googlePlaceId");

-- CreateIndex
CREATE INDEX "votes_optionId_idx" ON "votes"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "votes_participantId_optionId_key" ON "votes"("participantId", "optionId");

-- CreateIndex
CREATE UNIQUE INDEX "venue_analytics_googlePlaceId_key" ON "venue_analytics"("googlePlaceId");

-- CreateIndex
CREATE INDEX "feedbacks_participantId_idx" ON "feedbacks"("participantId");

-- CreateIndex
CREATE INDEX "feedbacks_optionId_idx" ON "feedbacks"("optionId");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_winnerOptionId_fkey" FOREIGN KEY ("winnerOptionId") REFERENCES "options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

