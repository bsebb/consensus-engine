-- Classification is reversible; preserve rooms, ballots, feedback and activity timestamps.
ALTER TABLE "rooms" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

-- Only confirmed historical fixtures. Browser-generated identities, room topics,
-- dates alone and sessions with no reliable test marker remain genuine activity.
UPDATE "rooms" SET "isTest" = true
WHERE (
  ("hostDeviceId" IN (
    'dev-restaurants','dev-bars','dev-cafes','dev-cinema','dev-activities','dev-desserts',
    'dev-host-CUSTOM','dev-host-DISCOVERY','dev-host-vote','dev-host-tie'
  ) AND "hostId" ~ '^host-(restaurants|bars|cafes|cinema|activities|desserts|custom|discovery|vote|tie)-[0-9]{13}$')
  OR "hostDeviceId" = 'test-device-123'
  OR ("hostDeviceId" IS NULL AND "hostId" IN (
    'claude_dossier_host','gesture_audit_host','live_test_user','test-fun-user','test-user','host_audit_test'
  ))
) AND "createdAt" < TIMESTAMP '2026-10-28 00:00:00';
