const fs = require('fs');
const path = require('path');
const { enrichVenuesWithRoadDistances, formatPriceLabel } = require('./foursquarePlaces');

const GOOGLE_API_KEY = (
  process.env.GOOGLE_PLACES_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  ''
).trim().replace(/^["']|["']$/g, '');

const CACHE_FILE = path.resolve(__dirname, '../../data/google_places_cache.json');
const CACHE_TTL_MS = 21 * 24 * 60 * 60 * 1000; // 21 days TTL

// Load persisted cache from disk if available
const memoryCache = new Map();
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    for (const [k, v] of Object.entries(parsed)) {
      if (Date.now() - v.timestamp < CACHE_TTL_MS) {
        memoryCache.set(k, v);
      }
    }
  }
} catch {
  // Silent fail on cache init
}

const MAX_CACHE_ENTRIES = 500;

function setBoundedCache(map, key, value, maxEntries = MAX_CACHE_ENTRIES) {
  if (map.size >= maxEntries) {
    const oldestKey = map.keys().next().value;
    if (oldestKey) map.delete(oldestKey);
  }
  map.set(key, value);
}

function persistCacheToDisk() {
  try {
    const obj = {};
    for (const [k, v] of memoryCache.entries()) {
      obj[k] = v;
    }
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch {
    // Silent fail on disk write
  }
}

function getGoogleTypesForTheme(theme = '') {
  const norm = String(theme || '').toLowerCase().trim();
  if (norm.includes('cinema') || norm.includes('movie') || norm.includes('film')) {
    return ['movie_theater'];
  }
  if (norm.includes('cafe') || norm.includes('coffee') || norm.includes('tea')) {
    return ['cafe', 'coffee_shop'];
  }
  if (norm.includes('bar') || norm.includes('pub') || norm.includes('beer') || norm.includes('wine')) {
    return ['bar', 'pub', 'cocktail_bar', 'wine_bar'];
  }
  if (norm.includes('dessert') || norm.includes('sweet') || norm.includes('bakery') || norm.includes('gelato') || norm.includes('ice cream')) {
    return ['bakery', 'ice_cream_shop', 'dessert_shop'];
  }
  return ['restaurant', 'pizza_restaurant', 'hamburger_restaurant', 'meal_takeaway', 'seafood_restaurant', 'steak_house'];
}

function parseGooglePriceLevel(priceLevel) {
  if (priceLevel === 'PRICE_LEVEL_INEXPENSIVE') return 1;
  if (priceLevel === 'PRICE_LEVEL_MODERATE') return 2;
  if (priceLevel === 'PRICE_LEVEL_EXPENSIVE') return 3;
  if (priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE') return 4;
  return 2;
}

/**
 * Searches Google Places API (New) (v1/places:searchNearby)
 * Strictly adheres to 2026 pricing & FieldMask to control SKU usage.
 */
async function fetchGooglePlaces({
  theme = 'restaurant',
  latitude,
  longitude,
  radius = 5000,
  targetPlaces = 6,
  isExactGps = false,
}) {
  const apiKey = (
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    GOOGLE_API_KEY
  ).trim().replace(/^["']|["']$/g, '');

  if (!apiKey) {
    throw new Error('MISSING_GOOGLE_API_KEY');
  }

  const latNum = Number(latitude);
  const lngNum = Number(longitude);
  const searchRadius = Math.max(500, Math.min(50000, Math.round(radius)));
  const types = getGoogleTypesForTheme(theme);
  const targetCount = Math.max(3, Math.min(30, Number(targetPlaces) || 30));

  const cacheKey = `gplaces_v1_${theme}_${latNum.toFixed(3)}_${lngNum.toFixed(3)}_${searchRadius}_${targetCount}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // FieldMask Controls Billing SKU:
  // Request only operational fields, displayName, location, photos, rating, and openNow
  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.primaryType',
    'places.businessStatus',
    'places.photos',
    'places.currentOpeningHours.openNow',
    'places.rating',
    'places.userRatingCount',
    'places.priceLevel',
  ].join(',');

  const body = {
    includedTypes: types,
    maxResultCount: 20,
    rankPreference: 'POPULARITY',
    locationRestriction: {
      circle: {
        center: { latitude: latNum, longitude: lngNum },
        radius: searchRadius,
      },
    },
  };

  const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Google Places API Error (${response.status}): ${errText}`);
  }

  const payload = await response.json();
  const rawPlaces = Array.isArray(payload.places) ? payload.places : [];

  // Rejection filter for permanently/temporarily closed spots
  const operational = rawPlaces.filter((p) => {
    if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') return false;
    const nameLower = (p.displayName?.text || '').toLowerCase();
    const defunct = /\b(odeon|flac[aă]ra|gaudeamus|moscova|patria r[iî][sș]cani|smokehouse|barbar|propaganda|hostaria amarcord|casa dac[aă]|casa[\s\-_]*mare|the york pub|morimoto|ava 1727|havana mama)\b/i;
    if (defunct.test(nameLower)) return false;
    return true;
  });

  if (operational.length === 0) {
    throw new Error('NO_GOOGLE_PLACES_FOUND');
  }

  const mapped = operational.slice(0, targetCount).map((p) => {
    const photoRef = p.photos?.[0]?.name || null;
    const priceNum = parseGooglePriceLevel(p.priceLevel);
    const photoUrl = photoRef
      ? `/api/v1/places/photo?ref=${encodeURIComponent(photoRef)}`
      : null;

    return {
      fsq_id: p.id,
      fsq_place_id: p.id,
      name: p.displayName?.text || 'Local Venue',
      category: p.primaryType ? p.primaryType.replace(/_/g, ' ') : 'Venue',
      address: p.formattedAddress || 'Local Area',
      price_level: priceNum,
      priceLevel: priceNum,
      priceLabel: formatPriceLabel(priceNum),
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      open_now: p.currentOpeningHours?.openNow ?? null,
      rating: p.rating ? Number(p.rating.toFixed(1)) : 4.5,
      reviews: p.userRatingCount || 100,
      photo_url: photoUrl,
      distance_km: null,
    };
  });

  const enriched = await enrichVenuesWithRoadDistances(latNum, lngNum, mapped, isExactGps);

  setBoundedCache(memoryCache, cacheKey, { timestamp: Date.now(), data: enriched });
  persistCacheToDisk();

  return enriched;
}

const GOOGLE_PHOTO_REF_REGEX = /^places\/[A-Za-z0-9_-]{1,128}\/photos\/[A-Za-z0-9_-]{1,512}$/;
const ALLOWED_GOOGLE_CDN_HOSTS = /^(lh[3-6]\.googleusercontent\.com|places\.googleapis\.com)$/i;

/**
 * Resolves a Google Places (New) photo media reference to an authenticated CDN URL.
 * Strictly verifies photoRef syntax and allowed CDN hostnames to prevent SSRF and open redirects.
 */
async function resolveGooglePhotoMedia(photoRef) {
  const apiKey = (
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    GOOGLE_API_KEY
  ).trim().replace(/^["']|["']$/g, '');

  if (!apiKey || !photoRef || !GOOGLE_PHOTO_REF_REGEX.test(photoRef)) return null;

  try {
    const endpoint = `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=800&skipHttpRedirect=true&key=${apiKey}`;
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.photoUri || typeof data.photoUri !== 'string') return null;

    const parsed = new URL(data.photoUri);
    if (parsed.protocol !== 'https:' || !ALLOWED_GOOGLE_CDN_HOSTS.test(parsed.hostname)) {
      return null;
    }

    return data.photoUri;
  } catch {
    return null;
  }
}

module.exports = {
  fetchGooglePlaces,
  resolveGooglePhotoMedia,
  getGoogleTypesForTheme,
};
