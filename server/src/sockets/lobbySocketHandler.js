const { verifyHostToken } = require('../utils/hostAuth');
const { createParticipantWithId } = require('../../db/helpers');

function registerLobbySocketHandlers(io, socket, store) {
  const {
    activeLobbies,
    activeVotingSessions,
    disconnectTimeouts,
    roomSummaryCache,
    getCachedRoomSummary,
  } = store;

  function isCallerHost( lobby, pin, data) {
    const callerId = data?.participant_id || socket.data.participantId;
    const tokenToCheck = data?.host_token || socket.data.hostToken;
    if (tokenToCheck && callerId && verifyHostToken(pin, callerId, tokenToCheck)) {
      return true;
    }
    if (socket.data.isHost) {
      return true;
    }
    if (lobby && callerId && lobby.get(callerId)?.isHost) {
      return true;
    }
    const cachedRoom = roomSummaryCache?.get(pin)?.room;
    if (cachedRoom && callerId && cachedRoom.hostId === callerId) {
      return true;
    }
    return false;
  }

  // Handle lobby join - join the socket room and emit participant_joined with full roster
  socket.on('join_lobby', async (data) => {
    try {
      const { pin, participant_id, device_id, user_name, host_token } = data || {};
      const cleanDeviceId = device_id && typeof device_id === 'string' ? device_id.trim().slice(0, 64) : null;

      if (!pin || !participant_id || !/^\d{4}$/.test(String(pin))) {
        socket.emit('room_error', {
          message: 'Valid 4-digit pin and participant_id are required.',
        });
        return;
      }

      socket.join(pin);

      let room = null;
      try {
        room = await getCachedRoomSummary(pin);
      } catch (dbErr) {
        console.warn('[Socket] DB lookup notice:', dbErr?.message);
      }

      if (!room && !activeLobbies.has(pin) && !activeVotingSessions.has(pin)) {
        socket.emit('room_error', {
          message: 'Room not found. Please verify your PIN.',
        });
        return;
      }

      if (!activeLobbies.has(pin)) {
        const map = new Map();
        map.suggestions = Array.isArray(data?.initial_suggestions) ? [...data.initial_suggestions] : [];
        map.persistedParticipants = new Set();
        map.deviceToParticipantId = new Map();
        map.mode = data?.mode || (room?.theme?.startsWith('custom') ? 'CUSTOM' : 'DISCOVERY');
        map.topic = data?.topic || (room?.theme?.startsWith('custom:') ? room.theme.replace(/^custom:/, '') : 'Where should we go?');
        map.groupSize = data?.group_size || 4;
        map.visiblePlacesCount = data?.visible_places_count || 6;
        map.createdAt = Date.now();
        map.lastActivityAt = Date.now();
        activeLobbies.set(pin, map);
      }
      const lobby = activeLobbies.get(pin);
      lobby.lastActivityAt = Date.now();
      if (!lobby.visiblePlacesCount) lobby.visiblePlacesCount = 6;
      if (data?.visible_places_count && data.visible_places_count > lobby.visiblePlacesCount) {
        lobby.visiblePlacesCount = data.visible_places_count;
      }
      if (!lobby.persistedParticipants) lobby.persistedParticipants = new Set();
      if (!lobby.deviceToParticipantId) lobby.deviceToParticipantId = new Map();

      // Enforce per-room device idempotency: if the same device rejoins the room (e.g., refresh or switching from In-App Browser to Safari/Chrome), reuse its existing participant slot.
      let effectiveParticipantId = participant_id;
      if (cleanDeviceId && lobby.deviceToParticipantId.has(cleanDeviceId)) {
        effectiveParticipantId = lobby.deviceToParticipantId.get(cleanDeviceId);
      }

      if (room && (!lobby.persistedParticipants.has(effectiveParticipantId) || (cleanDeviceId && !lobby.deviceToParticipantId.has(cleanDeviceId)))) {
        lobby.persistedParticipants.add(effectiveParticipantId);
        if (cleanDeviceId) {
          lobby.deviceToParticipantId.set(cleanDeviceId, effectiveParticipantId);
        }
        try {
          const persisted = await createParticipantWithId(room.id, effectiveParticipantId, null, cleanDeviceId);
          if (persisted && persisted.id) {
            effectiveParticipantId = persisted.id;
            lobby.persistedParticipants.add(effectiveParticipantId);
            if (cleanDeviceId) {
              lobby.deviceToParticipantId.set(cleanDeviceId, effectiveParticipantId);
            }
          }
        } catch {
          // Non-fatal if DB is unreachable in local/offline mode
        }
      } else if (cleanDeviceId) {
        lobby.deviceToParticipantId.set(cleanDeviceId, effectiveParticipantId);
      }

      // Clean up any stale slot if the client initially generated a different temporary UUID before resolving its device-linked participant ID
      if (effectiveParticipantId !== participant_id && lobby.has(participant_id)) {
        const prevEntry = lobby.get(participant_id);
        lobby.delete(participant_id);
        if (!lobby.has(effectiveParticipantId)) {
          lobby.set(effectiveParticipantId, { ...prevEntry, id: effectiveParticipantId });
        }
      }

      socket.data.pin = pin;
      socket.data.participantId = effectiveParticipantId;
      socket.data.deviceId = cleanDeviceId;
      socket.data.userName = user_name || 'Guest';

      for (const idToClear of [participant_id, effectiveParticipantId]) {
        const dcKey = `${pin}:${idToClear}`;
        if (disconnectTimeouts.has(dcKey)) {
          clearTimeout(disconnectTimeouts.get(dcKey));
          disconnectTimeouts.delete(dcKey);
        }
      }

      const hasVerifiedHostToken = Boolean(
        host_token && (verifyHostToken(pin, effectiveParticipantId, host_token) || verifyHostToken(pin, participant_id, host_token))
      );
      const isHost = hasVerifiedHostToken || Boolean(
        room && ((room.hostId && room.hostId === effectiveParticipantId) || (cleanDeviceId && room.hostDeviceId === cleanDeviceId))
      );

      if (data?.mode) lobby.mode = data.mode;
      const cleanDataTopic = data?.topic && data.topic !== 'custom' && data.topic !== 'poll' ? data.topic : null;
      const cleanRoomTopic = room?.theme?.startsWith('custom:') ? room.theme.replace(/^custom:/, '') : null;
      if (cleanDataTopic) {
        lobby.topic = cleanDataTopic;
      } else if (cleanRoomTopic && cleanRoomTopic !== 'custom' && cleanRoomTopic !== 'poll' && (!lobby.topic || lobby.topic === 'Where should we go?' || lobby.topic === 'custom')) {
        lobby.topic = cleanRoomTopic;
      }
      if (data?.group_size) lobby.groupSize = data.group_size;
      if (data?.deck_size && (!lobby.visiblePlacesCount || hasVerifiedHostToken)) {
        lobby.visiblePlacesCount = Math.max(4, Math.min(50, parseInt(data.deck_size, 10) || 12));
      }
      if (!lobby.suggestions) lobby.suggestions = [];
      if (lobby.suggestions.length === 0 && Array.isArray(data?.initial_suggestions) && data.initial_suggestions.length > 0) {
        lobby.suggestions = [...data.initial_suggestions];
      }

      socket.data.isHost = isHost;
      socket.data.hostToken = hasVerifiedHostToken ? host_token : null;

      const existing = lobby.get(effectiveParticipantId);
      const participantRecord = {
        id: effectiveParticipantId,
        deviceId: cleanDeviceId || existing?.deviceId || null,
        name: user_name || existing?.name || 'Guest',
        isHost: isHost || Boolean(existing?.isHost),
        isOnline: true,
        budgetSealed: existing ? Boolean(existing.budgetSealed) : false,
        budgetLimit: existing ? existing.budgetLimit : null,
      };
      lobby.set(effectiveParticipantId, participantRecord);

      const participantsList = Array.from(lobby.values());
      const hostId = room ? room.hostId : (participantsList.find((p) => p.isHost)?.id || null);

      io.to(pin).emit('participant_joined', {
        pin,
        participant_id: effectiveParticipantId,
        claimed_participant_id: participant_id,
        device_id: cleanDeviceId,
        user_name: participantRecord.name,
        host_id: hostId,
        participants: participantsList,
        mode: lobby.mode || 'DISCOVERY',
        topic: lobby.topic || 'Where should we go?',
        group_size: lobby.groupSize || 4,
        suggestions: lobby.suggestions || [],
        visible_places_count: lobby.visiblePlacesCount || 6,
        removed_place_ids: Array.from(lobby.removedOptionIds || []),
      });

      socket.emit('lobby_state', {
        pin,
        participant_id: effectiveParticipantId,
        claimed_participant_id: participant_id,
        device_id: cleanDeviceId,
        host_id: hostId,
        participants: participantsList,
        mode: lobby.mode || 'DISCOVERY',
        topic: lobby.topic || 'Where should we go?',
        group_size: lobby.groupSize || 4,
        suggestions: lobby.suggestions || [],
        visible_places_count: lobby.visiblePlacesCount || 6,
        removed_place_ids: Array.from(lobby.removedOptionIds || []),
      });

      const activeSession = activeVotingSessions.get(pin);
      if (activeSession) {
        if (activeSession.isResolved && activeSession.winner) {
          socket.emit('winner_announced', {
            pin,
            winning_option: activeSession.winner,
            winningOptionId: activeSession.winner.id,
            winner: activeSession.winner,
            matchScore: activeSession.matchScore || 96,
            pairwise: activeSession.pairwise || [],
            total_voted: activeSession.submissions.size,
          });
        } else {
          activeSession.expectedCount = Math.max(activeSession.expectedCount, lobby.size);
          socket.emit('voting_started', {
            pin,
            options: activeSession.options,
            topic: activeSession.topic || lobby.topic || 'Where should we go?',
            mode: activeSession.mode || lobby.mode || 'DISCOVERY',
          });
        }
      }

      console.log(`[Socket] ${user_name || 'Guest'} joined room ${pin} (Lobby count: ${lobby.size})`);
    } catch (error) {
      console.error('[Socket] join_lobby error:', error.message);
      socket.emit('room_error', { message: 'Failed to join room.' });
    }
  });

  socket.on('add_suggestion', (data) => {
    try {
      const { pin, suggestion, user_name, participant_id } = data || {};
      if (!pin || !suggestion) return;
      const lobby = activeLobbies.get(pin);
      const isJoinedParticipant = Boolean(lobby && participant_id && lobby.has(participant_id));
      if (!isCallerHost(lobby, pin, data) && !isJoinedParticipant) {
        socket.emit('room_error', { message: 'Join the room first to add options.' });
        return;
      }
      const clean = String(suggestion).trim().slice(0, 120);
      if (!clean) return;

      if (lobby) {
        if (!lobby.suggestions) lobby.suggestions = [];
        if (lobby.suggestions.length >= 50) return;
        if (!lobby.suggestions.some((s) => s.toLowerCase() === clean.toLowerCase())) {
          lobby.suggestions.push(clean);
          io.to(pin).emit('suggestions_updated', {
            pin,
            suggestions: lobby.suggestions,
            added: clean,
            user_name: user_name || 'Friend',
          });
        }
      }
    } catch (err) {
      console.error('[Socket] add_suggestion error:', err.message);
    }
  });

  socket.on('remove_suggestion', (data) => {
    try {
      const { pin, suggestion } = data || {};
      if (!pin || !suggestion) return;
      const lobby = activeLobbies.get(pin);
      if (!isCallerHost(lobby, pin, data)) {
        socket.emit('room_error', { message: 'Only the room host can remove options.' });
        return;
      }
      const clean = String(suggestion).trim();

      if (lobby && lobby.suggestions) {
        lobby.suggestions = lobby.suggestions.filter((s) => s.toLowerCase() !== clean.toLowerCase());
        io.to(pin).emit('suggestions_updated', {
          pin,
          suggestions: lobby.suggestions,
          removed: clean,
        });
      }
    } catch (err) {
      console.error('[Socket] remove_suggestion error:', err.message);
    }
  });

  socket.on('add_discovery_place', (data) => {
    try {
      const { pin, count } = data || {};
      if (!pin) return;
      let lobby = activeLobbies.get(pin);
      if (!isCallerHost(lobby, pin, data)) {
        socket.emit('room_error', { message: 'Only the room host can add places.' });
        return;
      }
      if (!lobby) {
        lobby = new Map();
        lobby.visiblePlacesCount = 12;
        activeLobbies.set(pin, lobby);
      }
      const inc = Math.max(1, Math.min(50, parseInt(count, 10) || 1));
      lobby.visiblePlacesCount = Math.min(50, (lobby.visiblePlacesCount || 6) + inc);
      io.to(pin).emit('table_places_updated', {
        pin,
        visiblePlacesCount: lobby.visiblePlacesCount,
        removedOptionIds: Array.from(lobby.removedOptionIds || []),
      });
    } catch (err) {
      console.error('[Socket] add_discovery_place error:', err.message);
    }
  });

  socket.on('remove_discovery_place', (data) => {
    try {
      const { pin, option_id } = data || {};
      if (!pin) return;
      let lobby = activeLobbies.get(pin);
      if (!isCallerHost(lobby, pin, data)) {
        socket.emit('room_error', { message: 'Only the room host can remove places.' });
        return;
      }
      if (!lobby) {
        lobby = new Map();
        lobby.visiblePlacesCount = 6;
        activeLobbies.set(pin, lobby);
      }
      if (!lobby.removedOptionIds) lobby.removedOptionIds = new Set();
      if (option_id) lobby.removedOptionIds.add(String(option_id));
      io.to(pin).emit('table_places_updated', {
        pin,
        visiblePlacesCount: lobby.visiblePlacesCount,
        removedOptionId: option_id,
        removedOptionIds: Array.from(lobby.removedOptionIds),
      });
    } catch (err) {
      console.error('[Socket] remove_discovery_place error:', err.message);
    }
  });

  socket.on('update_budget', (data) => {
    try {
      const { pin, participant_id, budgetSealed, budgetLimit } = data;
      if (!pin || !participant_id) return;

      const lobby = activeLobbies.get(pin);
      if (lobby && lobby.has(participant_id)) {
        const p = lobby.get(participant_id);
        p.budgetSealed = Boolean(budgetSealed);
        if (budgetLimit !== undefined) p.budgetLimit = budgetLimit;

        io.to(pin).emit('budget_updated', {
          pin,
          participant_id,
          budgetSealed: p.budgetSealed,
          budgetLimit: p.budgetLimit,
          participants: Array.from(lobby.values()),
        });
      }
    } catch (err) {
      console.error('[Socket] update_budget error:', err.message);
    }
  });

  socket.on('send_reaction', (data) => {
    try {
      const { pin, emoji, user_name, participant_id } = data || {};
      if (!pin || !emoji) return;
      io.to(pin).emit('reaction_received', {
        id: `rx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        pin,
        emoji: String(emoji).slice(0, 16),
        user_name: String(user_name || socket.data.userName || 'Friend').slice(0, 40),
        participant_id: participant_id || socket.data.participantId,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('[Socket] send_reaction error:', err?.message);
    }
  });

  socket.on('voting_step_progress', (data) => {
    try {
      const { pin, participant_id, user_name, current_index, total_count } = data || {};
      if (!pin || !participant_id) return;
      io.to(pin).emit('participant_step_progress', {
        pin,
        participant_id,
        user_name: String(user_name || socket.data.userName || 'Friend').slice(0, 40),
        current_index: Number(current_index) || 0,
        total_count: Number(total_count) || 0,
        cards_remaining: Math.max(0, (Number(total_count) || 0) - (Number(current_index) || 0)),
      });
    } catch (err) {
      console.error('[Socket] voting_step_progress error:', err?.message);
    }
  });
}

module.exports = {
  registerLobbySocketHandlers,
};
