const { PrismaClient } = require('@prisma/client');

let prisma = global.__prisma;
if (!prisma) {
  prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
      ? `${process.env.DATABASE_URL}${process.env.DATABASE_URL.includes('?') ? '&' : '?'}connection_limit=5&pool_timeout=10`
      : undefined,
  });
  if (process.env.NODE_ENV !== 'production') {
    global.__prisma = prisma;
  }
}

// Cooldown tracker to prevent alert spamming (max 1 alert per 6 hours)
let lastAlertTimestamp = 0;
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

/**
 * Calculates current system health, memory usage, and estimated PostgreSQL storage.
 */
async function getStorageMetrics() {
  const mem = process.memoryUsage();
  const rssMb = Number((mem.rss / (1024 * 1024)).toFixed(1));
  const heapUsedMb = Number((mem.heapUsed / (1024 * 1024)).toFixed(1));
  const heapTotalMb = Number((mem.heapTotal / (1024 * 1024)).toFixed(1));

  // Render free tier RAM ceiling is 512 MB
  const memoryLimitMb = 512;
  const memoryUsagePercent = Number(((rssMb / memoryLimitMb) * 100).toFixed(1));

  let dbMetrics = {
    rooms: 0,
    options: 0,
    participants: 0,
    votes: 0,
    feedbacks: 0,
    estimatedStorageMb: 0.1,
    freeTierQuotaMb: 1000, // 1 GB free limit on Render Postgres
    storagePercent: 0.01,
  };

  try {
    const [rooms, options, participants, votes, feedbacks] = await Promise.all([
      prisma.room.count().catch(() => 0),
      prisma.option.count().catch(() => 0),
      prisma.participant.count().catch(() => 0),
      prisma.vote.count().catch(() => 0),
      prisma.feedback.count().catch(() => 0),
    ]);

    // Conservative row size estimations:
    // Room (~600 bytes), Option (~250 bytes), Participant (~150 bytes), Vote (~100 bytes), Feedback (~200 bytes)
    const estimatedBytes = (rooms * 600) + (options * 250) + (participants * 150) + (votes * 100) + (feedbacks * 200);
    const estimatedMb = Number(Math.max(0.1, estimatedBytes / (1024 * 1024)).toFixed(2));
    const storagePercent = Number(((estimatedMb / dbMetrics.freeTierQuotaMb) * 100).toFixed(2));

    dbMetrics = {
      rooms,
      options,
      participants,
      votes,
      feedbacks,
      estimatedStorageMb: estimatedMb,
      freeTierQuotaMb: 1000,
      storagePercent,
    };
  } catch (err) {
    console.warn('[StorageSafeguard] Could not fetch DB row counts:', err.message);
  }

  return {
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    memory: {
      rssMb,
      heapUsedMb,
      heapTotalMb,
      limitMb: memoryLimitMb,
      percentUsed: memoryUsagePercent,
      warning: memoryUsagePercent >= 80,
    },
    database: {
      ...dbMetrics,
      warning: dbMetrics.storagePercent >= 80 || dbMetrics.rooms >= 8000,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Dispatches notification alerts via webhook (Discord/Slack/Generic) or formatted logger.
 */
async function dispatchSafeguardAlert(title, message, metrics) {
  const now = Date.now();
  if (now - lastAlertTimestamp < ALERT_COOLDOWN_MS) {
    return; // Active cooldown
  }
  lastAlertTimestamp = now;

  console.warn(`\n[RESOURCE SAFEGUARD WARNING] ${title}: ${message}\n`, JSON.stringify(metrics, null, 2));

  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (webhookUrl && typeof webhookUrl === 'string' && webhookUrl.startsWith('http')) {
    try {
      const payload = {
        content: `⚠️ **Consensus Engine Resource Safeguard Alert**\n**${title}**\n${message}`,
        embeds: [
          {
            title: 'System Telemetry & Free-Tier Quota',
            color: 16753920, // Orange
            fields: [
              { name: 'Memory (RSS)', value: `${metrics.memory.rssMb} MB / ${metrics.memory.limitMb} MB (${metrics.memory.percentUsed}%)`, inline: true },
              { name: 'Estimated DB Storage', value: `${metrics.database.estimatedStorageMb} MB / ${metrics.database.freeTierQuotaMb} MB (${metrics.database.storagePercent}%)`, inline: true },
              { name: 'Active Rooms', value: `${metrics.database.rooms}`, inline: true },
              { name: 'Uptime', value: `${Math.floor(metrics.uptimeSeconds / 3600)}h ${Math.floor((metrics.uptimeSeconds % 3600) / 60)}m`, inline: true },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
      }).catch(() => {});
    } catch (e) {
      console.warn('[StorageSafeguard] Webhook dispatch notice:', e.message);
    }
  }
}

/**
 * Self-Healing Pruning: Deletes completed rooms older than 7 days
 * and unstarted abandoned rooms older than 48 hours.
 * Uses PostgreSQL cascade to instantly clean options, votes, and participants.
 */
async function pruneExpiredRooms(maxResolvedAgeDays = 7) {
  try {
    const resolvedCutoff = new Date(Date.now() - maxResolvedAgeDays * 24 * 60 * 60 * 1000);
    const abandonedCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const prunedResolved = await prisma.room.deleteMany({
      where: {
        status: 'RESOLVED',
        updatedAt: { lt: resolvedCutoff },
      },
    }).catch(() => ({ count: 0 }));

    const prunedAbandoned = await prisma.room.deleteMany({
      where: {
        status: { in: ['CONFIGURING', 'SUGGESTING'] },
        updatedAt: { lt: abandonedCutoff },
        participants: { none: {} },
      },
    }).catch(() => ({ count: 0 }));

    const totalPruned = (prunedResolved.count || 0) + (prunedAbandoned.count || 0);
    if (totalPruned > 0) {
      console.log(`[StorageSafeguard] Self-healing sweep pruned ${totalPruned} expired rooms and cascaded records.`);
    }

    return { success: true, prunedResolved: prunedResolved.count, prunedAbandoned: prunedAbandoned.count };
  } catch (err) {
    console.warn('[StorageSafeguard] Pruning notice:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Checks system metrics and triggers alerts if approaching resource exhaustion.
 */
async function checkSystemSafeguards() {
  const metrics = await getStorageMetrics();

  if (metrics.memory.warning) {
    await dispatchSafeguardAlert(
      'High Memory Usage',
      `Server memory is at ${metrics.memory.percentUsed}% (${metrics.memory.rssMb} MB of 512 MB). Consider upgrading web service plan or restarting.`,
      metrics
    );
  } else if (metrics.database.warning) {
    await dispatchSafeguardAlert(
      'Database Storage Approaching Limit',
      `Database storage is at ${metrics.database.storagePercent}% (${metrics.database.estimatedStorageMb} MB of 1000 MB). Auto-pruner initiated.`,
      metrics
    );
    await pruneExpiredRooms(3); // Aggressive prune if storage is tight
  }

  return metrics;
}

/**
 * Initializes background safeguard cron sweep (runs on startup + every 24 hours).
 */
function initStorageSafeguard() {
  // Run on startup after 10s delay to allow initial connections
  setTimeout(() => {
    pruneExpiredRooms(7).catch(() => {});
    checkSystemSafeguards().catch(() => {});
  }, 10000).unref();

  // Recurring sweep every 24 hours
  const interval = setInterval(() => {
    pruneExpiredRooms(7).catch(() => {});
    checkSystemSafeguards().catch(() => {});
  }, 24 * 60 * 60 * 1000);

  if (interval.unref) interval.unref();
}

module.exports = {
  getStorageMetrics,
  pruneExpiredRooms,
  checkSystemSafeguards,
  initStorageSafeguard,
};
