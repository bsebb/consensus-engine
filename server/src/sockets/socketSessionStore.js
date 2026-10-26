const { withRoomState, afterCommit, coordinatedIO } = require('../state/roomCoordinator');
const { getRoomSummaryByPin, getRoomWithVotesByPin, prisma } = require('../../db/helpers');
const { calculateSchulzeWinner } = require('../utils/schulze');
const { dispatchActivityNotification } = require('../utils/storageSafeguard');

// In-memory active lobby roster tracking: pin -> Map(participant_id -> participantRecord)
const activeLobbies = new Map();
// In-memory active voting session tracking: pin -> session
const activeVotingSessions = new Map();
// Disconnect grace tracking: `${pin}:${participant_id}` -> timeoutId
const disconnectTimeouts = new Map();
// In-memory room summary cache: pin -> { room, expiresAt }
const roomSummaryCache = new Map();
const closedRooms = new Set();

async function getCachedRoomSummary(pin) {
  if (!pin) return null;
  const cached = roomSummaryCache.get(pin);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.room;
  }
  try {
    const room = await getRoomSummaryByPin(pin);
    if (room) {
      roomSummaryCache.set(pin, { room, expiresAt: Date.now() + 45000 });
    }
    return room;
  } catch {
    return null;
  }
}

async function persistHostMigration(pin, participant) {
  await prisma.room.update({ where: { pin }, data: { hostId: participant.id, hostDeviceId: participant.deviceId } });
  const cached = roomSummaryCache.get(pin);
  if (cached?.room) { cached.room.hostId = participant.id; cached.room.hostDeviceId = participant.deviceId; }
}

function buildResolvedPayload(pin, session) {
  return {
    pin, winner: session.winner, winning_option: session.winner, winningOptionId: session.winner?.id,
    ranking: session.ranking || [], status: session.status || 'CLEAR',
    support: session.support || { liked: session.approvalCount ?? 0, total: session.totalVoted ?? session.submissions.size },
    vetoCount: session.vetoCount || 0, tieBroken: Boolean(session.tieBroken), allVetoed: Boolean(session.allVetoed),
    supportText: session.supportText, matchScore: session.matchScore ?? 0,
    pairwise: session.pairwise || [], tally: session.tally || [],
    approval_count: session.approvalCount ?? 0, total_voted: session.totalVoted ?? session.submissions.size,
  };
}

// Recover a completed result from durable ballots after a process restart.
async function restoreResolvedSession(pin, io) {
  if (activeVotingSessions.has(pin)) return activeVotingSessions.get(pin);
  const room = await getRoomWithVotesByPin(pin);
  if (room.status !== 'RESOLVED' || !room.winnerOptionId) return null;
  const votedIds = new Set(room.participants.flatMap(p => (p.votes || []).map(v => v.optionId)));
  const submissions = new Map(room.participants.filter(p => p.votes?.length).map(p => [p.id, {
    participant_id: p.id, votes: p.votes.map(v => ({ option_id: v.optionId, score: v.score })),
  }]));
  if (!submissions.size) return null;
  const session = {
    pin, roomId: room.id,
    options: room.options.filter(o => votedIds.has(o.id)).map(o => {
      const metadata = String(o.googlePlaceId || '').split('|');
      const coords = (metadata[4] || '').split(',').map(Number);
      return { id: o.id, name: o.name, price_level: o.priceLevel || 2,
        address: metadata[2] || 'Added by group', category: metadata[3] || 'Group Suggestion',
        photo_url: metadata[5] || null, lat: coords.length === 2 ? coords[0] : null, lng: coords.length === 2 ? coords[1] : null,
        isCustom: room.theme?.startsWith('custom:') };
    }),
    submissions, expectedCount: submissions.size, isResolved: false, isResolving: false,
    topic: room.theme?.replace(/^custom:/, ''), mode: room.theme?.startsWith('custom:') ? 'CUSTOM' : 'DISCOVERY',
    restoredWinnerId: room.winnerOptionId, suppressNotification: true, createdAt: Date.now(),
  };
  activeVotingSessions.set(pin, session);
  await resolveAndBroadcastWinner(io, pin);
  return session;
}

