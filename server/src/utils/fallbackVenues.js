const { resolveVenuePhotosBatch } = require('./venuePhotoService');
const { CATEGORIZED_FALLBACKS, CHISINAU_CENTER, STRASENI_CENTER } = require('../data/curatedVenues');

function formatPriceLabel(price, lat = null, lng = null) {
  const isMoldova = isInsideMoldovaRegion(lat, lng);
  if (!isMoldova) {
    const isAmericas = lng != null && Number(lng) < -30;
    const isUk = lat != null && lng != null && Number(lat) >= 49.9 && Number(lat) <= 60.9 && Number(lng) >= -8.6 && Number(lng) <= 1.8;
    const sym = isAmericas ? '$' : isUk ? '£' : '€';
    const map = {
      1: `${sym} (Budget: <${sym}15)`,
      2: `${sym}${sym} (Moderate: ${sym}15-${sym}30)`,
      3: `${sym}${sym}${sym} (Upscale: ${sym}30-${sym}60)`,
      4: `${sym}${sym}${sym}${sym} (Fine Dining: ${sym}60+)`,
    };
    return map[price] || map[2];
  }
  const map = {
    1: "$ (Budget: ~80-150 MDL)",
    2: "$$ (Moderate: ~150-300 MDL)",
    3: "$$$ (Upscale: ~300-500 MDL)",
    4: "$$$$ (Fine Dining: 500+ MDL)"
  };
  return map[price] || "$$ (Moderate: ~150-300 MDL)";
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isInsideMoldovaRegion(lat, lng) {
  if (lat == null || lng == null) return true;
  return lat >= 45.4 && lat <= 48.6 && lng >= 26.6 && lng <= 30.3;
}

/**
 * Searches OpenStreetMap in an expanded radius when a user selects a suburban
 * or regional centroid where initial radius yields 0 venues.
 */
async function searchExpandedOsmVenues(lat, lng, theme = 'restaurant', isExactGps = false, targetCount = 6) {
  if (lat == null || lng == null) return [];

  const term = theme.toLowerCase().includes('cafe') || theme.toLowerCase().includes('coffee')
    ? 'cafe'
    : theme.toLowerCase().includes('bar')
    ? 'bar'
    : theme.toLowerCase().includes('dessert')
    ? 'bakery'
    : theme.toLowerCase().includes('cinema')
    ? 'cinema'
    : 'restaurant';

  for (const radiusMeters of [8000, 16000, 24000]) {
    try {
      const dLat = radiusMeters / 111320;
      const dLng = radiusMeters / Math.max(1, 111320 * Math.cos((lat * Math.PI) / 180));
      const viewbox = `${(lng - dLng).toFixed(5)},${(lat + dLat).toFixed(5)},${(lng + dLng).toFixed(5)},${(lat - dLat).toFixed(5)}`;
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(term)}&viewbox=${viewbox}&bounded=1&limit=30&addressdetails=1&accept-language=en,ro`;

      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'NoYouPick/1.0 (https://noyoupick.org; contact@noyoupick.org)',
        },
        signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
      });

      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) continue;

      const valid = data.filter((d) => d.name && d.lat != null && d.lon != null);
      if (valid.length === 0) continue;

      const candidates = valid.slice(0, targetCount).map((d) => {
        const placeLat = parseFloat(d.lat);
        const placeLng = parseFloat(d.lon);
        const distMeters = calculateDistance(lat, lng, placeLat, placeLng);
        const distKm = isExactGps ? Math.max(0.1, Number((distMeters / 1000).toFixed(1))) : null;

        const addr = d.address || {};
        const locality = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state || '';
        const street = [addr.road, addr.house_number].filter(Boolean).join(' ');
        const fullAddr = [street, locality].filter(Boolean).join(', ') || d.display_name?.split(',').slice(0, 2).join(', ') || 'Local Venue';

        return {
          name: d.name,
          fsq_id: `osm_exp_${d.place_id}`,
          fsq_place_id: `osm_exp_${d.place_id}`,
          category: term === 'cafe' ? 'Coffee & Café' : term === 'bar' ? 'Bar & Pub' : term === 'cinema' ? 'Movie Theater' : 'Restaurant',
          priceLevel: 2,
          priceLabel: "$$ (Moderate)",
          lat: placeLat,
          lng: placeLng,
          distance_meters: Math.round(distMeters),
          distance_km: distKm,
          address: fullAddr,
        };
      });

      return await resolveVenuePhotosBatch(candidates);
    } catch {
      // Continue to next radius expansion
    }
  }

  return [];
}

/**
 * Resolves fallback venues with strict spatial radius enforcement.
 * Ensures searches in Chișinău never return venues from Strășeni or vice-versa.
 */
async function resolveRegionalFallback(
  theme = '',
  centerLat = 47.0225,
  centerLng = 28.8340,
  isExactGps = false,
  targetCount = 30,
  radius = 5000
) {
  // If coordinates are outside Moldova, resolve genuine regional venues via expanded radius search
  // and never mix in Moldova-specific fallback venues for international locations
  if (!isInsideMoldovaRegion(centerLat, centerLng)) {
    const regionalVenues = await searchExpandedOsmVenues(centerLat, centerLng, theme, isExactGps, targetCount);
    return regionalVenues.slice(0, targetCount);
  }

  const key = theme.toLowerCase().includes('cinema') ? 'cinema' :
    theme.toLowerCase().includes('cafe') ? 'cafes' :
    theme.toLowerCase().includes('bar') ? 'bars' :
    theme.toLowerCase().includes('dessert') ? 'desserts' :
    theme.toLowerCase().includes('activit') || theme.toLowerCase().includes('bowling') || theme.toLowerCase().includes('arcade') ? 'activities' :
    'restaurants';

  const rawPlaces = CATEGORIZED_FALLBACKS[key] || CATEGORIZED_FALLBACKS.restaurants;
  const searchRadiusMeters = Math.max(Number(radius) || 5000, 1500);

  const distToChisinau = calculateDistance(centerLat, centerLng, CHISINAU_CENTER.lat, CHISINAU_CENTER.lng);
  const distToStraseni = calculateDistance(centerLat, centerLng, STRASENI_CENTER.lat, STRASENI_CENTER.lng);

  const withDistance = rawPlaces.map((p) => {
    const distMeters = (centerLat != null && centerLng != null && p.lat && p.lng)
      ? calculateDistance(centerLat, centerLng, p.lat, p.lng)
      : 1500;
    const distKm = isExactGps ? Math.max(0.1, Number((distMeters / 1000).toFixed(1))) : null;

    return {
      name: p.name,
      fsq_id: p.fsq_id,
      fsq_place_id: p.fsq_id,
      category: p.category || 'Local Favorite',
      priceLevel: p.priceLevel ?? 2,
      priceLabel: p.priceLabel || formatPriceLabel(p.priceLevel ?? 2),
      distance_km: distKm,
      distance_meters: Math.round(distMeters),
      address: p.address,
      locality: p.locality,
      lat: p.lat,
      lng: p.lng,
    };
  });

  // Strict radius & locality boundaries:
  // 1. If searching in/around Chișinău (within 15km of Chișinău center), exclude Strășeni venues
  // 2. If searching in Strășeni (within 10km of Strășeni center), exclude Chișinău venues
  // 3. Distance must not exceed maximum sensible radius for the search
  const maxAllowedDistance = Math.min(Math.max(searchRadiusMeters * 1.5, 6000), 12000);

  let filtered = withDistance.filter((p) => {
    if (distToChisinau <= 15000 && p.locality === 'Strășeni') {
      return false;
    }
    if (distToStraseni <= 10000 && p.locality === 'Chișinău') {
      return false;
    }
    return p.distance_meters <= maxAllowedDistance;
  });

  // If in Chișinău metropolitan area and filtered count is lower than targetCount,
  // expand radius within Chișinău (up to 18km) so users can access the full catalog
  if (distToChisinau <= 18000 && filtered.length < targetCount) {
    const chisinauExpanded = withDistance.filter((p) => p.locality === 'Chișinău');
    if (chisinauExpanded.length > filtered.length) {
      filtered = chisinauExpanded;
    }
  }

  // If filtered pool is empty (e.g. searching in Bălți, Cahul, or other towns), query OSM
  if (filtered.length === 0) {
    const osmCandidates = await searchExpandedOsmVenues(centerLat, centerLng, theme, isExactGps, targetCount);
    if (osmCandidates.length > 0) {
      return osmCandidates.slice(0, targetCount);
    }
    // Absolute fallback: sort by raw distance
    filtered = [...withDistance];
  }

  // Sort strictly by distance ascending
  filtered.sort((a, b) => a.distance_meters - b.distance_meters);
  const places = filtered.slice(0, targetCount);

  return await resolveVenuePhotosBatch(places);
}

module.exports = {
  CATEGORIZED_FALLBACKS,
  resolveRegionalFallback,
  isInsideMoldovaRegion,
  searchExpandedOsmVenues,
  formatPriceLabel,
  calculateDistance,
};
