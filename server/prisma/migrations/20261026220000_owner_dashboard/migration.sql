CREATE TABLE "dashboard_owner" (
  "id" TEXT PRIMARY KEY,
  "enrolled" BOOLEAN NOT NULL DEFAULT false,
  "setupTokenHash" TEXT
);
INSERT INTO "dashboard_owner" ("id") VALUES ('owner');
CREATE TABLE "dashboard_credentials" (
  "id" TEXT PRIMARY KEY,
  "publicKey" BYTEA NOT NULL,
  "counter" BIGINT NOT NULL DEFAULT 0,
  "transports" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "dashboard_challenges" (
  "id" TEXT PRIMARY KEY,
  "challenge" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "binding" TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL
);
CREATE INDEX "dashboard_challenges_expiresAt_idx" ON "dashboard_challenges"("expiresAt");
CREATE TABLE "dashboard_sessions" (
  "id" TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ(6) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "dashboard_sessions_expiresAt_idx" ON "dashboard_sessions"("expiresAt");
CREATE INDEX "rooms_createdAt_idx" ON "rooms"("createdAt");
CREATE INDEX "participants_createdAt_idx" ON "participants"("createdAt");
CREATE INDEX "feedbacks_createdAt_idx" ON "feedbacks"("createdAt");
