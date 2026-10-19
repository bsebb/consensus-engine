const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const net = require('net');

const SERVER_DATA_DIR = path.join(__dirname, '../../data');
const ROOT_DATA_DIR = path.join(__dirname, '../../../data');
const CACHE_FILE = fs.existsSync(SERVER_DATA_DIR)
  ? path.join(SERVER_DATA_DIR, 'venue_photos.json')
  : path.join(ROOT_DATA_DIR, 'venue_photos.json');

function getCanonicalVenueKey(name = '') {
  let clean = String(name || '').toLowerCase().trim();
  clean = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  clean = clean.replace(/['’"`\-_.,/\\()&!]/g, '');
  clean = clean.replace(/\b(restaurant|restaurante|pizzeria|pizza|cafe|café|bar|pub|bistro|grill|terrace|terasa|lounge|club|la)\b/gi, '');
  return clean.replace(/\s+/g, '').trim();
}

// Pre-seeded verified venue photos for instant 0ms responses
const SEED_CACHE = {
  // Strășeni verified venues
  "alindor": "https://img.restaurantguru.com/w550/h367/re5f-Alindor-Pizza-exterior.jpg",
  "struguras": "https://www.struguras.md/imagini/foto/full/77728_sala_ospatarie_1.jpg",
  "laculverde": "https://honeypot0.s3.amazonaws.com/1701624490479-gallery-VGHT7346.webp",
  "hanulpescarului": "https://www.visualbrand.ro/wp-content/uploads/2026/01/hanul-pescarilor1.jpg",
  "delice": "https://img.restaurantguru.com/w550/h367/r3f3-interior-Delice-2021-08.jpg",
  "coffeelike": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=85",
  "tucano": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85",
  "cremedelacreme": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85",
  "coffeemolka": "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=900&q=85",
  "dcdonuts": "https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?auto=format&fit=crop&w=900&q=85",

  // Chișinău verified venues
  "azasu": "https://qmzxbjlpwqkagcyhcglm.supabase.co/storage/v1/object/public/place-photos/places/google-1778416720729-i713zi6pcod.webp",
  "placinte": "https://visit.chisinau.md/wp-content/uploads/2021/08/la-placinte2-1.jpg",
  "grekofresh": "https://grekofresh.md/wp-content/uploads/2020/10/restraraunt-photo-02-500x330.jpg",
  "box": "https://img.restaurantguru.com/cda1-Restaurant-CHIBOX-photo.jpg",
  "pannicotta": "https://img.restaurantguru.com/c3db-Cafe-Panna-Cotta-interior-2.jpg",
  "pannicotto": "https://img.restaurantguru.com/c3db-Cafe-Panna-Cotta-interior-2.jpg",
  "rozmarin": "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/0b/08/a3/c9/rozmarin-cafe-interior.jpg?w=500&h=-1&s=1",
  "osho": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=85",
  "mipiace": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=85",
  "andys": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=85",
  "pizzamania": "https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?auto=format&fit=crop&w=900&q=85",
  "pegas": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=85",
  "cineplexloteanu": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=85",
  "cineplexmalldova": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=85",
  "autocinemachisinau": "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=900&q=85",
  "privatecinemalounge": "https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=900&q=85",
  "cinematografulinaerliber": "https://images.unsplash.com/photo-1574267432553-4b4628081c31?auto=format&fit=crop&w=900&q=85",
  "moviehallchisinau": "https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=900&q=85",
  "marlene": "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=85",
  "fuior": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=85",
  "gioelia": "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=900&q=85",
  "covorbar": "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=900&q=85",
  "trattoriadellanonna": "https://img.restaurantguru.com/c7ae-Ristorante-Trattoria-della-Nonna-interior.jpg",
};

const memoryCache = new Map(Object.entries(SEED_CACHE));

function loadPersistentCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      for (const [k, v] of Object.entries(data)) {
        if (k && v && typeof v === 'string') {
          memoryCache.set(k, v);
        }
      }
    }
  } catch {}
}

const MAX_CACHE_ENTRIES = 500;
function setBoundedCache(map, key, value, maxEntries = MAX_CACHE_ENTRIES) {
  if (map.size >= maxEntries) {
    const oldestKey = map.keys().next().value;
    if (oldestKey) map.delete(oldestKey);
  }
  map.set(key, value);
}

function isPrivateIp(ip) {
  if (!ip) return true;
  let cleanIp = String(ip).toLowerCase().trim();
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.replace('::ffff:', '');
  }

  if (net.isIPv4(cleanIp)) {
    const parts = cleanIp.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return true;
    if (parts[0] === 0) return true; // 0.0.0.0/8
    if (parts[0] === 10) return true; // 10.0.0.0/8
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // 100.64.0.0/10 (CG-NAT)
    if (parts[0] === 127) return true; // 127.0.0.0/8 (All Loopback)
    if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16 (Link-local & IMDS)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
    if (parts[0] >= 224) return true; // Multicast & Reserved
    return false;
  }

  if (net.isIPv6(cleanIp)) {
    if (cleanIp === '::1' || cleanIp === '::') return true;
    if (/^f[cd][0-9a-f]{2}:/i.test(cleanIp)) return true; // ULA fc00::/7
    if (/^fe[89ab][0-9a-f]:/i.test(cleanIp)) return true; // Link-local fe80::/10
    if (/^::ffff:(?:127|10|169\.254|172\.(?:1[6-9]|2\d|3[01])|192\.168)/i.test(cleanIp)) return true;
    return false;
  }

  return true;
}