async function resolveAndBroadcastWinner(io, pin) {
  const session = activeVotingSessions.get(pin);
  if (!session) {
    console.warn(`[Socket] Cannot resolve winner for room ${pin}: no active session`);
    return;
  }

  // CAS guard to prevent double-reveal races from concurrent ballots / force-reveal
  if (session.isResolving || session.isResolved) {
    if (session.isResolved && session.winner) {
      const resolvedPayload = buildResolvedPayload(pin, session);
      io.to(pin).emit('winner_announced', resolvedPayload);
      io.to(pin).emit('consensus_reached', resolvedPayload);
      io.to(pin).emit('MATCH_FOUND', resolvedPayload);
    }
    return;
  }
  session.isResolving = true;

  const submissionsArray = Array.from(session.submissions.values());
  if (submissionsArray.length === 0) {
    console.warn(`[Socket] Cannot resolve winner for room ${pin}: 0 submissions`);
    session.isResolving = false;
    return;
  }

  if (!session.options || session.options.length === 0) {
    console.warn(`[Socket] Cannot resolve winner for room ${pin}: no options`);
    session.isResolving = false;
    io.to(pin).emit('room_error', { code: 'no_options', message: 'No options available to determine winner' });
    return;
  }

  const tally = session.options.map((o) => {
    let likes = 0;
    let passes = 0;
    for (const sub of submissionsArray) {
      const vote = sub.votes?.find((v) => v.option_id === o.id);
      if (vote) {
        if (vote.score === 1 || vote.score === 2) likes++;
        else if (vote.score === -1) passes++;
      }
    }
    return { option_id: o.id, likes, passes };
  });

  const validOptionIds = session.options.map((o) => o.id);
  let tournamentResult = null;
  try {
    const { executeSchulzeTournament } = require('../utils/schulze');
    tournamentResult = executeSchulzeTournament(submissionsArray, validOptionIds, pin);
  } catch (err) {
    console.warn('[Socket] Schulze tournament calculation notice:', err.message);
  }

  let winningOptionId = session.restoredWinnerId || tournamentResult?.winnerId;

  // Fallback: If Condorcet returned null, pick highest total score
  if (!winningOptionId) {
    const scoreMap = new Map();
    for (const sub of submissionsArray) {
      for (const v of sub.votes) {
        scoreMap.set(v.option_id, (scoreMap.get(v.option_id) || 0) + v.score);
      }
    }
    let maxScore = -Infinity;
    for (const [optId, score] of scoreMap.entries()) {
      if (score > maxScore) {
        maxScore = score;
        winningOptionId = optId;
      }
    }
  }

  if (!winningOptionId && session.options.length > 0) {
    winningOptionId = session.options[0].id;
  }

  let winningOption = session.options.find((o) => o.id === winningOptionId);
  if (!winningOption) {
    const sortedByLikes = [...tally].sort((a, b) => b.likes - a.likes);
    const topOptionId = sortedByLikes[0]?.option_id;
    winningOption = session.options.find((o) => o.id === topOptionId) || session.options[0];
  }

  // Pre-compute full ranked list of venue options for $O(1)$ rematch pointer advance
  const rankedOptions = (tournamentResult?.ranking || []).map((entry) => {
    const venue = session.options.find((o) => o.id === entry.optionId);
    return venue ? { ...venue, rank: entry.rank, vetoed: entry.vetoed, vetoCount: entry.vetoCount, supportCount: entry.supportCount } : null;
  }).filter(Boolean);

  // Dynamic head-to-head pairwise duel calculation across all submitted ballots
  const rivals = session.options.filter((o) => o.id !== winningOption.id);
  const pairwiseData = rivals.map((rival) => {
    let winVotes = 0;
    let lossVotes = 0;
    for (const sub of submissionsArray) {
      const vWin = sub.votes?.find((v) => v.option_id === winningOption.id)?.score ?? 0;
      const vRival = sub.votes?.find((v) => v.option_id === rival.id)?.score ?? 0;
      if (vWin > vRival) winVotes++;
      else if (vRival > vWin) lossVotes++;

    }
    return {
      opponent: rival.name,
      score: `${winVotes}-${lossVotes}`,
      margin: `${winVotes > lossVotes ? 'Preferred over' : winVotes < lossVotes ? 'Ranked below' : 'Tied with'} ${rival.name} (${winVotes}-${lossVotes})`,
    };
  });

  const approvalCount = submissionsArray.filter((sub) =>
    sub.votes?.some((v) => v.option_id === winningOption.id && (v.score === 1 || v.score === 2))
  ).length;
  const approvalRatio = approvalCount / Math.max(1, submissionsArray.length);
  const matchScore = Math.round(approvalRatio * 100);
  const vetoCount = submissionsArray.filter(s => s.votes?.some(v => v.option_id === winningOption.id && v.score === -100)).length;
  const supportText = `${approvalCount} of ${submissionsArray.length} liked · ${vetoCount} ${vetoCount === 1 ? 'veto' : 'vetoes'}`;

  session.isResolving = false;
  session.isResolved = true;
  session.winner = winningOption;
  session.ranking = rankedOptions.length > 0 ? rankedOptions : [winningOption];
  session.rankingIndex = 0;
  session.status = tournamentResult?.status || 'CLEAR';
  session.support = { liked: approvalCount, total: submissionsArray.length };
  session.vetoCount = vetoCount;
  session.tieBroken = tournamentResult?.tieBroken || false;
  session.allVetoed = tournamentResult?.allVetoed || false;
  session.supportText = supportText;
  session.matchScore = matchScore;
  session.pairwise = pairwiseData;
  session.tally = tally;
  session.approvalCount = approvalCount;
  session.totalVoted = submissionsArray.length;

  console.log(`[Socket] Consensus resolved for room ${pin}: "${winningOption.name}" won across ${submissionsArray.length} ballots! (Status: ${session.status})`);

  // Immediately mark the room as RESOLVED in PostgreSQL so GET /rooms/:pin reflects completion
  if (prisma?.room) {
    await prisma.room.updateMany({
      where: { pin },
      data: {
        status: 'RESOLVED',
        winnerOptionId: winningOption.id,
      },
    }).catch(() => {});
  }
  const cachedSummary = roomSummaryCache.get(pin);
  if (cachedSummary?.room) {
    cachedSummary.room.status = 'RESOLVED';
  }

  if (!session.suppressNotification) await dispatchActivityNotification('decision_reached', {
    pin,
    winnerName: winningOption.name,
    winnerCategory: winningOption.category,
    winnerAddress: winningOption.address,
    voterCount: submissionsArray.length,
    matchScore,
  }).catch(() => {});

  const consensusPayload = {
    pin,
    winning_option: winningOption,
    winningOptionId: winningOption.id,
    winner: winningOption,
    ranking: session.ranking,
    status: session.status,
    support: session.support,
    vetoCount: session.vetoCount,
    tieBroken: session.tieBroken,
    allVetoed: session.allVetoed,
    supportText,
    matchScore,
    pairwise: pairwiseData,
    tally,
    approval_count: approvalCount,
    total_voted: submissionsArray.length,
  };

  io.to(pin).emit('winner_announced', consensusPayload);
  io.to(pin).emit('consensus_reached', consensusPayload);
  io.to(pin).emit('MATCH_FOUND', consensusPayload);

  session.resolvedAt = Date.now();

  // Evict resolved session and disband lobby after 30 minutes
  // Expiry is checked from persisted timestamps by the shared sweep, so a restart
  // does not lose the archive deadline or accidentally recreate an active room.

}

