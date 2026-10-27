require('dotenv').config();
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const { Server } = require('socket.io');
const { coordinatedIO } = require('./src/state/roomCoordinator');
const { initializeRealtime } = require('./src/state/realtimeCluster');
const { fetchRealVenuePhotos } = require('./src/utils/foursquarePlaces');
const { discoverDiscoveryVenues } = require('./src/services/venueDiscoveryService');
const { resolveGamePoster } = require('./src/utils/gamePosterService');
const { searchCustomAutocomplete } = require('./src/utils/customAutocompleteService');
const { resolveGooglePhotoMedia } = require('./src/utils/googlePlaces');
const { reportClosedVenue } = require('./src/utils/reportedVenues');
const { getStorageMetrics, pruneExpiredRooms, initStorageSafeguard } = require('./src/utils/storageSafeguard');
const roomRoutes = require('./routes/roomRoutes');
const { setIO } = require('./src/utils/socket');
const { createRateLimiter } = require('./src/utils/rateLimiter');
const cors = require('cors');

const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/(127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/,
  /^https:\/\/([a-zA-Z0-9-]+\.)*noyoupick\.org$/,
  /^https:\/\/consensus-engine\.vercel\.app$/,
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
// Explicitly configure the deployment's trusted proxy ranges; direct installs trust none.
app.set('trust proxy', process.env.TRUST_PROXY || false);
app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors({ origin: checkOrigin, credentials: true }));
app.use(createRateLimiter({ windowMs: 60000, max: 1200 }));
app.use(express.json({ limit: '16kb', inflate: false }));

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

const requireAdminAuth = (req, res, next) => {
  const adminSecret = process.env.ADMIN_API_KEY;
  const rawIp = req.ip || req.socket?.remoteAddress || '';
  const isLocal = rawIp === '127.0.0.1' || rawIp === '::1' || rawIp === '::ffff:127.0.0.1';
  if (!adminSecret && isLocal && process.env.NODE_ENV !== 'production') return next();
  if (!adminSecret) {
    return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'System endpoints disabled in production without ADMIN_API_KEY.' });
  }
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.headers['x-admin-key'];
  if (!token || token !== adminSecret) {
    return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Unauthorized system operation.' });
  }
  next();
};

