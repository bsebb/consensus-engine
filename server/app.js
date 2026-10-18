require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { searchRestaurants, fetchRealVenuePhotos } = require('./src/utils/foursquarePlaces');
const { resolveGamePoster } = require('./src/utils/gamePosterService');
const { searchCustomAutocomplete } = require('./src/utils/customAutocompleteService');
const { resolveGooglePhotoMedia } = require('./src/utils/googlePlaces');
const { reportClosedVenue } = require('./src/utils/reportedVenues');
const roomRoutes = require('./routes/roomRoutes');
const { setIO } = require('./src/utils/socket');
const { verifyHostToken } = require('./src/utils/hostAuth');
const { createRateLimiter } = require('./src/utils/rateLimiter');
const cors = require('cors');

const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https:\/\/([a-zA-Z0-9-]+\.)*noyoupick\.org$/,
  /^https:\/\/([a-zA-Z0-9-]+\.)*vercel\.app$/,
];
if (process.env.CLIENT_URL) {
  try {
    const u = new URL(process.env.CLIENT_URL);
    ALLOWED_ORIGIN_PATTERNS.push(new RegExp(`^${u.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  } catch {}
}

const checkOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  const isAllowed = ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
  if (isAllowed) return callback(null, true);
  return callback(null, false);
};

const app = express();
app.use(cors({ origin: checkOrigin, credentials: true }));
app.use(express.json({ limit: '16kb' }));

const sensitiveLimiter = createRateLimiter({ windowMs: 60000, max: 40 });

// Root status landing page for browser visits
app.get('/', (req, res) => {
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Consensus Engine Backend</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #090d16; color: #f8fafc; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
          .card { background: #131b2e; border: 1px solid #1e293b; padding: 2.5rem; border-radius: 1.5rem; text-align: center; max-width: 420px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
          .badge { display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(16, 185, 129, 0.1); color: #34d399; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 1.25rem; border: 1px solid rgba(16, 185, 129, 0.2); }
          .pulse { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 10px #10b981; }
          h1 { margin: 0 0 0.5rem; font-size: 1.4rem; font-weight: 800; letter-spacing: -0.025em; }
          p { margin: 0; color: #94a3b8; font-size: 0.875rem; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge"><span class="pulse"></span> ONLINE</div>
          <h1>Consensus Engine API</h1>
          <p>Real-time multiplayer WebSockets and REST services are active and ready.</p>
        </div>
      </body>
    </html>
  `);
});

// Lightweight health check endpoint for Render health monitoring and keep-alive pingers
app.get(['/health', '/api/v1/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/rooms', roomRoutes);

// Real venue photography endpoint (returns up to 4 real high-res CDN photos for any venue)
app.get('/api/v1/venue-photos', async (req, res) => {
  try {
    const { name = '', address = '', category = '' } = req.query;
    if (!name.trim()) {
      return res.json({ success: true, photos: [] });
    }
    const photos = await fetchRealVenuePhotos(name, address, category);
    res.set('Cache-Control', 'public, max-age=3600');
    return res.json({ success: true, photos });
  } catch {
    return res.json({ success: false, photos: [] });
  }
});

// Ephemeral Crowd-Sourced Self-Healing: report closed/outdated venue
app.post('/api/v1/venues/report-closed', sensitiveLimiter, (req, res) => {
  try {
    const { name, address, lat, lng, reason } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'Venue name is required' });
    }
    const result = reportClosedVenue({ name, address, lat, lng, reason });
    return res.status(200).json({
      success: true,
      message: 'Venue reported as closed and excluded from future discovery decks.',
      venue: result.venue,
    });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to report venue' });
  }
});

// Google Places photo proxy with 7-day browser caching
app.get('/api/v1/places/photo', sensitiveLimiter, async (req, res) => {
  try {
    const photoRef = req.query.ref;
    if (!photoRef) {
      return res.status(400).json({ error: 'Photo reference is required' });
    }
    const cdnUrl = await resolveGooglePhotoMedia(photoRef);
    if (!cdnUrl) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    res.set('Cache-Control', 'public, max-age=604800');
    return res.redirect(302, cdnUrl);
  } catch {
    return res.status(500).json({ error: 'Failed to resolve photo' });
  }
});

// Official game artwork lookup (strict Steam match, then Wikipedia cover art)
app.get('/api/v1/options/game-poster', async (req, res) => {
  try {
    const result = await resolveGamePoster(req.query.query);
    res.set('Cache-Control', 'public, max-age=86400');
    return res.json({
      success: true,
      poster_url: result ? result.url : null,
      source: result ? result.source : null,
      name: result ? result.title : null,
    });
  } catch {
    return res.json({ success: false, poster_url: null });
  }
});

