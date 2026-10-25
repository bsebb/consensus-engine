const { fetchGooglePlaces } = require('../utils/googlePlaces');
const { fetchGeoapifyPlaces } = require('../utils/geoapifyPlaces');
const { searchRestaurants, fetchFoursquarePlaces } = require('../utils/foursquarePlaces');
const { resolveRegionalFallback, isInsideMoldovaRegion } = require('../utils/fallbackVenues');
const { filterReportedVenues } = require('../utils/reportedVenues');

// High-speed in-memory discovery deck cache (30-min TTL) for sub-millisecond room creation at 1000+ CCU
const discoveryDeckCache = new Map();
const DISCOVERY_CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_DISCOVERY_CACHE_SIZE = 500;

function setDiscoveryCache(key, places) {
  if (discoveryDeckCache.size >= MAX_DISCOVERY_CACHE_SIZE) {
    const oldest = discoveryDeckCache.keys().next().value;
    if (oldest) discoveryDeckCache.delete(oldest);
  }
  discoveryDeckCache.set(key, { places, expiresAt: Date.now() + DISCOVERY_CACHE_TTL_MS });
}

function buildOptionRecords(places = [], roomId) {
  if (!Array.isArray(places) || !roomId) return [];

  return places.map((place) => {
    const placeId = place.fsq_place_id || place.fsq_id || place.id || 'live_venue';
    const distKm = place.distance_km != null ? String(place.distance_km) : '';
    const addr = String(place.address || '').replace(/\|/g, ' ');
    const catLabel = String(place.category || '').replace(/\|/g, ' ');
    const coordPair = place.lat != null && place.lng != null ? `${place.lat},${place.lng}` : '';
    const rawPhoto = typeof place.photo_url === 'string'
      ? place.photo_url
      : (place.photo_url && typeof place.photo_url.photo_url === 'string' ? place.photo_url.photo_url : '');
    const photoUrl = String(rawPhoto || '').replace(/\|/g, '');
    const compositeId = `${placeId}|${distKm}|${addr}|${catLabel}|${coordPair}|${photoUrl}`;

    return {
      roomId,
      name: place.name,
      source: 'GOOGLE_API',
      googlePlaceId: compositeId,
      priceLevel: place.priceLevel ?? 2,
    };
  });
}

async function discoverDiscoveryVenues({
  theme = 'restaurant',
  latitude,
  longitude,
  radius = 5000,
  is_exact_gps = false,
  targetPlaces = 30,
}) {
  const normLat = latitude != null && !isNaN(Number(latitude)) ? Number(latitude) : 47.0225;
  const normLng = longitude != null && !isNaN(Number(longitude)) ? Number(longitude) : 28.8340;
  const cacheKey = `${String(theme).toLowerCase().trim()}_${normLat.toFixed(2)}_${normLng.toFixed(2)}_${radius}_${Boolean(is_exact_gps)}_${targetPlaces}`;

  const cachedDeck = discoveryDeckCache.get(cacheKey);
  if (cachedDeck && cachedDeck.expiresAt > Date.now()) {
    return filterReportedVenues(cachedDeck.places);
  }

  const hasGoogleKey = Boolean(
    (process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '').trim()
  );
  const hasGeoapifyKey = Boolean((process.env.GEOAPIFY_API_KEY || '').trim());
  const hasFoursquareKey = Boolean((process.env.FOURSQUARE_API_KEY || '').trim());

  let places = [];

  // Fast Path: When no paid third-party API keys are configured and coordinates are within the curated Moldova region,
  // resolve directly from the in-memory spatial catalog in <1ms and warm OSM towns asynchronously in the background.
  if (!hasGoogleKey && !hasGeoapifyKey && !hasFoursquareKey && isInsideMoldovaRegion(normLat, normLng)) {
    const instantPlaces = await resolveRegionalFallback(
      theme,
      normLat,
      normLng,
      is_exact_gps,
      targetPlaces,
      radius
    );
    const cleaned = filterReportedVenues(instantPlaces || []);
    if (cleaned.length > 0) {
      setDiscoveryCache(cacheKey, cleaned);
      return cleaned;
    }
  }

  if (hasGoogleKey) {
    try {
      places = await fetchGooglePlaces({
        theme,
        latitude: normLat,
        longitude: normLng,
        radius,
        targetPlaces,
        isExactGps: is_exact_gps,
      });
    } catch (err) {
      console.warn('[Google Places Error, falling back to spatial engine]:', err.message);
    }
  }

  // Zero-Cost Open Core: Query Geoapify (3,000 req/day free) if configured
  if ((!places || places.length === 0) && hasGeoapifyKey) {
    try {
      places = await fetchGeoapifyPlaces({
        theme,
        latitude: normLat,
        longitude: normLng,
        radius,
        targetPlaces,
        isExactGps: is_exact_gps,
      });
    } catch (err) {
      console.warn('[Geoapify Places Error, falling back]:', err.message);
    }
  }

  if (!places || places.length === 0) {
    const fetchFn = searchRestaurants || fetchFoursquarePlaces;
    places = await fetchFn({
      theme,
      latitude: normLat,
      longitude: normLng,
      radius,
      is_exact_gps,
      targetPlaces,
    });
  }

  // Purge reported closed spots
  places = filterReportedVenues(places || []);

  // Backfill up to targetPlaces using strict radius-bounded regional fallback
  if (!places || places.length < targetPlaces) {
    try {
      const fallbacks = await resolveRegionalFallback(
        theme,
        normLat,
        normLng,
        is_exact_gps,
        targetPlaces,
        radius
      );
      const existingNames = new Set((places || []).map((p) => (p.name || '').toLowerCase().trim()));
      const merged = [...(places || [])];
      for (const fb of (fallbacks || [])) {
        if (merged.length >= targetPlaces) break;
        const fbNorm = (fb.name || '').toLowerCase().trim();
        if (fbNorm && !existingNames.has(fbNorm)) {
          existingNames.add(fbNorm);
          merged.push(fb);
        }
      }
      places = merged;
    } catch (fbErr) {
      console.warn('[venueDiscoveryService] Regional fallback backfill notice:', fbErr.message);
    }
  }

  const finalPlaces = places || [];
  if (finalPlaces.length > 0) {
    setDiscoveryCache(cacheKey, finalPlaces);
  }
  return finalPlaces;
}

async function expandRoomVenues({
  room,
  latitude,
  longitude,
  radius = 5000,
  is_exact_gps = false,
  targetCount = 10,
}) {
  if (!room) return [];

  const theme = room.theme || 'restaurant';
  const existingOptions = room.options || [];
  const existingNames = new Set(existingOptions.map((o) => (o.name || '').toLowerCase().trim()));

  // Resolve candidates strictly respecting the search radius
  const candidatePlaces = await resolveRegionalFallback(
    theme,
    latitude,
    longitude,
    is_exact_gps,
    60,
    radius
  );

  const newPlaces = (candidatePlaces || []).filter((p) => {
    const nameNorm = (p.name || '').toLowerCase().trim();
    return nameNorm && !existingNames.has(nameNorm);
  }).slice(0, targetCount);

  return newPlaces;
}

module.exports = {
  buildOptionRecords,
  discoverDiscoveryVenues,
  expandRoomVenues,
};