async function isSafeExternalUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase().replace(/^[\[]|[\]]$/g, '');

    if (
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.corp') ||
      host.endsWith('.home') ||
      host.endsWith('.onion')
    ) {
      return false;
    }

    if (net.isIP(host)) {
      return !isPrivateIp(host);
    }

    const records = await dns.lookup(host, { all: true }).catch(() => []);
    if (!records || records.length === 0) return false;
    for (const rec of records) {
      if (isPrivateIp(rec.address)) return false;
    }

    return true;
  } catch {
    return false;
  }
}

let saveTimeout = null;
function queueSavePersistentCache() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const dir = path.dirname(CACHE_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const obj = Object.fromEntries(memoryCache.entries());
      fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch {}
  }, 1000);
  if (saveTimeout.unref) saveTimeout.unref();
}

loadPersistentCache();

/**
 * Searches the web for an authentic venue photo and validates the URL.
 */
async function fetchOnlineVenuePhoto(name, locality = '', address = '') {
  if (!name || typeof name !== 'string') return null;
  const cleanName = name.trim();
  // Never perform web image queries for street addresses or generic words
  if (/^(strada|str\.|bd\.|bulevardul|b-dul|calea|șoseaua|soseaua|aleea|ул\.|улица)\b/i.test(cleanName)) {
    return null;
  }
  const loc = locality || (address ? address.split(',').slice(-2).join(' ').trim() : '');
  const query = `${cleanName} ${loc} venue interior photo`.trim();
  try {
    const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
    });
    if (!tokenRes.ok) return null;
    const html = await tokenRes.text();
    const vqdMatch = html.match(/vqd=([0-9-]+)/);
    if (!vqdMatch) return null;

    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqdMatch[1]}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
      }
    );
    if (!imgRes.ok) return null;
    const data = await imgRes.json();
    const results = Array.isArray(data.results) ? data.results : [];

    for (const item of results.slice(0, 5)) {
      const url = item.image;
      if (!url || typeof url !== 'string' || !(await isSafeExternalUrl(url))) continue;
      if (url.includes('lookaside.fbsbx') || url.includes('favicon') || url.includes('icon')) continue;

      try {
        const probe = await fetch(url, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
          redirect: 'error',
          signal: AbortSignal.timeout ? AbortSignal.timeout(2200) : undefined,
        });
        const ct = probe.headers.get('content-type') || '';
        if (probe.ok && (ct.startsWith('image/') || ct.includes('octet-stream'))) {
          return url;
        }
      } catch {}
    }
  } catch {}
  return null;
}

/**
 * Resolves a real photo for a venue, using the persistent cache or dynamic lookup.
 */
async function resolveVenuePhoto(name = '', locality = '', address = '', category = '') {
  const cleanName = String(name || '').trim();
  if (!cleanName) return null;

  const cKey = getCanonicalVenueKey(cleanName);
  if (!cKey) return null;

  // 1. Instant cache hit
  if (memoryCache.has(cKey)) {
    return memoryCache.get(cKey);
  }

  // Check substring root match against cached keys
  for (const [key, cachedUrl] of memoryCache.entries()) {
    if (cKey === key || (cKey.length >= 4 && key.length >= 4 && (cKey.includes(key) || key.includes(cKey)))) {
      return cachedUrl;
    }
  }

  // 2. Dynamic online search
  const onlinePhoto = await fetchOnlineVenuePhoto(cleanName, locality, address);
  if (onlinePhoto) {
    setBoundedCache(memoryCache, cKey, onlinePhoto);
    queueSavePersistentCache();
    return onlinePhoto;
  }

  return null;
}

/**
 * Batch resolves photos for a list of candidates in parallel without delaying the caller.
 */
async function resolveVenuePhotosBatch(venues = [], locality = '') {
  if (!Array.isArray(venues) || venues.length === 0) return venues;

  const enriched = await Promise.all(
    venues.map(async (v) => {
      if (v.photo_url) return v;
      try {
        const photo = await resolveVenuePhoto(v.name, locality || v.address, v.address, v.category);
        return {
          ...v,
          photo_url: photo || null,
        };
      } catch {
        return v;
      }
    })
  );

  return enriched;
}

module.exports = {
  resolveVenuePhoto,
  resolveVenuePhotosBatch,
  getCanonicalVenueKey,
};
