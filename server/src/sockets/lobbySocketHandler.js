const { publicParticipant, isSocketMember, isSocketHost } = require('../utils/roomSecurity');
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

  const isCallerHost = (lobby, pin, data) => isSocketHost(socket, pin, lobby, data);

  // Handle lobby join - join the socket room and emit participant_joined with full roster
  socket.on('join_lobby', async (data) => {
    try {
      const { pin, participant_id, device_id, user_name, host_token } = data || {};
      const cleanDeviceId = device_id && typeof device_id === 'string' ? device_id.trim().slice(0, 64) : null;

      if (typeof pin !== 'string' || !/^\d{4}$/.test(pin) || typeof participant_id !== 'string' || participant_id.length > 64 || !participant_id || !cleanDeviceId || (user_name != null && typeof user_name !== 'string')) {
        socket.emit('room_error', {
          message: 'Valid 4-digit pin and participant_id are required.',
        });
        return;
      }


      let room = null;
      try {
        room = await getCachedRoomSummary(pin);
      } catch (dbErr) {
        console.warn('[Socket] DB lookup notice:', dbErr?.message);
      }

      if (store.closedRooms?.has(pin)) { socket.emit('room_error', { message: 'This room has expired. Please create a new pick.' }); return; }
      if (!room && !activeLobbies.has(pin) && !activeVotingSessions.has(pin)) {
        socket.emit('room_error', {
          message: 'Room not found. Please verify your PIN.',
        });
        return;
      }

      if (room?.status === 'VOTING' && !activeVotingSessions.has(pin)) {
        socket.emit('room_error', { code: 'LEGACY_SESSION', message: 'This pick predates restart recovery. Please create a new pick.' }); return;
      }
      if (room?.status === 'RESOLVED' && !activeVotingSessions.has(pin) && !room.winnerOptionId) {
        socket.emit('room_error', { message: 'This room has expired. Please create a new pick.' }); return;
      }
      const verifiedHost = Boolean(room && host_token && verifyHostToken(pin, room.hostId, host_token) && participant_id === room.hostId);
      if (room?.hostId === participant_id && !verifiedHost && (!room.hostDeviceId || room.hostDeviceId !== cleanDeviceId)) {
        socket.emit('room_error', { message: 'Valid host authorization is required.' });
        return;
      }
      const existingClaim = activeLobbies.get(pin)?.get(participant_id);
      if (existingClaim && existingClaim.deviceId !== cleanDeviceId) {
        socket.emit('room_error', { message: 'Participant identity belongs to another device.' });
        return;
      }
      if (socket.data.pin && socket.data.pin !== pin) {
        socket.emit('room_error', { message: 'Leave your current room before joining another.' });
        return;
      }

      if (!activeLobbies.has(pin)) {
        const map = new Map();
        map.suggestions = verifiedHost && Array.isArray(data?.initial_suggestions) ? data.initial_suggestions.filter(s => typeof s === 'string').slice(0, 50).map(s => s.trim().slice(0, 120)).filter(Boolean) : [];
        map.persistedParticipants = new Set();
        map.deviceToParticipantId = new Map();
        map.mode = room?.theme?.startsWith('custom') ? 'CUSTOM' : 'DISCOVERY';
        map.topic = (verifiedHost && typeof data?.topic === 'string' && data.topic.slice(0, 120)) || (room?.theme?.startsWith('custom:') ? room.theme.replace(/^custom:/, '') : 'Where should we go?');
        map.groupSize = verifiedHost ? Math.max(1, Math.min(50, Number(data?.group_size) || 4)) : 4;
        map.visiblePlacesCount = 6;
        map.hostId = room?.hostId;
        map.createdAt = Date.now();
        map.lastActivityAt = Date.now();
        activeLobbies.set(pin, map);
      }
      const lobby = activeLobbies.get(pin);
      if (lobby.size >= 50 && !lobby.has(participant_id) && !lobby.deviceToParticipantId?.has(cleanDeviceId)) { socket.emit('room_error', { message: 'This room is full.' }); return; }
      lobby.lastActivityAt = Date.now();
      if (!lobby.visiblePlacesCount) lobby.visiblePlacesCount = 6;
      if (verifiedHost && data?.visible_places_count && data.visible_places_count > lobby.visiblePlacesCount) {
        lobby.visiblePlacesCount = data.visible_places_count;
      }
      if (!lobby.persistedParticipants) lobby.persistedParticipants = new Set();
      if (!lobby.deviceToParticipantId) lobby.deviceToParticipantId = new Map();

      // Enforce per-room device idempotency: if the same device rejoins the room (e.g., refresh or switching from In-App Browser to Safari/Chrome), reuse its existing participant slot.
      let effectiveParticipantId = participant_id;
      if (cleanDeviceId && lobby.deviceToParticipantId.has(cleanDeviceId)) {
        effectiveParticipantId = lobby.deviceToParticipantId.get(cleanDeviceId);
      }

      if (lobby.removedDeviceIds?.has(cleanDeviceId)) {
        socket.emit('room_error', { message: 'You were removed from this room.' }); return;
      }
      const ongoing = activeVotingSessions.get(pin);
      if (ongoing && !ongoing.isResolved && ongoing.eligibleParticipantIds && !ongoing.eligibleParticipantIds.has(effectiveParticipantId)) {
        socket.emit('room_error', { message: 'Voting has already started. Please join the next pick.' }); return;
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
          lobby.persistedParticipants.delete(effectiveParticipantId);
          lobby.deviceToParticipantId.delete(cleanDeviceId);
          socket.emit('room_error', { message: 'Unable to verify participant identity.' });
          return;
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

      await socket.join(pin);
      socket.data.pin = pin;
      socket.data.participantId = effectiveParticipantId;
      socket.data.deviceId = cleanDeviceId;
      socket.data.userName = typeof user_name === 'string' ? user_name.trim().slice(0, 40) || 'Guest' : 'Guest';

      for (const idToClear of [participant_id, effectiveParticipantId]) {
        const dcKey = `${pin}:${idToClear}`;
        if (disconnectTimeouts.has(dcKey)) {
          clearTimeout(disconnectTimeouts.get(dcKey));
          disconnectTimeouts.delete(dcKey);
        }
      }

      const hasVerifiedHostToken = Boolean(
        verifiedHost
      );
      const currentHostId = lobby.hostId || room?.hostId;
      const isHost = currentHostId === effectiveParticipantId && (hasVerifiedHostToken || Boolean(
        room && room.hostId === effectiveParticipantId && room.hostDeviceId === cleanDeviceId
      ));

      if (isHost && data?.mode) lobby.mode = data.mode;
      const cleanDataTopic = data?.topic && data.topic !== 'custom' && data.topic !== 'poll' ? data.topic : null;
      const cleanRoomTopic = room?.theme?.startsWith('custom:') ? room.theme.replace(/^custom:/, '') : null;
      if (isHost && typeof cleanDataTopic === 'string') {
        lobby.topic = cleanDataTopic.slice(0, 120);
      } else if (cleanRoomTopic && cleanRoomTopic !== 'custom' && cleanRoomTopic !== 'poll' && (!lobby.topic || lobby.topic === 'Where should we go?' || lobby.topic === 'custom')) {
        lobby.topic = cleanRoomTopic;
      }
      if (isHost && data?.group_size) lobby.groupSize = Math.max(1, Math.min(50, Number(data.group_size) || 4));
      if (isHost && data?.deck_size) {
        lobby.visiblePlacesCount = Math.max(4, Math.min(50, parseInt(data.deck_size, 10) || 12));
      }
      if (!lobby.suggestions) lobby.suggestions = [];
      if (isHost && lobby.suggestions.length === 0 && Array.isArray(data?.initial_suggestions) && data.initial_suggestions.length > 0) {
        lobby.suggestions = data.initial_suggestions.filter(s => typeof s === 'string').slice(0, 50).map(s => s.trim().slice(0, 120)).filter(Boolean);
      }

      socket.data.isHost = isHost;
      socket.data.hostToken = hasVerifiedHostToken ? host_token : null;

      const existing = lobby.get(effectiveParticipantId);

      // Auto-name & deduplicate: If name is missing or Guest, auto-number. If duplicate, append (2), (3).
      let resolvedName = user_name && user_name.trim() !== '' && user_name !== 'Guest' ? user_name.trim().slice(0, 40) : null;
      if (!resolvedName) {
        resolvedName = existing?.name || `Guest ${lobby.size + 1}`;
      } else {
        const otherNames = Array.from(lobby.values())
          .filter((p) => p.id !== effectiveParticipantId)
          .map((p) => p.name.toLowerCase());
        if (otherNames.includes(resolvedName.toLowerCase())) {
          let suffix = 2;
          while (otherNames.includes(`${resolvedName.toLowerCase()} (${suffix})`)) {
            suffix++;
          }
          resolvedName = `${resolvedName} (${suffix})`;
        }
      }

      const participantRecord = {
        id: effectiveParticipantId,
        deviceId: cleanDeviceId || existing?.deviceId || null,
        name: resolvedName,
        isHost: isHost || Boolean(existing?.isHost),
        isOnline: true,
        status: 'online',
        lastSeenAt: Date.now(),
        budgetSealed: existing ? Boolean(existing.budgetSealed) : false,
        budgetLimit: existing ? existing.budgetLimit : null,
      };
      lobby.set(effectiveParticipantId, participantRecord);

      // Sanitize public roster: never leak deviceId or private tokens
      const safeParticipantsList = Array.from(lobby.values()).map(publicParticipant);
      const hostId = safeParticipantsList.find(p => p.isHost)?.id || currentHostId || null;

      io.to(pin).emit('participant_joined', {
        pin,
        participant_id: effectiveParticipantId,
        claimed_participant_id: participant_id,
        user_name: participantRecord.name,
        host_id: hostId,
        participants: safeParticipantsList,
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
        host_id: hostId,
        participants: safeParticipantsList,
        mode: lobby.mode || 'DISCOVERY',
        topic: lobby.topic || 'Where should we go?',
        group_size: lobby.groupSize || 4,
        suggestions: lobby.suggestions || [],
        visible_places_count: lobby.visiblePlacesCount || 6,
        removed_place_ids: Array.from(lobby.removedOptionIds || []),
      });

      if (!activeVotingSessions.has(pin) && room?.status === 'RESOLVED' && room?.winnerOptionId) {
        await store.restoreResolvedSession?.(pin, io);
      }
      const activeSession = activeVotingSessions.get(pin);
      if (activeSession) {
        if (activeSession.isResolved && activeSession.winner) {
          const { buildResolvedPayload } = require('./socketSessionStore');
          const resolvedPayload = buildResolvedPayload(pin, activeSession);
          socket.emit('winner_announced', resolvedPayload);
          socket.emit('consensus_reached', resolvedPayload);
        } else {

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

  const handleAddSuggestion = (data) => {
    try {
      const { pin, suggestion, name, user_name, added_by, addedBy, participant_id } = data || {};
      const rawSuggestion = suggestion ?? name;
      if (!pin || !rawSuggestion) return;
      const lobby = activeLobbies.get(pin);
      const callerId = socket.data.participantId;
      const isJoinedParticipant = isSocketMember(socket, pin, lobby, participant_id);
      if (!isJoinedParticipant) {
        socket.emit('room_error', { message: 'Join the room first to add options.' });
        return;
      }
      const clean = String(typeof rawSuggestion === 'object' ? (rawSuggestion.name || rawSuggestion.suggestion || '') : rawSuggestion).trim().slice(0, 120);
      if (!clean) return;
      const authorName = socket.data.userName || 'Friend';

      if (lobby) {
        if (!lobby.suggestions) lobby.suggestions = [];
        if (!lobby.suggestionMeta) lobby.suggestionMeta = new Map();
        if (lobby.suggestions.length >= 50) return;
        if (!lobby.suggestions.some((s) => s.toLowerCase() === clean.toLowerCase())) {
          lobby.suggestions.push(clean);
          lobby.suggestionMeta.set(clean.toLowerCase(), {
            name: clean,
            addedBy: authorName,
            participantId: callerId || null,
          });
          const updatePayload = {
            pin,
            suggestions: lobby.suggestions,
            suggestion_entries: lobby.suggestions.map((s) => (
              lobby.suggestionMeta.get(s.toLowerCase()) || { name: s, addedBy: 'Group' }
            )),
            added: clean,
            user_name: authorName,
            addedBy: authorName,
          };
          io.to(pin).emit('suggestions_updated', updatePayload);
          io.to(pin).emit('custom_suggestions_updated', updatePayload);
        }
      }
    } catch (err) {
      console.error('[Socket] add_suggestion error:', err.message);
    }
  };

  socket.on('add_suggestion', handleAddSuggestion);
  socket.on('add_custom_suggestion', handleAddSuggestion);

  const handleRemoveSuggestion = (data) => {
    try {
      const { pin, suggestion, name } = data || {};
      const rawSuggestion = suggestion ?? name;
      if (!pin || !rawSuggestion) return;
      const lobby = activeLobbies.get(pin);
      if (!isCallerHost(lobby, pin, data)) {
        socket.emit('room_error', { message: 'Only the room host can remove options.' });
        return;
      }
      const clean = String(typeof rawSuggestion === 'object' ? (rawSuggestion.name || rawSuggestion.suggestion || '') : rawSuggestion).trim();

      if (lobby && lobby.suggestions) {
        lobby.suggestions = lobby.suggestions.filter((s) => s.toLowerCase() !== clean.toLowerCase());
        if (lobby.suggestionMeta) {
          lobby.suggestionMeta.delete(clean.toLowerCase());
        }
        const removePayload = {
          pin,
          suggestions: lobby.suggestions,
          suggestion_entries: lobby.suggestions.map((s) => (
            lobby.suggestionMeta?.get(s.toLowerCase()) || { name: s, addedBy: 'Group' }
          )),
          removed: clean,
        };
        io.to(pin).emit('suggestions_updated', removePayload);
        io.to(pin).emit('custom_suggestions_updated', removePayload);
      }
    } catch (err) {
      console.error('[Socket] remove_suggestion error:', err.message);
    }
  };

  socket.on('remove_suggestion', handleRemoveSuggestion);
  socket.on('remove_custom_suggestion', handleRemoveSuggestion);

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
      const { pin, participant_id, budgetSealed, budgetLimit } = data || {};
      if (!isSocketMember(socket, pin, activeLobbies.get(pin), participant_id)) return;

      const lobby = activeLobbies.get(pin);
      if (isSocketMember(socket, pin, lobby, participant_id)) {
        const p = lobby.get(participant_id);
        p.budgetSealed = Boolean(budgetSealed);
        if (Number.isFinite(budgetLimit) && budgetLimit >= 0 && budgetLimit <= 100000) p.budgetLimit = budgetLimit;

        io.to(pin).emit('budget_updated', {
          pin,
          participant_id,
          budgetSealed: p.budgetSealed,
          participants: Array.from(lobby.values()).map(publicParticipant),
        });
      }
    } catch (err) {
      console.error('[Socket] update_budget error:', err.message);
    }
  });

  socket.on('send_reaction', (data) => {
    try {
      const { pin, emoji, user_name, participant_id } = data || {};
      if (!pin || !emoji || !isSocketMember(socket, pin, activeLobbies.get(pin), participant_id)) return;
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
      if (!isSocketMember(socket, pin, activeLobbies.get(pin), participant_id)) return;
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
