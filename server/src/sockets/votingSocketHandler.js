const { verifyHostToken } = require('../utils/hostAuth');
const { dispatchActivityNotification } = require('../utils/storageSafeguard');

const ALLOWED_BALLOT_SCORES = new Set([1, -1, -100, 2]);

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
  socket.on('join_room', (data) => {
    const pin = data?.pin;
    const participant_id = data?.participant_id;
    const device_id = data?.device_id;
    if (!pin) return;

    socket.join(pin);
    socket.data.pin = pin;

    const lobby = activeLobbies.get(pin);
    const cleanDeviceId = device_id && typeof device_id === 'string' ? device_id.trim().slice(0, 64) : null;
    let effectiveParticipantId = participant_id;
    if (cleanDeviceId && lobby?.deviceToParticipantId?.has(cleanDeviceId)) {
      effectiveParticipantId = lobby.deviceToParticipantId.get(cleanDeviceId);
    }
    if (effectiveParticipantId) socket.data.participantId = effectiveParticipantId;
    if (cleanDeviceId) socket.data.deviceId = cleanDeviceId;

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
      socket.emit('winner_announced', {
        pin,
        winning_option: session.winner,
        winningOptionId: session.winner.id,
        winner: session.winner,
        matchScore: session.matchScore || 96,
        pairwise: session.pairwise || [],
        tally: session.tally || [],
        approval_count: session.approvalCount ?? 0,
        total_voted: session.totalVoted ?? session.submissions.size,
      });
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

  socket.on('host_start_voting', async (data) => {
    try {
      const { pin, host_id, host_token, options } = data || {};

      if (!pin || !Array.isArray(options)) {
        socket.emit('room_error', { message: 'pin and options are required.' });
        return;
      }

      let room = null;
      try {
        room = await getCachedRoomSummary(pin);
      } catch (dbErr) {
        console.warn('[Socket] DB lookup notice in host_start_voting:', dbErr?.message);
      }

      const lobby = activeLobbies.get(pin);
      const callerId = socket.data.participantId || host_id;
      const tokenToCheck = host_token || socket.data.hostToken;
      const hasVerifiedToken = Boolean(tokenToCheck && callerId && verifyHostToken(pin, callerId, tokenToCheck));
      const isAuthorized = hasVerifiedToken || Boolean(
        socket.data.isHost && (socket.data.hostToken || (lobby && lobby.get(callerId)?.isHost))
      );

      if (!isAuthorized) {
        console.warn(`[Socket] Unauthorized host_start_voting in room ${pin} by ${callerId}`);
        socket.emit('room_error', { message: 'Only the room host can start voting.' });
        return;
      }

      const cappedOptions = options.slice(0, 50);
      let roomOptions = cappedOptions.map((opt, idx) => {
        if (typeof opt === 'string') {
          return {
            id: `opt-${idx}`,
            name: opt.slice(0, 100),
            price_level: 2,
            distance_km: 1.2,
            category: 'Group Suggestion',
            tags: ['Custom'],
            photo_url: null,
          };
        }
        return {
          id: String(opt.id || `opt-${idx}`).slice(0, 64),
          name: String(opt.name || `Option ${idx + 1}`).slice(0, 100),
          price_level: typeof opt.price_level === 'number' ? Math.max(1, Math.min(4, opt.price_level)) : 2,
          distance_km: typeof opt.distance_km === 'number' ? Number(opt.distance_km.toFixed(1)) : 1.2,
          category: String(opt.category || 'Local Venue').slice(0, 60),
          tags: Array.isArray(opt.tags) ? opt.tags.slice(0, 5).map((t) => String(t).slice(0, 30)) : ['Top Pick'],
          address: String(opt.address || 'Central District').slice(0, 120),
          photo_url: typeof opt.photo_url === 'string' && opt.photo_url.startsWith('http') ? opt.photo_url : null,
        };
      });

      const topic = lobby?.topic || data?.topic || 'Where should we go?';
      const mode = lobby?.mode || data?.mode || 'DISCOVERY';
      const arenaMode = data?.arenaMode || 'speed_swipe';
      const expectedCount = lobby && lobby.size > 0 ? lobby.size : 1;
      activeVotingSessions.set(pin, {
        pin,
        options: roomOptions,
        submissions: new Map(),
        expectedCount,
        isResolved: false,
        winner: null,
        hostId: callerId,
        topic,
        mode,
        arenaMode,
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
    }
  });

  socket.on('submit_ballot', async (data) => {
    try {
      const { pin, participant_id, device_id, rankings } = data || {};
      if (!pin || !participant_id || !Array.isArray(rankings)) return;

      const lobby = activeLobbies.get(pin);
      const cleanDeviceId = device_id && typeof device_id === 'string' ? device_id.trim().slice(0, 64) : socket.data.deviceId;
      const mappedId = cleanDeviceId && lobby?.deviceToParticipantId?.get(cleanDeviceId);
      const effectiveParticipantId = mappedId || socket.data.participantId || participant_id;

      if (socket.data.participantId && socket.data.participantId !== participant_id && socket.data.participantId !== effectiveParticipantId) {
        console.warn(`[Socket] Mismatched participant_id in submit_ballot: caller=${socket.data.participantId}, claimed=${participant_id}`);
        return;
      }

      let session = activeVotingSessions.get(pin);
      if (!session) {
        session = {
          pin,
          options: [],
          submissions: new Map(),
          expectedCount: activeLobbies.get(pin)?.size || 1,
          isResolved: false,
          winner: null,
        };
        activeVotingSessions.set(pin, session);
      }

      const votes = rankings
        .slice(0, 50)
        .filter((r) => r && typeof r.option_id === 'string' && ALLOWED_BALLOT_SCORES.has(Number(r.score)))
        .map((r) => ({
          option_id: String(r.option_id).slice(0, 64),
          score: Number(r.score),
        }));

      if (votes.length === 0) return;

      session.submissions.set(effectiveParticipantId, {
        participant_id: effectiveParticipantId,
        device_id: cleanDeviceId || null,
        votes,
      });

      const votedCount = session.submissions.size;
      const totalCount = Math.max(session.expectedCount, lobby ? lobby.size : 0, votedCount);

      io.to(pin).emit('vote_progress', {
        pin,
        voted_participants: votedCount,
        total_participants: totalCount,
        votes_received: votedCount,
        voted_participant_ids: Array.from(session.submissions.keys()),
      });

      if (votedCount >= totalCount && !session.isResolved) {
        await resolveAndBroadcastWinner(io, pin);
      }
    } catch (err) {
      console.error('[Socket] submit_ballot error:', err.message);
    }
  });

  const handleForceResolve = async (data) => {
    try {
      const pin = data?.pin || socket.data.pin;
      const callerId = data?.host_id || socket.data.participantId;
      const tokenToCheck = data?.host_token || socket.data.hostToken;
      const lobby = activeLobbies.get(pin);
      const hasVerifiedToken = Boolean(tokenToCheck && callerId && verifyHostToken(pin, callerId, tokenToCheck));
      const isAuthorized = hasVerifiedToken || Boolean(
        socket.data.isHost && (socket.data.hostToken || (lobby && lobby.get(callerId)?.isHost))
      );

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

  const handleParticipantLeave = (data) => {
    const pin = data?.pin || socket.data.pin;
    const participantId = data?.participant_id || socket.data.participantId;
    const userName = data?.user_name || socket.data.userName || 'Guest';

    if (pin) {
      socket.leave(pin);
      socket.data.pin = null;

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
          activeLobbies.delete(pin);
        } else if (wasHost && lobby.size > 0) {
          const remaining = Array.from(lobby.values());
          if (!remaining.some((p) => p.isHost)) {
            remaining[0].isHost = true;
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
          resolveAndBroadcastWinner(io, pin).catch(() => {});
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

      const remainingParticipants = lobby ? Array.from(lobby.values()) : [];
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
        disbandLobby(io, pin, 'All participants left the room').catch(() => {});
      }
    }
  };

  socket.on('leave_lobby', handleParticipantLeave);
  socket.on('leave_room', handleParticipantLeave);

  socket.on('disconnect', () => {
    const pin = socket.data.pin;
    const participantId = socket.data.participantId;
    const userName = socket.data.userName || 'Guest';

    if (!pin || !participantId) return;

    const lobby = activeLobbies.get(pin);
    if (lobby) {
      const p = lobby.get(participantId);
      if (p) p.isOnline = false;

      const dcKey = `${pin}:${participantId}`;
      if (disconnectTimeouts.has(dcKey)) {
        clearTimeout(disconnectTimeouts.get(dcKey));
      }

      const timeout = setTimeout(() => {
        disconnectTimeouts.delete(dcKey);
        const currentLobby = activeLobbies.get(pin);
        if (currentLobby) {
          const wasHost = Boolean(currentLobby.get(participantId)?.isHost);
          currentLobby.delete(participantId);

          if (currentLobby.size === 0 && !activeVotingSessions.has(pin)) {
            disbandLobby(io, pin, 'All participants disconnected').catch(() => {});
          } else if (wasHost && currentLobby.size > 0) {
            const remaining = Array.from(currentLobby.values());
            if (!remaining.some((p) => p.isHost)) {
              remaining[0].isHost = true;
              currentLobby.set(remaining[0].id, remaining[0]);
            }
          }

          const remainingParticipants = Array.from(currentLobby.values());
          const newHost = remainingParticipants.find((p) => p.isHost);

          io.to(pin).emit('participant_left', {
            pin,
            participant_id: participantId,
            user_name: userName,
            host_id: newHost ? newHost.id : null,
            total_participants: remainingParticipants.length,
            participants: remainingParticipants,
          });
        }
      }, 10000);

      disconnectTimeouts.set(dcKey, timeout);
    }
  });
}

module.exports = {
  registerVotingSocketHandlers,
};