/**
 * Cleanly disbands a lobby/room, notifies connected sockets, updates DB, and alerts Discord webhook
 */
async function disbandLobby(io, pin, reason = 'All participants left the room') {
  if (!pin) return;
  const lobby = activeLobbies.get(pin);
  const session = activeVotingSessions.get(pin);
  if (!lobby && !session) return;

  const durationMinutes = lobby?.createdAt
    ? Math.max(1, Math.round((Date.now() - lobby.createdAt) / 60000))
    : 1;

  if (io) {
    io.to(pin).emit('lobby_closed', {
      pin,
      reason,
      message: `Room #${pin} has disbanded.`,
    });
  }

  const topic = lobby?.topic || session?.topic || 'Places Nearby';
  const mode = lobby?.mode || session?.mode || 'DISCOVERY';
  const voterCount = session ? session.submissions.size : 0;

  closedRooms.add(pin);
  activeLobbies.delete(pin);
  activeVotingSessions.delete(pin);
  roomSummaryCache.delete(pin);

  try {
    if (prisma?.room) {
      await prisma.room.updateMany({
        where: { pin },
        data: { status: 'RESOLVED' },
      }).catch(() => {});
    }
  } catch {}

  console.log(`[Socket] Room #${pin} disbanded: "${reason}" after ${durationMinutes}m`);

  dispatchActivityNotification('lobby_closed', {
    pin,
    topic,
    mode,
    reason,
    durationMinutes,
    voterCount,
  }).catch(() => {});
}

