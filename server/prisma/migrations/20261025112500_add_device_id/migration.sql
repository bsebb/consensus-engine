-- AlterTable: Add optional hostDeviceId to rooms (non-destructive)
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "hostDeviceId" TEXT;

-- AlterTable: Add optional deviceId to participants (non-destructive)
ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "deviceId" TEXT;

-- CreateIndex: Index on rooms(hostDeviceId)
CREATE INDEX IF NOT EXISTS "rooms_hostDeviceId_idx" ON "rooms"("hostDeviceId");

-- CreateIndex: Index on participants(deviceId) for COUNT(DISTINCT "deviceId") & repeat retention (SM-5)
CREATE INDEX IF NOT EXISTS "participants_deviceId_idx" ON "participants"("deviceId");

-- CreateIndex: Composite index on participants(roomId, deviceId) for fast per-room idempotent device lookup
CREATE INDEX IF NOT EXISTS "participants_roomId_deviceId_idx" ON "participants"("roomId", "deviceId");
