ALTER TABLE "rooms" ADD COLUMN "runtimeState" JSONB;
CREATE TABLE "api_rate_limits" (
  "key" TEXT PRIMARY KEY,
  "count" INTEGER NOT NULL,
  "resetAt" TIMESTAMPTZ(6) NOT NULL
);
CREATE INDEX "api_rate_limits_resetAt_idx" ON "api_rate_limits"("resetAt");
CREATE TABLE "socket_io_attachments" (
  "id" BIGSERIAL PRIMARY KEY,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload" BYTEA NOT NULL
);
CREATE INDEX "socket_io_attachments_created_at_idx" ON "socket_io_attachments"("created_at");
-- Match @updatedAt in the existing Prisma model (the earlier cache migration set a default).
ALTER TABLE "cached_venues" ALTER COLUMN "updatedAt" DROP DEFAULT;