// Multi-domain live autocomplete query (Steam games, movies, activities)
app.get('/api/v1/options/autocomplete', async (req, res) => {
  try {
    const suggestions = await searchCustomAutocomplete({
      query: req.query.query,
      topic: req.query.topic,
    });
    res.set('Cache-Control', 'public, max-age=600');
    return res.json({
      success: true,
      suggestions: Array.isArray(suggestions) ? suggestions : [],
    });
  } catch {
    return res.json({ success: false, suggestions: [] });
  }
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';
  console.error(`[Error]: ${err.message}`);

  return res.status(statusCode).json({
    success: false,
    error: isProd ? 'SERVER_ERROR' : (err.name || 'SERVER_ERROR'),
    message: isProd ? 'An unexpected error occurred. Please try again later.' : (err.message || 'An error occurred.'),
  });
});

// Create an HTTP server so Express and Socket.io use the same port
const httpServer = http.createServer(app);

// Initialize Socket.io on HTTP server with restricted origins and 16KB max frame size
const io = new Server(httpServer, {
  cors: {
    origin: checkOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 16 * 1024,
});
setIO(io);
app.set('io', io);

// In-memory active lobby roster tracking: pin -> Map(participant_id -> participantRecord)
const activeLobbies = new Map();
// In-memory active voting session tracking: pin -> session
const activeVotingSessions = new Map();
// Disconnect grace tracking: `${pin}:${participant_id}` -> timeoutId
const disconnectTimeouts = new Map();

// In-memory room summary cache: pin -> { room, expiresAt } to avoid heavy DB queries on socket joins
const roomSummaryCache = new Map();
const { getRoomSummaryByPin, createParticipantWithId, prisma } = require('./db/helpers');

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

  // Evict resolved session and lobby after 30 minutes to prevent server memory leaks
  const evictionTimer = setTimeout(() => {
    activeVotingSessions.delete(pin);
    activeLobbies.delete(pin);
    console.log(`[Socket] Evicted resolved session and lobby for room ${pin}`);
  }, 30 * 60 * 1000);
  if (evictionTimer.unref) evictionTimer.unref();
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

      // Cancel any disconnect eviction timer if reconnecting to deck
      const dcKey = `${pin}:${participant_id}`;
      if (disconnectTimeouts.has(dcKey)) {
        clearTimeout(disconnectTimeouts.get(dcKey));
        disconnectTimeouts.delete(dcKey);
      }

      const session = activeVotingSessions.get(pin);
      const lobby = activeLobbies.get(pin);
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
        // Emit full state restore so direct navigation or reloads have the exact room options
        socket.emit('state_restore', {
          pin,
          phase: 'VOTING',
          options: session.options || [],
          topic: session.topic || lobby?.topic || 'Where should we go?',
          mode: session.mode || lobby?.mode || 'DISCOVERY',
          voted_participants: session.submissions.size,
          total_participants: Math.max(session.expectedCount, session.submissions.size),
          already_voted: Boolean(participant_id && session.submissions.has(participant_id)),
        });
        socket.emit('vote_progress', {
          pin,
          voted_participants: session.submissions.size,
          total_participants: Math.max(session.expectedCount, session.submissions.size),
          votes_received: session.submissions.size,
        });
      }
    }
  });

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

      // Cancel any pending disconnect eviction timer for this participant
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

      // Check if room exists before allocating in-memory lobby structures
      if (!room && !activeLobbies.has(pin) && !activeVotingSessions.has(pin)) {
        socket.emit('room_error', {
          message: 'Room not found. Please verify your PIN.',
        });
        return;
      }

      if (!activeLobbies.has(pin)) {
        const map = new Map();
        map.suggestions = [];
        map.persistedParticipants = new Set();
        map.mode = data?.mode || (room?.theme?.startsWith('custom') ? 'CUSTOM' : 'DISCOVERY');
        map.topic = data?.topic || (room?.theme?.startsWith('custom:') ? room.theme.replace(/^custom:/, '') : 'Where should we go?');
        map.groupSize = data?.group_size || 4;
        activeLobbies.set(pin, map);
      }
      const lobby = activeLobbies.get(pin);
      if (!lobby.persistedParticipants) lobby.persistedParticipants = new Set();

      // Ensure participant is persisted in PostgreSQL exactly once per session
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
      if (!lobby.suggestions) lobby.suggestions = [];

      // Cryptographically verify host privilege via token, DB record, or creator status
      const hasVerifiedHostToken = Boolean(host_token && verifyHostToken(pin, participant_id, host_token));
      const isDbHost = Boolean(room && room.hostId === participant_id);
      const isHost = hasVerifiedHostToken || isDbHost || lobby.size === 0;

      socket.data.isHost = isHost;
      socket.data.hostToken = host_token || null;

      // Preserve budgetSealed state if reconnecting
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

      // Broadcast full hydrated roster to everyone in the room
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
      });

      // Also send directly to the joining socket to guarantee instant state sync
      socket.emit('lobby_state', {
        pin,
        host_id: hostId,
        participants: participantsList,
        mode: lobby.mode || 'DISCOVERY',
        topic: lobby.topic || 'Where should we go?',
        group_size: lobby.groupSize || 4,
        suggestions: lobby.suggestions || [],
      });

      // REJOIN RECOVERY: If a voting session is already in progress, immediately dispatch voting_started
      // so a user who refreshed, switched tabs, or reconnected is NEVER left out!
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
          // Dynamically adjust expected quorum so rejoining user is included
          activeSession.expectedCount = Math.max(activeSession.expectedCount, lobby.size);
          socket.emit('voting_started', {
            pin,
            options: activeSession.options,
            topic: activeSession.topic || lobby.topic || 'Where should we go?',
            mode: activeSession.mode || lobby.mode || 'DISCOVERY',
          });
        }
      }

      console.log(`[Socket] ${user_name || 'Guest'} joined room ${pin} (Lobby count: ${lobby.size}, mode: ${lobby.mode}, activeSession: ${Boolean(activeSession)})`);
    } catch (error) {
      console.error('[Socket] join_lobby error:', error.message);
      socket.emit('room_error', { message: 'Failed to join room.' });
    }
  });

  // Handle participants adding suggestions in custom mode
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
          console.log(`[Socket] Suggestion "${clean}" added to room ${pin} by ${user_name || 'Participant'}`);
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

  // Handle removing a suggestion
  socket.on('remove_suggestion', (data) => {
    try {
      const { pin, suggestion } = data;
      if (!pin || !suggestion) return;
      const clean = String(suggestion).trim();

      const lobby = activeLobbies.get(pin);
      if (lobby && lobby.suggestions) {
        lobby.suggestions = lobby.suggestions.filter((s) => s.toLowerCase() !== clean.toLowerCase());
        console.log(`[Socket] Suggestion "${clean}" removed from room ${pin}`);
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

  // Start the voting phase and prepare room options
  socket.on('host_start_voting', async (data) => {
    try {
      const { pin, host_id, host_token, options } = data || {};

      if (!pin || !Array.isArray(options)) {
        socket.emit('room_error', {
          message: 'pin and options are required.',
        });
        return;
      }

      let room = null;
      try {
        room = await getCachedRoomSummary(pin);
      } catch (dbErr) {
        console.warn('[Socket] DB lookup notice in host_start_voting:', dbErr?.message);
      }

      const lobby = activeLobbies.get(pin);
      const callerId = host_id || socket.data.participantId;
      const tokenToCheck = host_token || socket.data.hostToken;
      const hasVerifiedToken = Boolean(tokenToCheck && verifyHostToken(pin, callerId, tokenToCheck));
      const isDbHost = Boolean(room && room.hostId === callerId);
      const isSocketHost = Boolean(socket.data.isHost);

      const isAuthorized = hasVerifiedToken || isDbHost || isSocketHost || !lobby || lobby.size <= 1;

      if (!isAuthorized) {
        console.warn(`[Socket] Unauthorized host_start_voting in room ${pin} by ${callerId}`);
        socket.emit('room_error', {
          message: 'Only the room host can start voting.',
        });
        return;
      }

      const cappedOptions = options.slice(0, 30);
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
      });

      // Broadcast database-backed options to everyone in this Socket.io room
      io.to(pin).emit('voting_started', {
        pin,
        options: roomOptions,
        topic,
        mode,
        total_participants: expectedCount,
      });

      console.log(
        `[Socket] Voting started in room ${pin} with ${roomOptions.length} options for ${io.sockets.adapter.rooms.get(pin)?.size || 0} clients (expected quorum: ${expectedCount})`
      );
    } catch (error) {
      console.error('[Socket] Failed to start voting:', error.message);
      socket.emit('room_error', { message: 'Failed to start voting.' });
    }
  });

  const ALLOWED_BALLOT_SCORES = new Set([1, -1, -100]);

  // Handle ballot submission from clients in swiping phase
  socket.on('submit_ballot', async (data) => {
    try {
      const { pin, participant_id, rankings } = data || {};
      if (!pin || !participant_id || !Array.isArray(rankings)) return;

      // Verify caller matches participantId stored on socket
      if (socket.data.participantId && socket.data.participantId !== participant_id) {
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

      // Filter and sanitize rankings strictly to allowed Condorcet weights
      const votes = rankings
        .slice(0, 50)
        .filter((r) => r && typeof r.option_id === 'string' && ALLOWED_BALLOT_SCORES.has(Number(r.score)))
        .map((r) => ({
          option_id: String(r.option_id).slice(0, 64),
          score: Number(r.score),
        }));

      if (votes.length === 0) return;

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
  const handleForceResolve = async (data) => {
    try {
      const pin = data?.pin || socket.data.pin;
      const callerId = data?.host_id || socket.data.participantId;
      const tokenToCheck = data?.host_token || socket.data.hostToken;
      const lobby = activeLobbies.get(pin);
      const session = activeVotingSessions.get(pin);
      const hostId = session?.hostId || (lobby && Array.from(lobby.values()).find(p => p.isHost)?.id);

      const hasVerifiedToken = Boolean(tokenToCheck && verifyHostToken(pin, callerId, tokenToCheck));
      const isSocketHost = Boolean(socket.data.isHost);
      const isAuthorized = hasVerifiedToken || isSocketHost || (hostId && callerId && hostId === callerId);

      if (!isAuthorized) {
        console.warn(`[Socket] Unauthorized force reveal attempt by ${callerId} in room ${pin}`);
        socket.emit('room_error', { message: 'Only the room host can force consensus reveal.' });
        return;
      }
      console.log(`[Socket] Authorized Host force reveal in room ${pin}`);
      await resolveAndBroadcastWinner(pin);
    } catch (err) {
      console.error('[Socket] host_force_reveal error:', err.message);
    }
  };

  socket.on('host_force_reveal', handleForceResolve);
  socket.on('host_force_resolve', handleForceResolve);

  // Handle explicit participant leaving lobby
  socket.on('leave_lobby', (data) => {
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
          // Promote oldest remaining participant to Host so lobby is never orphaned
          const remaining = Array.from(lobby.values());
          if (!remaining.some((p) => p.isHost)) {
            remaining[0].isHost = true;
            lobby.set(remaining[0].id, remaining[0]);
            console.log(`[Socket] Promoted ${remaining[0].name} to Host in room ${pin}`);
          }
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

      console.log(`[Socket] ${userName} left room ${pin} via leave_lobby`);
    }
  });

  // Notify the room when a participant disconnects with a 10s grace period for rejoining
  socket.on('disconnect', () => {
    const pin = socket.data.pin;
    const participantId = socket.data.participantId;
    const userName = socket.data.userName || 'Guest';

    if (!pin || !participantId) {
      return;
    }

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
            activeLobbies.delete(pin);
          } else if (wasHost && currentLobby.size > 0) {
            const remaining = Array.from(currentLobby.values());
            if (!remaining.some((p) => p.isHost)) {
              remaining[0].isHost = true;
              currentLobby.set(remaining[0].id, remaining[0]);
              console.log(`[Socket] Promoted ${remaining[0].name} to Host in room ${pin} after disconnect timeout`);
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
          console.log(`[Socket] Evicted participant ${userName} from room ${pin} after grace timeout`);
        }
      }, 10000);

      disconnectTimeouts.set(dcKey, timeout);
    }

    console.log(`[Socket] ${userName} temporarily disconnected from room ${pin} (30s grace active)`);
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

// Gracefully handle process termination (Render deploys, container recycling, local ctrl-c)
// to immediately release PostgreSQL client connections and prevent connection pool exhaustion.
async function gracefulShutdown(signal) {
  console.log(`[Server] Received ${signal}. Draining sockets, closing HTTP server, and releasing database connections...`);
  httpServer.close(async () => {
    try {
      if (prisma && prisma.$disconnect) {
        await prisma.$disconnect();
        console.log('[Server] Prisma disconnected cleanly.');
      }
    } catch (e) {
      console.error('[Server] Error during database disconnect:', e.message);
    }
    process.exit(0);
  });

  // Force exit after 5 seconds if connections fail to drain
  setTimeout(() => {
    console.error('[Server] Forced shutdown: connection drain timeout exceeded.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

