const { recordSessionBallot } = require('../utils/ballotSubmission');
const { publicParticipant, isSocketMember, isSocketHost } = require('../utils/roomSecurity');
const { dispatchActivityNotification } = require('../utils/storageSafeguard');
const { sanitizeBallot } = require('../utils/ballot');

const startingRooms = new Set();

function registerVotingSocketHandlers(io, socket, store) {
  const {
    activeLobbies,
    activeVotingSessions,
    disconnectTimeouts,
    getCachedRoomSummary,
    resolveAndBroadcastWinner,
    disbandLobby,
  } = store;

  // Direct room join for swipe deck and reconnects (zero DB writes)
  socket.on('join_room', async (data) => {
    const pin = data?.pin;
    const participant_id = data?.participant_id;
    const device_id = data?.device_id;
    if (!isSocketMember(socket, pin, activeLobbies.get(pin), participant_id)) {
      const join = socket.listeners('join_lobby')[0];
      if (join) await join(data);
    }
    const lobby = activeLobbies.get(pin);
    if (!isSocketMember(socket, pin, lobby)) return;
    const effectiveParticipantId = socket.data.participantId;
    const participant = lobby.get(effectiveParticipantId);
    participant.isOnline = true; participant.status = 'online'; participant.lastSeenAt = Date.now();
    lobby.lastActivityAt = Date.now();

    for (const idToClear of [participant_id, effectiveParticipantId]) {
      if (!idToClear) continue;
      const dcKey = `${pin}:${idToClear}`;
      if (disconnectTimeouts.has(dcKey)) {
        clearTimeout(disconnectTimeouts.get(dcKey));
        disconnectTimeouts.delete(dcKey);
      }
    }

    const session = activeVotingSessions.get(pin);
    if (session && session.isResolved && session.winner) {
      const { buildResolvedPayload } = require('./socketSessionStore');
      const resolvedPayload = buildResolvedPayload(pin, session);
      socket.emit('winner_announced', resolvedPayload);
      socket.emit('consensus_reached', resolvedPayload);
    } else if (session) {
      socket.emit('state_restore', {
        pin,
        phase: 'VOTING',
        options: session.options || [],
        topic: session.topic || lobby?.topic || 'Where should we go?',
        mode: session.mode || lobby?.mode || 'DISCOVERY',
        voted_participants: session.submissions.size,
        total_participants: Math.max(session.expectedCount, session.submissions.size),
        already_voted: Boolean(effectiveParticipantId && session.submissions.has(effectiveParticipantId)),
      });
      socket.emit('vote_progress', {
        pin,
        voted_participants: session.submissions.size,
        total_participants: Math.max(session.expectedCount, session.submissions.size),
        votes_received: session.submissions.size,
      });
    }
  });

  const handleHostStartVoting = async (data) => {
    let ownsStart = false;
    try {
      const { pin, host_id, participant_id, host_token, options } = data || {};

      let room = null;
      try {
        room = await getCachedRoomSummary(pin);
      } catch (dbErr) {
        console.warn('[Socket] DB lookup notice in host_start_voting:', dbErr?.message);
      }

      const lobby = activeLobbies.get(pin);
      const resolvedInputOptions = Array.isArray(options)
        ? options
        : (lobby?.suggestions && lobby.suggestions.length > 0 ? lobby.suggestions : null);

      if (!pin || !Array.isArray(resolvedInputOptions)) {
        socket.emit('room_error', { message: 'pin and options are required.' });
        return;
      }

      const callerId = socket.data.participantId;
      const isAuthorized = isSocketHost(socket, pin, lobby, data);

      if (!isAuthorized) {
        console.warn(`[Socket] Unauthorized host_start_voting in room ${pin} by ${callerId}`);
        socket.emit('room_error', { message: 'Only the room host can start voting.' });
        return;
      }

      if (activeVotingSessions.has(pin) || startingRooms.has(pin)) {
        socket.emit('room_error', { message: 'Voting has already started. Rejoin to restore the current session.' });
        return;
      }
      if (resolvedInputOptions.length < 2 || resolvedInputOptions.length > 12 || resolvedInputOptions.some(o => !o || (typeof o !== 'string' && typeof o !== 'object'))) {
        socket.emit('room_error', { message: 'Provide between 2 and 12 valid options.' });
        return;
      }

      startingRooms.add(pin);
      ownsStart = true;

      // Snapshot candidate pool capped strictly at MAX_DECK = 12
      const cappedOptions = resolvedInputOptions.slice(0, 12);
      let roomOptions = cappedOptions.map((opt, idx) => {
        if (typeof opt === 'string') {
          return {
            id: `${room?.id || pin}:opt-${idx}`,
            name: opt.slice(0, 100),
            price_level: 2,
            distance_km: 1.2,
            category: 'Group Suggestion',
            tags: ['Custom'],
            photo_url: null,
          };
        }
        return {
          id: room && !room.optionIds?.includes(opt.id) && String(opt.id || '').startsWith('custom-') ? `${room.id}:${idx}` : String(opt.id || `${room?.id || pin}:opt-${idx}`).slice(0, 100),
          name: String(opt.name || `Option ${idx + 1}`).slice(0, 100),
          price_level: typeof opt.price_level === 'number' ? Math.max(1, Math.min(4, opt.price_level)) : 2,
          distance_km: typeof opt.distance_km === 'number' ? Number(opt.distance_km.toFixed(1)) : 1.2,
          category: String(opt.category || 'Local Venue').slice(0, 60),
          tags: Array.isArray(opt.tags) ? opt.tags.slice(0, 5).map((t) => String(t).slice(0, 30)) : ['Top Pick'],
          address: String(opt.address || 'Central District').slice(0, 120),
          lat: Number.isFinite(opt.lat) ? opt.lat : null,
          lng: Number.isFinite(opt.lng) ? opt.lng : null,
          rating: Number.isFinite(opt.rating) ? opt.rating : null,
          reviews: Number.isFinite(opt.reviews) ? opt.reviews : null,
          isCustom: Boolean(opt.isCustom),
          isRoutablePlace: Boolean(opt.isRoutablePlace),
          photo_url: typeof opt.photo_url === 'string' && opt.photo_url.startsWith('http') ? opt.photo_url : null,
        };
      });

      if (new Set(roomOptions.map(o => o.id)).size !== roomOptions.length) {
        socket.emit('room_error', { message: 'Option identifiers must be unique.' });
        return;
      }
      const { prisma } = require('../../db/helpers');
      if (room) {
        const participants = await prisma.participant.findMany({ where: { roomId: room.id, id: { in: [...lobby.keys()] } } });
        const caps = participants.map(p => p.budgetCap).filter(Number.isInteger);
        if (caps.length && (lobby?.mode || data?.mode) !== 'CUSTOM') {
          const cap = Math.min(...caps);
          roomOptions = roomOptions.filter(o => o.price_level <= cap);
          if (roomOptions.length < 2) { socket.emit('room_error', { message: 'Add at least two places within your group’s price filters.' }); return; }
        }
        await prisma.$transaction(async tx => {
          for (const option of roomOptions) {
            const existing = await tx.option.findUnique({ where: { id: option.id } });
            if (existing && existing.roomId !== room.id) throw new Error('Option belongs to another room');
            if (!existing) await tx.option.create({ data: { id: option.id, roomId: room.id, name: option.name, source: 'USER_CUSTOM', priceLevel: option.price_level } });
          }
          await tx.room.update({ where: { id: room.id }, data: { status: 'VOTING' } });
        });
      }
      const cached = store.roomSummaryCache?.get(pin);
      if (cached?.room) cached.room.status = 'VOTING';

      const topic = lobby?.topic || data?.topic || 'Where should we go?';
      const mode = lobby?.mode || data?.mode || 'DISCOVERY';
      const arenaMode = data?.arenaMode || 'speed_swipe';
      const expectedCount = lobby && lobby.size > 0 ? lobby.size : 1;
      activeVotingSessions.set(pin, {
        pin,
        roomId: room?.id,
        options: roomOptions,
        submissions: new Map(),
        expectedCount,
        isResolved: false,
        isResolving: false,
        winner: null,
        hostId: callerId,
        topic,
        mode,
        arenaMode,
        createdAt: Date.now(),
        eligibleParticipantIds: new Set(lobby.keys()),
      });

      io.to(pin).emit('voting_started', {
        pin,
        options: roomOptions,
        topic,
        mode,
        arenaMode,
        total_participants: expectedCount,
      });

      console.log(`[Socket] Voting started in room ${pin} with ${roomOptions.length} options (quorum: ${expectedCount})`);

      dispatchActivityNotification('voting_started', {
        pin,
        topic,
        mode,
        optionCount: roomOptions.length,
        voterCount: expectedCount,
      }).catch(() => {});
    } catch (error) {
      console.error('[Socket] Failed to start voting:', error.message);
      socket.emit('room_error', { message: 'Failed to start voting.' });
    } finally {
      if (ownsStart) startingRooms.delete(data?.pin);
    }
  };

  socket.on('host_start_voting', handleHostStartVoting);
  socket.on('start_voting', handleHostStartVoting);

  const handleSubmitBallot = async (data) => {
    try {
      const { pin, participant_id, device_id, rankings, votes: rawVotes } = data || {};
      const ballotRankings = Array.isArray(rankings) ? rankings : (Array.isArray(rawVotes) ? rawVotes : null);
      const lobby = activeLobbies.get(pin);
      if (!isSocketMember(socket, pin, lobby, participant_id)) {
        socket.emit('ballot_error', { code: 'FORBIDDEN', message: 'Join this room with your own identity before voting.' });
        return;
      }
      const effectiveParticipantId = socket.data.participantId;
      const cleanDeviceId = socket.data.deviceId;
      const session = activeVotingSessions.get(pin);
      if (!session || session.isResolved || session.isResolving || session.submissions.has(effectiveParticipantId)) return;
      if (session.eligibleParticipantIds && !session.eligibleParticipantIds.has(effectiveParticipantId)) return;

      // Ballot Validation & Sanitization (Enforces 1 Veto, 1 Superlike, valid options, unseen cards)
      const validOptionIds = session.options && session.options.length > 0
        ? session.options.map((o) => o.id)
        : ballotRankings.map((r) => r.option_id || r.optionId).filter(Boolean);

      let sanitizedVotesMap = null;
      try {
        sanitizedVotesMap = sanitizeBallot(ballotRankings, validOptionIds);
      } catch (validationErr) {
        console.warn(`[Socket] Ballot rejected in room ${pin} from ${effectiveParticipantId}:`, validationErr.message);
        socket.emit('ballot_error', { code: validationErr.code || 'BAD_BALLOT', message: validationErr.message });
        return;
      }

      const votes = Array.from(sanitizedVotesMap.entries()).map(([option_id, score]) => ({
        option_id,
        score,
      }));

      if (votes.length === 0) return;

      if (!await recordSessionBallot(session, effectiveParticipantId, votes)) return;

      const votedCount = session.submissions.size;
      const totalCount = Math.max(session.expectedCount, votedCount);

      io.to(pin).emit('vote_progress', {
        pin,
        voted_participants: votedCount,
        total_participants: totalCount,
        votes_received: votedCount,
        voted_participant_ids: Array.from(session.submissions.keys()),
      });

      if (votedCount >= totalCount && !session.isResolved && !session.isResolving) {
        await resolveAndBroadcastWinner(io, pin);
      }
    } catch (err) {
      console.error('[Socket] submit_ballot error:', err.message);
      socket.emit('ballot_error', { code: 'SAVE_FAILED', message: 'Your vote could not be saved. Please try again.' });
    }
  };

  socket.on('submit_ballot', handleSubmitBallot);
  socket.on('submit_votes', handleSubmitBallot);
  socket.on('submit_Votes', handleSubmitBallot);

  // Quick Runner-Up Rematch handler (advances pointer in precomputed Condorcet ranking)
  const handleQuickRematch = async (data) => {
    try {
      const pin = data?.pin || socket.data.pin;
      if (!isSocketHost(socket, pin, activeLobbies.get(pin), data)) return;
      const session = activeVotingSessions.get(pin);
      if (!session || !session.isResolved || !Array.isArray(session.ranking) || session.ranking.length <= 1) {
        return;
      }
      let nextIdx = (session.rankingIndex || 0) + 1;
      while (nextIdx < session.ranking.length && session.ranking[nextIdx]?.vetoed) {
        nextIdx++;
      }
      if (nextIdx >= session.ranking.length) {
        nextIdx = 0;
      }
      session.rankingIndex = nextIdx;
      const nextWinner = session.ranking[nextIdx];
      session.winner = nextWinner;
      session.status = 'RUNNER_UP';
      if (session.roomId) {
        const { prisma } = require('../../db/helpers');
        await prisma.room.update({ where: { id: session.roomId }, data: { winnerOptionId: nextWinner.id } });
      }

      const liked = session.submissions.size ? Array.from(session.submissions.values()).filter(s => s.votes.some(v => v.option_id === nextWinner.id && v.score > 0)).length : 0;
      session.support = { liked, total: session.submissions.size };
      session.approvalCount = liked;
      session.vetoCount = nextWinner.vetoCount || 0;
      session.supportText = `${liked} of ${session.submissions.size} liked · ${session.vetoCount} vetoes`;
      session.matchScore = Math.round(100 * liked / Math.max(1, session.submissions.size));
      session.pairwise = [];
      const { buildResolvedPayload } = require('./socketSessionStore');
      const payload = { ...buildResolvedPayload(pin, session), rankingIndex: nextIdx, isRematch: true };

      io.to(pin).emit('winner_announced', payload);
      io.to(pin).emit('consensus_reached', payload);
      io.to(pin).emit('MATCH_FOUND', payload);
    } catch (err) {
      console.error('[Socket] quick_rematch error:', err.message);
    }
  };

  socket.on('quick_rematch', handleQuickRematch);
  socket.on('runner_up_rematch', handleQuickRematch);

  // Safe removal of stalled/offline participant by host
  socket.on('remove_participant', async (data) => {
    const pin = data?.pin || socket.data.pin;
    const targetParticipantId = data?.participant_id;
    const callerId = socket.data.participantId;
    if (!pin || !targetParticipantId) return;

    const lobby = activeLobbies.get(pin);
    const isAuthorized = isSocketHost(socket, pin, lobby, data);

    if (!isAuthorized) {
      socket.emit('room_error', { message: 'Only the host can remove participants.' });
      return;
    }

    if (!lobby?.has(targetParticipantId) || targetParticipantId === callerId) return;
    if (lobby) {
      if (!lobby.removedDeviceIds) lobby.removedDeviceIds = new Set();
      lobby.removedDeviceIds.add(lobby.get(targetParticipantId).deviceId);
      const sessionForRemoval = activeVotingSessions.get(pin);
      sessionForRemoval?.eligibleParticipantIds?.delete(targetParticipantId);
      lobby.delete(targetParticipantId);
      store.afterCommit(() => { io.in?.(pin).fetchSockets().then(sockets => {
        for (const peer of sockets) if (peer.data.participantId === targetParticipantId) { peer.leave(pin); peer.data = {}; }
      }).catch(() => {}); });
      io.to(pin).emit('lobby_roster_update', {
        pin,
        participants: Array.from(lobby.values()).map(publicParticipant),
        total_participants: lobby.size,
      });
    }

    const session = activeVotingSessions.get(pin);
    if (session) {
      session.submissions.delete(targetParticipantId);
      session.expectedCount = Math.max(1, (session.expectedCount || 1) - 1);
      const votedCount = session.submissions.size;
      const totalCount = Math.max(session.expectedCount, votedCount);

      io.to(pin).emit('vote_progress', {
        pin,
        voted_participants: votedCount,
        total_participants: totalCount,
        votes_received: votedCount,
        voted_participant_ids: Array.from(session.submissions.keys()),
      });

      if (votedCount >= totalCount && !session.isResolved && !session.isResolving) {
        await resolveAndBroadcastWinner(io, pin);
      }
    }
  });

  const handleForceResolve = async (data) => {
    try {
      const pin = data?.pin || socket.data.pin;
      const isAuthorized = isSocketHost(socket, pin, activeLobbies.get(pin), data);

      if (!isAuthorized) {
        socket.emit('room_error', { message: 'Only the room host can force consensus reveal.' });
        return;
      }
      await resolveAndBroadcastWinner(io, pin);
    } catch (err) {
      console.error('[Socket] host_force_reveal error:', err.message);
    }
  };

  socket.on('host_force_reveal', handleForceResolve);
  socket.on('host_force_resolve', handleForceResolve);

  const handleParticipantLeave = async (data) => {
    const pin = data?.pin || socket.data.pin;
    const participantId = socket.data.participantId;
    if (!isSocketMember(socket, pin, activeLobbies.get(pin), data?.participant_id)) return;
    const userName = data?.user_name || socket.data.userName || 'Guest';

    if (pin) {
      socket.leave(pin);
      socket.data = {};

      const dcKey = `${pin}:${participantId}`;
      if (disconnectTimeouts.has(dcKey)) {
        clearTimeout(disconnectTimeouts.get(dcKey));
        disconnectTimeouts.delete(dcKey);
      }

      const lobby = activeLobbies.get(pin);
      if (lobby) {
        const wasHost = Boolean(lobby.get(participantId)?.isHost);
        lobby.delete(participantId);

        if (lobby.size === 0 && !activeVotingSessions.has(pin)) {
          await disbandLobby(io, pin, 'All participants left the room');
        } else if (wasHost && lobby.size > 0) {
          const remaining = Array.from(lobby.values());
          if (!remaining.some((p) => p.isHost)) {
            remaining[0].isHost = true;
            lobby.hostId = remaining[0].id;
            await store.persistHostMigration?.(pin, remaining[0]);
            lobby.set(remaining[0].id, remaining[0]);
          }
        }
      }

      const session = activeVotingSessions.get(pin);
      if (session && !session.isResolved) {
        if (!session.submissions.has(participantId)) {
          session.expectedCount = Math.max(session.submissions.size, Math.max(1, session.expectedCount - 1));
        }
        if (session.submissions.size > 0 && session.submissions.size >= session.expectedCount) {
          await resolveAndBroadcastWinner(io, pin);
        } else {
          io.to(pin).emit('vote_progress', {
            pin,
            voted_participants: session.submissions.size,
            total_participants: session.expectedCount,
            votes_received: session.submissions.size,
            voted_participant_ids: Array.from(session.submissions.keys()),
          });
        }
      }

      const remainingParticipants = lobby ? Array.from(lobby.values()).map(publicParticipant) : [];
      const newHost = remainingParticipants.find((p) => p.isHost);

      io.to(pin).emit('participant_left', {
        pin,
        participant_id: participantId,
        user_name: userName,
        host_id: newHost ? newHost.id : null,
        total_participants: remainingParticipants.length,
        participants: remainingParticipants,
      });

      if (lobby && lobby.size === 0 && !activeVotingSessions.has(pin)) {
        await disbandLobby(io, pin, 'All participants left the room');
      }
    }
  };

  socket.on('heartbeat', (data) => {
    const pin = data?.pin || socket.data.pin;
    const participantId = socket.data.participantId;
    if (!isSocketMember(socket, pin, activeLobbies.get(pin), data?.participant_id)) return;
    if (!pin || !participantId) return;
    const lobby = activeLobbies.get(pin);
    if (lobby && lobby.has(participantId)) {
      lobby.lastActivityAt = Date.now();
      const p = lobby.get(participantId);
      p.isOnline = true;
      p.status = 'online';
      p.lastSeenAt = Date.now();
    }
  });

  socket.on('leave_lobby', handleParticipantLeave);
  socket.on('leave_room', handleParticipantLeave);

  socket.on('disconnect', async () => {
    const pin = socket.data.pin;
    const participantId = socket.data.participantId;
    const userName = socket.data.userName || 'Guest';

    if (!pin || !participantId) return;
    const peers = await io.in(pin).fetchSockets();
    if (peers.some(p => p.data.participantId === participantId)) return;

    const lobby = activeLobbies.get(pin);
    if (lobby) {
      const p = lobby.get(participantId);
      if (p) {
        p.isOnline = false;
        p.status = 'away';
        p.lastSeenAt = Date.now();
      }

      io.to(pin).emit('participant_status_changed', {
        pin,
        participant_id: participantId,
        user_name: userName,
        status: 'away',
      });

      const dcKey = `${pin}:${participantId}`;
      if (disconnectTimeouts.has(dcKey)) {
        clearTimeout(disconnectTimeouts.get(dcKey));
      }

      // Check host failover after 45s if host dropped
      const timeout = setTimeout(() => store.withRoomState(pin, async () => {
        disconnectTimeouts.delete(dcKey);
        const currentLobby = activeLobbies.get(pin);
        if (currentLobby) {
          const participant = currentLobby.get(participantId);
          if (participant && !participant.isOnline) {
            participant.status = 'offline';
            io.to(pin).emit('participant_status_changed', {
              pin,
              participant_id: participantId,
              user_name: userName,
              status: 'offline',
            });
          }

          const wasHost = Boolean(participant?.isHost);
          if (wasHost) {
            const onlineParticipants = Array.from(currentLobby.values()).filter((m) => m.isOnline);
            if (onlineParticipants.length > 0 && !onlineParticipants.some((m) => m.isHost)) {
              const newHostCandidate = onlineParticipants[0];
              newHostCandidate.isHost = true;
              currentLobby.hostId = newHostCandidate.id;
              await store.persistHostMigration?.(pin, newHostCandidate);
              if (participant) participant.isHost = false;
              currentLobby.set(newHostCandidate.id, newHostCandidate);

              io.to(pin).emit('host_migrated', {
                pin,
                new_host_id: newHostCandidate.id,
                new_host_name: newHostCandidate.name,
              });
            }
          }
        }
      }).catch(() => {}), Number(process.env.DISCONNECT_GRACE_MS) || 45000);
      if (timeout.unref) timeout.unref();

      disconnectTimeouts.set(dcKey, timeout);
    }
  });
}

module.exports = {
  registerVotingSocketHandlers,
};
