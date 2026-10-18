const { resolveVenuePhotosBatch, resolveVenuePhoto } = require('./venuePhotoService');
const { filterReportedVenues } = require('./reportedVenues');

const geoapifyCache = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function mapThemeToGeoapifyCategories(theme = '') {
  const norm = String(theme).toLowerCase().trim();
  if (norm.includes('cinema') || norm.includes('movie') || norm.includes('film')) {
    return 'entertainment.cinema';
  }
  if (norm.includes('cafe') || norm.includes('coffee') || norm.includes('tea')) {
    return 'catering.cafe';
  }
  if (norm.includes('bar') || norm.includes('pub') || norm.includes('beer') || norm.includes('wine')) {
    return 'catering.bar,catering.pub';
  }
  if (norm.includes('dessert') || norm.includes('sweet') || norm.includes('bakery') || norm.includes('ice cream')) {
    return 'catering.ice_cream,commercial.pastry,commercial.bakery';
  }
  if (norm.includes('fast') || norm.includes('burger') || norm.includes('pizza') || norm.includes('shawarma')) {
    return 'catering.fast_food,catering.restaurant.pizza';
  }
  return 'catering.restaurant,catering.cafe,catering.fast_food,catering.bar';
}

function determinePriceLevel(properties = {}) {
  const categories = Array.isArray(properties.categories) ? properties.categories.join(' ') : '';
  if (categories.includes('fine_dining') || categories.includes('luxury')) return 3;
  if (categories.includes('fast_food') || categories.includes('bakery')) return 1;
  return 2;
}

async function fetchGeoapifyPlaces({
  theme = 'restaurant',
  latitude,
  longitude,
  radius = 5000,
  targetPlaces = 6,
  isExactGps = false,
}) {
  const apiKey = (process.env.GEOAPIFY_API_KEY || '').trim();
  if (!apiKey) {
    return null;
  }

  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);
  if (isNaN(latNum) || isNaN(lngNum)) {
    return null;
  }

  const radiusNum = Math.min(Math.max(parseInt(radius, 10) || 5000, 1000), 50000);
  // Grid cache key rounded to ~110m (3 decimals) to maximize cache hits across groups
  const cacheKey = `${latNum.toFixed(3)}:${lngNum.toFixed(3)}:${radiusNum}:${theme}`;
  const cached = geoapifyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data.slice(0, targetPlaces);
  }

  const categories = mapThemeToGeoapifyCategories(theme);
  const url = `https://api.geoapify.com/v2/places?categories=${categories}&filter=circle:${lngNum},${latNum},${radiusNum}&bias=proximity:${lngNum},${latNum}&limit=25&apiKey=${apiKey}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NoYouPick/1.0 (https://noyoupick.org; contact@noyoupick.org)',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) {
      console.warn(`[Geoapify API] HTTP status ${res.status}`);
      return null;
    }

    const json = await res.json();
    const features = json.features || [];
    if (!features.length) {
      return null;
    }

    const venues = [];
    for (const f of features) {
      const p = f.properties || {};
      const name = p.name || p.address_line1 || '';
      if (!name) continue;

      const vLat = p.lat || (f.geometry && f.geometry.coordinates && f.geometry.coordinates[1]);
      const vLng = p.lon || (f.geometry && f.geometry.coordinates && f.geometry.coordinates[0]);
      if (vLat == null || vLng == null) continue;

      const distMeters = calculateHaversineDistance(latNum, lngNum, vLat, vLng);
      const distKm = Number((distMeters / 1000).toFixed(1));

      let cat = 'Restaurant';
      if (p.categories && Array.isArray(p.categories)) {
        if (p.categories.some((c) => c.includes('cafe'))) cat = 'Coffee & Café';
        else if (p.categories.some((c) => c.includes('bar') || c.includes('pub'))) cat = 'Bar & Drinks';
        else if (p.categories.some((c) => c.includes('cinema'))) cat = 'Cinema';
        else if (p.categories.some((c) => c.includes('fast_food'))) cat = 'Fast Food';
        else if (p.categories.some((c) => c.includes('bakery'))) cat = 'Bakery & Dessert';
      }

      venues.push({
        id: p.place_id || `geo_${vLat.toFixed(4)}_${vLng.toFixed(4)}`,
        name,
        address: p.formatted || p.street || p.city || 'Central Area',
        category: cat,
        lat: Number(vLat.toFixed(6)),
        lng: Number(vLng.toFixed(6)),
        distance_km: distKm,
        priceLevel: determinePriceLevel(p),
        open_now: p.opening_hours_conditions?.open_now ?? null,
      });
    }

    // Filter out user-reported closed spots
    const activeVenues = filterReportedVenues(venues);
    if (!activeVenues.length) return null;

    // Sort by proximity
    activeVenues.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));

    // Resolve high-resolution photography batch
    const candidatePayloads = activeVenues.map((v) => ({
      name: v.name,
      address: v.address,
      category: v.category,
    }));
    const photos = await resolveVenuePhotosBatch(candidatePayloads);
    activeVenues.forEach((v, idx) => {
      v.photo_url = photos[idx] || resolveVenuePhoto(v.name, v.address, v.category);
    });

    geoapifyCache.set(cacheKey, { timestamp: Date.now(), data: activeVenues });
    return activeVenues.slice(0, targetPlaces);
  } catch (err) {
    console.warn('[Geoapify Fetch Error]:', err.message);
    return null;
  }
}

module.exports = {
  fetchGeoapifyPlaces,
};
