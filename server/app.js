require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { searchRestaurants } = require('./src/utils/foursquarePlaces');
const roomRoutes = require('./routes/roomRoutes');
//Lilia: access the shared Socket.io instance from other server modules
const { setIO } = require('./src/utils/socket');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/v1/rooms', roomRoutes);

app.get('/api/v1/test-foursquare', async (req, res) => {
    try {
        const restaurants = await searchRestaurants({
            latitude: 47.0105,
            longitude: 28.8638,
            radius: 5000,
        });

        res.json({
            success: true,
            count: restaurants.length,
            restaurants,
        });
    } catch (error) {
        console.error('Foursquare error:', error);

        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});



app.use((err, req, res, next) => {
  console.error(`[Error]: ${err.message}`);

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    error: err.name || 'SERVER_ERROR',
    message: err.message || 'An unexpected error occurred.',
  });
});

//Lilia: create an HTTP server so Express and Socket.io use the same port
const httpServer = http.createServer(app);

//Lilia: initialize Socket.io on the existing HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});
//Lilia: make the Socket.io instance available to other server modules
setIO(io);
app.set('io', io);

// In-memory active lobby roster tracking: pin -> Map(participant_id -> participantRecord)
const activeLobbies = new Map();
// In-memory active voting session tracking: pin -> session
const activeVotingSessions = new Map();

const { calculateSchulzeWinner } = require('./src/utils/schulze');

