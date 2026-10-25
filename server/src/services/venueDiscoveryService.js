const { fetchGooglePlaces } = require('../utils/googlePlaces');
const { fetchGeoapifyPlaces } = require('../utils/geoapifyPlaces');
const { searchRestaurants, fetchFoursquarePlaces } = require('../utils/foursquarePlaces');
const { resolveRegionalFallback, isInsideMoldovaRegion, calculateDistance, formatPriceLabel } = require('../utils/fallbackVenues');
const { resolveVenuePhotosBatch, getCanonicalVenueKey } = require('../utils/venuePhotoService');
const { filterReportedVenues } = require('../utils/reportedVenues');
const { getCachedVenuesByGrid, saveCachedVenuesBulk, getCommunityAnalyticsByNameMap } = require('../../db/helpers');

function deduplicateDiscoveryPlaces(places = []) {
  if (!Array.isArray(places)) return [];
  const seenKeys = new Set();
  const result = [];
  for (const p of places) {
    if (!p || !p.name) continue;
    const normName = String(p.name).toLowerCase().trim();
    const cKey = getCanonicalVenueKey(p.name) || normName;
    if (seenKeys.has(cKey) || seenKeys.has(normName)) continue;
    seenKeys.add(cKey);
    seenKeys.add(normName);
    result.push({
      ...p,
      priceLevel: p.priceLevel ?? 2,
      priceLabel: p.priceLabel || formatPriceLabel(p.priceLevel ?? 2, p.lat, p.lng),
    });
  }
  return result;
}

// High-speed in-memory discovery deck cache (30-min TTL) for sub-millisecond room creation at 1000+ CCU
const discoveryDeckCache = new Map();
const persistedGridKeys = new Set();
const DISCOVERY_CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_DISCOVERY_CACHE_SIZE = 500;

function setDiscoveryCache(key, places) {
  if (discoveryDeckCache.size >= MAX_DISCOVERY_CACHE_SIZE) {
    const oldest = discoveryDeckCache.keys().next().value;
    if (oldest) discoveryDeckCache.delete(oldest);
  }
  discoveryDeckCache.set(key, { places, expiresAt: Date.now() + DISCOVERY_CACHE_TTL_MS });
}

function getGridKey(theme = 'restaurant', lat = 47.0225, lng = 28.8340) {
  const normTheme = String(theme).toLowerCase().trim();
  const cat = normTheme.includes('cinema') ? 'cinema'
    : normTheme.includes('cafe') ? 'cafes'
    : normTheme.includes('bar') ? 'bars'
    : normTheme.includes('dessert') ? 'desserts'
    : (normTheme.includes('activit') || normTheme.includes('fun') || normTheme.includes('distraction')) ? 'activities'
    : 'restaurants';
  // Round to 0.05 deg (~5km grid cell) so nearby users in the same city share the DB venue cache
  const gLat = (Math.round(Number(lat) * 20) / 20).toFixed(2);
  const gLng = (Math.round(Number(lng) * 20) / 20).toFixed(2);
  return `${cat}_${gLat}_${gLng}`;
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

  const gridKey = getGridKey(theme, normLat, normLng);

  const hasGoogleKey = Boolean(
    (process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '').trim()
  );
  const hasGeoapifyKey = Boolean((process.env.GEOAPIFY_API_KEY || '').trim());
  const hasFoursquareKey = Boolean((process.env.FOURSQUARE_API_KEY || '').trim());

  let places = [];

  // Fast Path 1: When no paid third-party API keys are configured and coordinates are within the curated Moldova region,
  // resolve directly from the in-memory spatial catalog in <1ms and persist to Neon cached_venues in the background.
  if (!hasGoogleKey && !hasGeoapifyKey && !hasFoursquareKey && isInsideMoldovaRegion(normLat, normLng)) {
    const instantPlaces = await resolveRegionalFallback(
      theme,
      normLat,
      normLng,
      is_exact_gps,
      targetPlaces,
      radius
    );
    const cleaned = deduplicateDiscoveryPlaces(
      await resolveVenuePhotosBatch(filterReportedVenues(instantPlaces || []))
    );
    if (cleaned.length > 0) {
      setDiscoveryCache(cacheKey, cleaned);
      if (!persistedGridKeys.has(gridKey)) {
        persistedGridKeys.add(gridKey);
        saveCachedVenuesBulk(gridKey, cleaned).catch(() => {});
      }
      return cleaned;
    }
  }

  // Fast Path 2: L2 Persistent Neon Database Cache for any city/location worldwide
  const dbCachedVenues = await getCachedVenuesByGrid(gridKey, targetPlaces);
  if (Array.isArray(dbCachedVenues) && dbCachedVenues.length >= Math.min(6, targetPlaces)) {
    const hydratedFromDb = dbCachedVenues.map((row) => {
      const distMeters = calculateDistance(normLat, normLng, row.lat, row.lng);
      const roadMeters = Math.round(distMeters * 1.24);
      const distKm = is_exact_gps ? Math.max(0.1, Number((roadMeters / 1000).toFixed(1))) : null;
      return {
        name: row.name,
        fsq_id: `db_${row.id.slice(0, 8)}`,
        fsq_place_id: `db_${row.id.slice(0, 8)}`,
        category: row.category,
        priceLevel: row.priceLevel ?? 2,
        priceLabel: formatPriceLabel(row.priceLevel ?? 2, row.lat, row.lng),
        lat: row.lat,
        lng: row.lng,
        distance_meters: roadMeters,
        distance_km: distKm,
        address: row.address || row.locality || 'Local Venue',
        locality: row.locality || '',
        rating: row.rating ?? 4.5,
        reviews: row.reviews ?? 120,
        photo_url: row.photoUrl || null,
      };
    }).sort((a, b) => a.distance_meters - b.distance_meters);

    const cleanedDb = deduplicateDiscoveryPlaces(
      await resolveVenuePhotosBatch(filterReportedVenues(hydratedFromDb))
    );
    if (cleanedDb.length > 0) {
      setDiscoveryCache(cacheKey, cleanedDb);
      persistedGridKeys.add(gridKey);
      return cleanedDb;
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
  // (For international searches outside Moldova, only query expanded OSM if fewer than 6 places were found)
  const shouldBackfill = isInsideMoldovaRegion(normLat, normLng)
    ? (!places || places.length < targetPlaces)
    : (!places || places.length < 6);
  if (shouldBackfill) {
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

  const finalPlaces = deduplicateDiscoveryPlaces(
    await resolveVenuePhotosBatch(places || [])
  );
  if (finalPlaces.length > 0) {
    try {
      const analyticsMap = await getCommunityAnalyticsByNameMap();
      if (analyticsMap && analyticsMap.size > 0) {
        for (const p of finalPlaces) {
          const a = analyticsMap.get(String(p.name || '').toLowerCase().trim());
          if (a) {
            p.community_rating = Number(a.satisfactionAvg.toFixed(1));
            p.community_reviews = a.totalReviews;
          }
        }
        finalPlaces.sort((a, b) => {
          const boostA = a.community_rating ? (a.community_rating >= 4.2 ? 1 : a.community_rating <= 2.5 ? -1 : 0) : 0;
          const boostB = b.community_rating ? (b.community_rating >= 4.2 ? 1 : b.community_rating <= 2.5 ? -1 : 0) : 0;
          return boostB - boostA;
        });
      }
    } catch {}
    setDiscoveryCache(cacheKey, finalPlaces);
    if (!persistedGridKeys.has(gridKey)) {
      persistedGridKeys.add(gridKey);
      saveCachedVenuesBulk(gridKey, finalPlaces).catch(() => {});
    }
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