async function sweepPersistedRooms(io, now = Date.now()) {
  const leaseMs = Number(process.env.PRESENCE_LEASE_MS) || 60000;
  const pins = await prisma.$queryRaw`
    SELECT pin FROM rooms
    WHERE "runtimeState"->>'closed' = 'false' AND (
      ("runtimeState" #>> '{lobby,lastActivityAt}')::bigint < ${now - 2 * 60 * 60 * 1000}
      OR ("runtimeState" #>> '{voting,resolvedAt}')::bigint < ${now - 30 * 60 * 1000}
      OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE("runtimeState" #> '{lobby,participants}', '[]')) p
        WHERE (p->>'isHost')::boolean AND (p->>'lastSeenAt')::bigint < ${now - leaseMs})
    ) LIMIT 100`;
  const sharedIO = coordinatedIO(io);
  for (const { pin } of pins) {
    await withRoomState(pin, module.exports, async () => {
      const lobby = activeLobbies.get(pin);
      const session = activeVotingSessions.get(pin);
      if ((session?.resolvedAt && now - session.resolvedAt > 30 * 60 * 1000) ||
          (lobby?.lastActivityAt && now - lobby.lastActivityAt > 2 * 60 * 60 * 1000)) {
        await disbandLobby(sharedIO, pin, 'Room archived after inactivity'); return;
      }
      if (!lobby) return;
      const host = [...lobby.values()].find(p => p.isHost);
      if (!host || now - host.lastSeenAt <= leaseMs) return;
      host.isOnline = false; host.status = 'offline';
      const successor = [...lobby.values()].find(p => p.id !== host.id && p.isOnline && now - p.lastSeenAt <= leaseMs);
      if (successor) {
        host.isHost = false; successor.isHost = true; lobby.hostId = successor.id;
        await persistHostMigration(pin, successor);
        sharedIO.to(pin).emit('host_migrated', { pin, new_host_id: successor.id, new_host_name: successor.name });
      }
    });
  }
}

function initSessionStoreSweep(io) {
  let running = false;
  const interval = setInterval(async () => {
    if (running) return;
    running = true;
    try { await sweepPersistedRooms(io); }
    catch (error) { console.error('[Room sweep]', error.code || error.name); }
    finally { running = false; }
  }, Number(process.env.ROOM_SWEEP_MS) || 15000);
  interval.unref();
  return interval;
}

module.exports = {
  sweepPersistedRooms,
  afterCommit,
  closedRooms,
  withRoomState: (pin, work) => withRoomState(pin, module.exports, work),
  persistHostMigration,
  restoreResolvedSession,
  buildResolvedPayload,
  activeLobbies,
  activeVotingSessions,
  disconnectTimeouts,
  roomSummaryCache,
  getCachedRoomSummary,
  resolveAndBroadcastWinner,
  disbandLobby,
  initSessionStoreSweep,
};
