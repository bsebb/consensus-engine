const { verifyHostToken } = require('../utils/hostAuth');
const { createParticipantWithId } = require('../../db/helpers');

function registerLobbySocketHandlers(io, socket, store) {
  const {
    activeLobbies,
    activeVotingSessions,
    disconnectTimeouts,
    getCachedRoomSummary,
  } = store;

  // Handle lobby join - join the socket room and emit participant_joined with full roster
  socket.on('join_lobby', async (data) => {
    try {
      const { pin, participant_id, user_name, host_token } = data || {};

      if (!pin || !participant_id || !/^\d{4}$/.test(String(pin))) {
        socket.emit('room_error', {
          message: 'Valid 4-digit pin and participant_id are required.',
        });
        return;
      }

      socket.data.pin = pin;
      socket.data.participantId = participant_id;
      socket.data.userName = user_name || 'Guest';

      socket.join(pin);

      const dcKey = `${pin}:${participant_id}`;
      if (disconnectTimeouts.has(dcKey)) {
        clearTimeout(disconnectTimeouts.get(dcKey));
        disconnectTimeouts.delete(dcKey);
      }

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

      if (room && !lobby.persistedParticipants.has(participant_id)) {
        lobby.persistedParticipants.add(participant_id);
        createParticipantWithId(room.id, participant_id).catch(() => {});
      }

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

      const hasVerifiedHostToken = Boolean(host_token && verifyHostToken(pin, participant_id, host_token));
      const isHost = hasVerifiedHostToken;

      socket.data.isHost = isHost;
      socket.data.hostToken = hasVerifiedHostToken ? host_token : null;

      const existing = lobby.get(participant_id);
      const participantRecord = {
        id: participant_id,
        name: user_name || 'Guest',
        isHost,
        isOnline: true,
        budgetSealed: existing ? Boolean(existing.budgetSealed) : false,
        budgetLimit: existing ? existing.budgetLimit : null,
      };
      lobby.set(participant_id, participantRecord);

      const participantsList = Array.from(lobby.values());
      const hostId = room ? room.hostId : (participantsList.find((p) => p.isHost)?.id || null);

      io.to(pin).emit('participant_joined', {
        pin,
        participant_id,
        user_name: user_name || 'Guest',
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
      const { pin, suggestion, user_name } = data || {};
      if (!pin || !suggestion) return;
      const clean = String(suggestion).trim().slice(0, 120);
      if (!clean) return;

      const lobby = activeLobbies.get(pin);
      if (lobby) {
        if (!lobby.suggestions) lobby.suggestions = [];
        if (lobby.suggestions.length >= 50) return;
        if (!lobby.suggestions.some((s) => s.toLowerCase() === clean.toLowerCase())) {
          lobby.suggestions.push(clean);
          io.to(pin).emit('suggestions_updated', {
            pin,
            suggestions: lobby.suggestions,
            added: clean,
            user_name: user_name || 'Participant',
          });
        }
      }
    } catch (err) {
      console.error('[Socket] add_suggestion error:', err.message);
    }
  });

  socket.on('remove_suggestion', (data) => {
    try {
      const { pin, suggestion } = data;
      if (!pin || !suggestion) return;
      const clean = String(suggestion).trim();

      const lobby = activeLobbies.get(pin);
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