// Resource telemetry endpoint returning memory, PostgreSQL capacity, and safeguard status
app.get('/api/v1/system/telemetry', requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    const metrics = await getStorageMetrics();
    return res.status(200).json({ success: true, ...metrics });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Trigger database prune manually
app.post('/api/v1/system/prune', requireAdminAuth, sensitiveLimiter, async (req, res) => {
  try {
    const result = await pruneExpiredRooms(7);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/ready', async (req, res) => {
  try {
    await ready;
    await prisma.$queryRaw`SELECT 1`;
    if (!realtime.isReady()) throw new Error('Subscription unavailable');
    res.json({ status: 'ready' });
  } catch { res.status(503).json({ status: 'unavailable' }); }
});

app.use('/api/v1/dashboard', require('./src/dashboard/router'));

app.use('/api/v1/rooms', roomRoutes);

// Spatial venue discovery endpoint across all 6 categories (restaurants, cafes, bars, cinema, desserts, activities)
app.get('/api/v1/places', sensitiveLimiter, async (req, res) => {
  try {
    const rawCategory = String(req.query.category || req.query.theme || 'restaurants').trim();
    const lat = req.query.lat ?? req.query.latitude;
    const lng = req.query.lng ?? req.query.longitude;
    const radius = Math.max(100, Math.min(50000, Number(req.query.radius) || 5000));
    const targetPlaces = Math.max(1, Math.min(50, Number(req.query.limit || req.query.targetPlaces) || 30));
    if ((lat != null && (!Number.isFinite(Number(lat)) || Math.abs(Number(lat)) > 90)) || (lng != null && (!Number.isFinite(Number(lng)) || Math.abs(Number(lng)) > 180))) return res.status(400).json({ success: false, error: 'INVALID_COORDINATES' });
    const isExactGps = req.query.is_exact_gps === 'true' || (lat != null && lng != null);

    const places = await discoverDiscoveryVenues({
      theme: rawCategory,
      latitude: lat,
      longitude: lng,
      radius,
      is_exact_gps: isExactGps,
      targetPlaces,
    });

    res.set('Cache-Control', 'public, max-age=120');
    return res.status(200).json({
      success: true,
      category: rawCategory,
      count: Array.isArray(places) ? places.length : 0,
      places: Array.isArray(places) ? places : [],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'DISCOVERY_FAILED',
      message: err.message || 'Failed to discover places.',
      places: [],
    });
  }
});

// Real venue photography endpoint (returns up to 4 real high-res CDN photos for any venue)
app.get('/api/v1/venue-photos', sensitiveLimiter, async (req, res) => {
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

// Community reviews & aggregated analytics endpoint for any venue
app.get('/api/v1/venues/insights', sensitiveLimiter, async (req, res) => {
  try {
    const { getVenueCommunityInsights } = require('./db/helpers');
    const name = String(req.query.name || '').trim();
    if (!name) {
      return res.json({ success: true, found: false, totalReviews: 0, recentReviews: [] });
    }
    const insights = await getVenueCommunityInsights(name);
    res.set('Cache-Control', 'public, max-age=15');
    return res.json({ success: true, ...insights });
  } catch {
    return res.json({ success: false, found: false, totalReviews: 0, recentReviews: [] });
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
    if (!result.success) return res.status(400).json(result);
    return res.status(200).json({
      success: true,
      message: 'Venue report submitted for review.',
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
app.get('/api/v1/options/game-poster', sensitiveLimiter, async (req, res) => {
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
app.get('/api/v1/options/autocomplete', sensitiveLimiter, async (req, res) => {
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
  const statusCode = Number.isInteger(err.status) ? err.status : (Number.isInteger(err.statusCode) ? err.statusCode : 500);
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

// Initialize Socket.io on HTTP server with restricted origins, 16KB max frame size,
// and perMessageDeflate disabled for 1000+ CCU low-memory/low-CPU efficiency
const io = new Server(httpServer, {
  allowRequest: (req, callback) => checkOrigin(req.headers.origin, callback),
  cors: {
    origin: checkOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 16 * 1024,
  perMessageDeflate: false,
  httpCompression: false,
  pingInterval: 25000,
  pingTimeout: 20000,
  transports: process.env.SOCKET_POLLING === 'true' ? ['websocket', 'polling'] : ['websocket'],
});
setIO(io);
app.set('io', coordinatedIO(io));
let realtime;
const ready = initializeRealtime(io).then(cluster => { realtime = cluster; return cluster; });
// Attach a rejection handler immediately; startup and tests also await this promise.
ready.catch(error => console.error('[Startup]', error.code || error.name));
io.httpServer.once('close', () => {
  io.of('/').adapter.close();
  realtime?.close().catch(() => {});
});

const { prisma } = require('./db/helpers');
const sessionStore = require('./src/sockets/socketSessionStore');
const { registerRoomSocketHandlers } = require('./src/sockets/roomSocketHandler');

// Initialize background TTL sweep for session store
sessionStore.initSessionStoreSweep(io);

const originalClose = io.close.bind(io);
io.close = async callback => {
  sessionStore.shuttingDown = true;
  await require('./src/state/roomCoordinator').drainRoomWork();
  return originalClose(callback);
};

// Wire real-time multiplayer socket events
io.on('connection', (socket) => {
  let messageCount = 0;
  let windowStart = Date.now();
  socket.use((packet, next) => {
    if (Date.now() - windowStart > 10000) { messageCount = 0; windowStart = Date.now(); }
    if (++messageCount > 100) { socket.emit('room_error', { message: 'Please slow down.' }); return; }
    if (packet[1] != null && (typeof packet[1] !== 'object' || Array.isArray(packet[1]))) return;
    next();
  });
  registerRoomSocketHandlers(io, socket, sessionStore);
});

const PORT = process.env.PORT || 3000;

httpServer.keepAliveTimeout = 65000;
httpServer.headersTimeout = 66000;
httpServer.maxRequestsPerSocket = 0;

if (require.main === module) {
  ready.then(() => {
    httpServer.listen(PORT, process.env.HOST || '0.0.0.0', 2048, () => {
      console.log(`Server listening on port ${PORT}`);
      initStorageSafeguard();
    });
  }).catch(() => process.exit(1));
}

// Gracefully handle process termination (Render deploys, container recycling, local ctrl-c)
// to immediately release PostgreSQL client connections and prevent connection pool exhaustion.
async function gracefulShutdown(signal) {
  console.log(`[Server] Received ${signal}. Draining sockets, closing HTTP server, and releasing database connections...`);
  io.close(async () => {
    try { await realtime?.close(); await prisma.$disconnect(); }
    catch (e) { console.error('[Shutdown]', e.code || e.name); }
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

module.exports = { app, httpServer, io, ready };

