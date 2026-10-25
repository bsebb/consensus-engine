const { getRoomSummaryByPin, prisma } = require('../../db/helpers');
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

async function resolveAndBroadcastWinner(io, pin) {
  const session = activeVotingSessions.get(pin);
  if (!session) {
    console.warn(`[Socket] Cannot resolve winner for room ${pin}: no active session`);
    return;
  }

  if (session.isResolved && session.winner) {
    const resolvedPayload = {
      pin,
      winning_option: session.winner,
      winningOptionId: session.winner.id,
      winner: session.winner,
      matchScore: session.matchScore || 96,
      pairwise: session.pairwise || [],
      tally: session.tally || [],
      approval_count: session.approvalCount ?? 0,
      total_voted: session.totalVoted ?? session.submissions.size,
    };
    io.to(pin).emit('winner_announced', resolvedPayload);
    io.to(pin).emit('consensus_reached', resolvedPayload);
    io.to(pin).emit('MATCH_FOUND', {
      pin,
      winningOptionId: session.winner.id,
      winning_option: session.winner,
      winner: session.winner,
    });
    return;
  }

  const submissionsArray = Array.from(session.submissions.values());
  if (submissionsArray.length === 0) {
    console.warn(`[Socket] Cannot resolve winner for room ${pin}: 0 submissions`);
    return;
  }

  if (!session.options || session.options.length === 0) {
    console.warn(`[Socket] Cannot resolve winner for room ${pin}: no options`);
    io.to(pin).emit('room_error', { code: 'no_options', message: 'No options available to determine winner' });
    return;
  }

  const tally = session.options.map((o) => {
    let likes = 0;
    let passes = 0;
    for (const sub of submissionsArray) {
      const vote = sub.votes?.find((v) => v.option_id === o.id);
      if (vote) {
        if (vote.score > 0) likes++;
        else if (vote.score < 0) passes++;
      }
    }
    return { option_id: o.id, likes, passes };
  });

  let winningOptionId = null;
  try {
    winningOptionId = calculateSchulzeWinner(submissionsArray);
  } catch (err) {
    console.warn('[Socket] Schulze calculation notice:', err.message);
  }

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

  // Dynamic head-to-head pairwise duel calculation across all submitted ballots
  const rivals = session.options.filter((o) => o.id !== winningOption.id);
  const pairwiseData = rivals.map((rival) => {
    let winVotes = 0;
    let lossVotes = 0;
    for (const sub of submissionsArray) {
      const vWin = sub.votes?.find((v) => v.option_id === winningOption.id)?.score || 0;
      const vRival = sub.votes?.find((v) => v.option_id === rival.id)?.score || 0;
      if (vWin > vRival) winVotes++;
      else if (vRival > vWin) lossVotes++;
    }
    return {
      opponent: rival.name,
      score: `${winVotes}-${lossVotes}`,
      margin: `Beat ${rival.name} (${winVotes}-${lossVotes})`,
    };
  });

  const approvalCount = submissionsArray.filter((sub) =>
    sub.votes?.some((v) => v.option_id === winningOption.id && (v.score === 1 || v.score === 2))
  ).length;
  const approvalRatio = approvalCount / Math.max(1, submissionsArray.length);
  const matchScore = Math.min(98, Math.max(76, Math.round(approvalRatio * 100)));

  session.isResolved = true;
  session.winner = winningOption;
  session.matchScore = matchScore;
  session.pairwise = pairwiseData;
  session.tally = tally;
  session.approvalCount = approvalCount;
  session.totalVoted = submissionsArray.length;

  console.log(`[Socket] Consensus resolved for room ${pin}: "${winningOption.name}" won across ${submissionsArray.length} ballots!`);

  // Immediately mark the room as RESOLVED in PostgreSQL so GET /rooms/:pin reflects completion
  if (prisma?.room) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(winningOption.id || ''));
    prisma.room.updateMany({
      where: { pin },
      data: {
        status: 'RESOLVED',
        ...(isUuid ? { winnerOptionId: winningOption.id } : {}),
      },
    }).catch(() => {});
  }
  const cachedSummary = roomSummaryCache.get(pin);
  if (cachedSummary?.room) {
    cachedSummary.room.status = 'RESOLVED';
  }

  await dispatchActivityNotification('decision_reached', {
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
    matchScore,
    pairwise: pairwiseData,
    tally,
    approval_count: approvalCount,
    total_voted: submissionsArray.length,
  };

  io.to(pin).emit('winner_announced', consensusPayload);
  io.to(pin).emit('consensus_reached', consensusPayload);

  io.to(pin).emit('MATCH_FOUND', {
    pin,
    winningOptionId: winningOption.id,
    winning_option: winningOption,
    winner: winningOption,
  });

  // Evict resolved session and disband lobby after 30 minutes
  const evictionTimer = setTimeout(() => {
    disbandLobby(io, pin, 'Session completed and archived after 30 minutes').catch(() => {});
  }, 30 * 60 * 1000);
  if (evictionTimer.unref) evictionTimer.unref();
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

function initSessionStoreSweep(io) {
  const sweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [pin, lobby] of activeLobbies.entries()) {
      const lastActivity = lobby.lastActivityAt || lobby.createdAt || now;
      if (lobby.size === 0 && !activeVotingSessions.has(pin) && (now - lastActivity > 3 * 60 * 1000)) {
        disbandLobby(io, pin, 'Empty lobby timeout (3 minutes with 0 participants)').catch(() => {});
      } else if (now - lastActivity > 2 * 60 * 60 * 1000) {
        disbandLobby(io, pin, 'Inactive lobby timeout (2 hours without activity)').catch(() => {});
      }
    }
    // Clean orphaned voting sessions without an active lobby older than 2 hours
    for (const [pin, session] of activeVotingSessions.entries()) {
      if (!activeLobbies.has(pin) && (now - (session.lastActivity || now) > 2 * 60 * 60 * 1000)) {
        activeVotingSessions.delete(pin);
      }
    }
  }, 60 * 1000);
  if (sweepInterval.unref) sweepInterval.unref();
  return sweepInterval;
}

module.exports = {
  activeLobbies,
  activeVotingSessions,
  disconnectTimeouts,
  roomSummaryCache,
  getCachedRoomSummary,
  resolveAndBroadcastWinner,
  disbandLobby,
  initSessionStoreSweep,
};