async function resolveAndBroadcastWinner(pin) {
  const session = activeVotingSessions.get(pin);
  if (!session) {
    console.warn(`[Socket] Cannot resolve winner for room ${pin}: no active session`);
    return;
  }

  if (session.isResolved && session.winner) {
    io.to(pin).emit('winner_announced', {
      pin,
      winning_option: session.winner,
      winningOptionId: session.winner.id,
      winner: session.winner,
      matchScore: session.matchScore || 96,
      pairwise: session.pairwise || [],
      total_voted: session.submissions.size,
    });
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

  let winningOptionId = null;
  try {
    winningOptionId = calculateSchulzeWinner(submissionsArray);
  } catch (err) {
    console.warn('[Socket] Schulze calculation notice:', err.message);
  }

  // Fallback: If Condorcet returned null (e.g. cycle or all vetoed), pick highest total score
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
    winningOption = {
      id: winningOptionId || 'winner_consensus',
      name: 'Consensus Winner',
      price_level: 2,
      distance_km: 1.2,
      category: 'Group Choice',
      tags: ['Top Match'],
    };
  }

  // Dynamic head-to-head pairwise duel calculation across all submitted ballots
  const rivals = session.options.filter((o) => o.id !== winningOption.id);
  const pairwiseData = rivals.map((rival) => {
    let winVotes = 0;
    let lossVotes = 0;
    for (const sub of submissionsArray) {
      const vWin = sub.votes.find((v) => v.option_id === winningOption.id)?.score || 0;
      const vRival = sub.votes.find((v) => v.option_id === rival.id)?.score || 0;
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
    sub.votes.some((v) => v.option_id === winningOption.id && v.score === 1)
  ).length;
  const approvalRatio = approvalCount / Math.max(1, submissionsArray.length);
  const matchScore = Math.min(98, Math.max(76, Math.round(approvalRatio * 100)));

  session.isResolved = true;
  session.winner = winningOption;
  session.matchScore = matchScore;
  session.pairwise = pairwiseData;

  console.log(`[Socket] Consensus resolved for room ${pin}: "${winningOption.name}" won across ${submissionsArray.length} ballots!`);

  io.to(pin).emit('winner_announced', {
    pin,
    winning_option: winningOption,
    winningOptionId: winningOption.id,
    winner: winningOption,
    matchScore,
    pairwise: pairwiseData,
    total_voted: submissionsArray.length,
  });

  io.to(pin).emit('MATCH_FOUND', {
    pin,
    winningOptionId: winningOption.id,
    winning_option: winningOption,
    winner: winningOption,
  });
}

//Lilia: handle Socket.io room joining for real-time lobby updates
io.on('connection', (socket) => {
  // Direct room join for swipe deck and reconnects
  socket.on('join_room', (data) => {
    const pin = data?.pin;
    const participant_id = data?.participant_id;
    if (pin) {
      socket.join(pin);
      socket.data.pin = pin;
      if (participant_id) socket.data.participantId = participant_id;

      const session = activeVotingSessions.get(pin);
      if (session && session.isResolved && session.winner) {
        socket.emit('winner_announced', {
          pin,
          winning_option: session.winner,
          winningOptionId: session.winner.id,
          winner: session.winner,
          matchScore: session.matchScore || 96,
          pairwise: session.pairwise || [],
          total_voted: session.submissions.size,
        });
      } else if (session) {
        socket.emit('vote_progress', {
          pin,
          voted_participants: session.submissions.size,
          total_participants: Math.max(session.expectedCount, session.submissions.size),
          votes_received: session.submissions.size,
        });
      }
    }
  });
  //Lilia: handle lobby join - join the socket room and emit participant_joined with full roster
  socket.on('join_lobby', async (data) => {
    try {
      const { pin, participant_id, user_name } = data;

      if (!pin || !participant_id) {
        socket.emit('room_error', {
          message: 'pin and participant_id are required.',
        });
        return;
      }

      socket.data.pin = pin;
      socket.data.participantId = participant_id;
      socket.data.userName = user_name || 'Guest';

      socket.join(pin);

      const { getRoomByPin, createParticipantWithId } = require('./db/helpers');

      let room = null;
      try {
        room = await getRoomByPin(pin);
        if (room) {
          // Ensure participant is persisted in PostgreSQL
          await createParticipantWithId(room.id, participant_id).catch(() => {});
        }
      } catch (dbErr) {
        console.warn('[Socket] DB lookup notice:', dbErr.message);
      }

      if (!activeLobbies.has(pin)) {
        activeLobbies.set(pin, new Map());
      }
      const lobby = activeLobbies.get(pin);

      const isHost = (room && room.hostId === participant_id) || lobby.size === 0;

      // Preserve budgetSealed state if reconnecting
      const existing = lobby.get(participant_id);
      const participantRecord = {
        id: participant_id,
        name: user_name || 'Guest',
        isHost,
        budgetSealed: existing ? Boolean(existing.budgetSealed) : false,
        budgetLimit: existing ? existing.budgetLimit : null,
      };
      lobby.set(participant_id, participantRecord);

      const participantsList = Array.from(lobby.values());
      const hostId = room ? room.hostId : (participantsList.find((p) => p.isHost)?.id || null);

      // Broadcast full hydrated roster to everyone in the room
      io.to(pin).emit('participant_joined', {
        pin,
        participant_id,
        user_name: user_name || 'Guest',
        host_id: hostId,
        participants: participantsList,
      });

      // Also send directly to the joining socket to guarantee instant state sync
      socket.emit('lobby_state', {
        pin,
        host_id: hostId,
        participants: participantsList,
      });

      console.log(`[Socket] ${user_name || 'Guest'} joined room ${pin} (Lobby count: ${lobby.size})`);
    } catch (error) {
      console.error('[Socket] join_lobby error:', error.message);
      socket.emit('room_error', { message: 'Failed to join room.' });
    }
  });

  // Handle real-time budget constraint updates
  socket.on('update_budget', (data) => {
    try {
      const { pin, participant_id, budgetSealed, budgetLimit } = data;
      if (!pin || !participant_id) return;

      const lobby = activeLobbies.get(pin);
      if (lobby && lobby.has(participant_id)) {
        const p = lobby.get(participant_id);
        p.budgetSealed = Boolean(budgetSealed);
        if (budgetLimit !== undefined) p.budgetLimit = budgetLimit;

        const participantsList = Array.from(lobby.values());

        io.to(pin).emit('budget_updated', {
          pin,
          participant_id,
          budgetSealed: p.budgetSealed,
          budgetLimit: p.budgetLimit,
          participants: participantsList,
        });

        console.log(`[Socket] Budget updated for ${p.name} in room ${pin}: sealed=${p.budgetSealed}`);
      }
    } catch (err) {
      console.error('[Socket] update_budget error:', err.message);
    }
  });

  //Lilia: start the voting phase and prepare room options
  socket.on('host_start_voting', async (data) => {
    try {
      const { pin, host_id, options } = data;

      if (!pin || !Array.isArray(options)) {
        socket.emit('room_error', {
          message: 'pin and options are required.',
        });
        return;
      }

      const {
        getRoomByPin,
        createOption,
      } = require('./db/helpers');

      let room = null;
      try {
        room = await getRoomByPin(pin);
      } catch (dbErr) {
        console.warn('[Socket] DB lookup notice in host_start_voting:', dbErr.message);
      }

      const lobby = activeLobbies.get(pin);
      const participantRecord = (host_id && lobby?.get(host_id)) || (socket.data.participantId && lobby?.get(socket.data.participantId));

      const isAuthorized =
        (room && host_id && room.hostId === host_id) ||
        (participantRecord && participantRecord.isHost) ||
        !lobby ||
        lobby.size <= 1;

      if (!isAuthorized) {
        console.warn(`[Socket] Unauthorized host_start_voting in room ${pin} by host_id: ${host_id}`);
        socket.emit('room_error', {
          message: 'Only the room host can start voting.',
        });
        return;
      }

      let roomOptions = options.map((opt, idx) => {
        if (typeof opt === 'string') {
          return {
            id: `opt-${idx}`,
            name: opt,
            price_level: 2,
            distance_km: 1.2,
            category: 'Group Suggestion',
            tags: ['Custom'],
          };
        }
        return {
          id: String(opt.id || `opt-${idx}`),
          name: opt.name || `Option ${idx + 1}`,
          price_level: typeof opt.price_level === 'number' ? opt.price_level : 2,
          distance_km: typeof opt.distance_km === 'number' ? opt.distance_km : 1.2,
          category: opt.category || 'Local Venue',
          tags: Array.isArray(opt.tags) ? opt.tags : ['Top Pick'],
          address: opt.address || 'Central District',
        };
      });

      const expectedCount = lobby && lobby.size > 0 ? lobby.size : 1;
      activeVotingSessions.set(pin, {
        pin,
        options: roomOptions,
        submissions: new Map(),
        expectedCount,
        isResolved: false,
        winner: null,
        hostId: host_id,
      });

      // Broadcast database-backed options to everyone in this Socket.io room
      io.to(pin).emit('voting_started', {
        pin,
        options: roomOptions,
      });

      console.log(
        `[Socket] Voting started in room ${pin} with ${roomOptions.length} options for ${io.sockets.adapter.rooms.get(pin)?.size || 0} clients (expected quorum: ${expectedCount})`
      );
    } catch (error) {
      console.error('[Socket] Failed to start voting:', error.message);
      socket.emit('room_error', { message: 'Failed to start voting.' });
    }
  });

  // Handle ballot submission from clients in swiping phase
  socket.on('submit_ballot', async (data) => {
    try {
      const { pin, participant_id, rankings } = data;
      if (!pin || !participant_id || !Array.isArray(rankings)) return;

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

      const votes = rankings.map((r) => ({
        option_id: String(r.option_id),
        score: Number(r.score),
      }));

      session.submissions.set(participant_id, {
        participant_id,
        votes,
      });

      const votedCount = session.submissions.size;
      const lobby = activeLobbies.get(pin);
      const totalCount = Math.max(session.expectedCount, lobby ? lobby.size : 0, votedCount);

      console.log(`[Socket] Ballot recorded in room ${pin} from participant ${participant_id} (${votedCount}/${totalCount})`);

      io.to(pin).emit('vote_progress', {
        pin,
        voted_participants: votedCount,
        total_participants: totalCount,
        votes_received: votedCount,
      });

      if (votedCount >= totalCount && !session.isResolved) {
        await resolveAndBroadcastWinner(pin);
      }
    } catch (err) {
      console.error('[Socket] submit_ballot error:', err.message);
    }
  });

  // Host override: force resolution early with current submissions
  socket.on('host_force_reveal', async (data) => {
    try {
      const pin = data?.pin || socket.data.pin;
      console.log(`[Socket] Host force reveal in room ${pin}`);
      await resolveAndBroadcastWinner(pin);
    } catch (err) {
      console.error('[Socket] host_force_reveal error:', err.message);
    }
  });

  // Handle explicit participant leaving lobby
  socket.on('leave_lobby', (data) => {
    const pin = data?.pin || socket.data.pin;
    const participantId = data?.participant_id || socket.data.participantId;
    const userName = data?.user_name || socket.data.userName || 'Guest';

    if (pin) {
      socket.leave(pin);
      socket.data.pin = null;

      const lobby = activeLobbies.get(pin);
      if (lobby) {
        lobby.delete(participantId);
        if (lobby.size === 0) activeLobbies.delete(pin);
      }

      const remainingParticipants = lobby ? Array.from(lobby.values()) : [];

      io.to(pin).emit('participant_left', {
        pin,
        participant_id: participantId,
        user_name: userName,
        total_participants: remainingParticipants.length,
        participants: remainingParticipants,
      });

      console.log(`[Socket] ${userName} left room ${pin} via leave_lobby`);
    }
  });

  //Lilia: notify the room when a participant disconnects
  socket.on('disconnect', () => {
    const pin = socket.data.pin;
    const participantId = socket.data.participantId;
    const userName = socket.data.userName || 'Guest';

    if (!pin) {
      return;
    }

    const lobby = activeLobbies.get(pin);
    if (lobby) {
      lobby.delete(participantId);
      if (lobby.size === 0) activeLobbies.delete(pin);
    }

    const remainingParticipants = lobby ? Array.from(lobby.values()) : [];

    //Lilia: send the updated participant count and list to everyone still in the room
    io.to(pin).emit('participant_left', {
      pin,
      participant_id: participantId,
      user_name: userName,
      total_participants: remainingParticipants.length,
      participants: remainingParticipants,
    });

    console.log(`[Socket] ${userName} left room ${pin}`);
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
