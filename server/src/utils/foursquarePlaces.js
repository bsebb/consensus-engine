function formatPriceLabel(price) {
  switch (price) {
    case 1:
      return "$ (Budget: ~50-120 MDL)";
    case 2:
      return "$$ (Moderate: ~120-250 MDL)";
    case 3:
      return "$$$ (Expensive: ~250-500 MDL)";
    case 4:
      return "$$$$ (Fine Dining: 500+ MDL)";
    default:
      return "Price not available";
  }
}

const FALLBACK_PLACES = [
  { name: "Andy's Pizza", fsq_id: "fsq_andys_1", priceLevel: 2, priceLabel: "$$ (Moderate: ~120-250 MDL)", lat: 47.0245, lng: 28.8322, address: "Strada Ștefan cel Mare 202, Centru" },
  { name: "Draft Pizza", fsq_id: "fsq_draft_2", priceLevel: 2, priceLabel: "$$ (Moderate: ~120-250 MDL)", lat: 47.0189, lng: 28.8415, address: "Strada 31 August 1989 78, Centru" },
  { name: "Pizza Mania", fsq_id: "fsq_pizzamania_3", priceLevel: 1, priceLabel: "$ (Budget: ~50-120 MDL)", lat: 47.0261, lng: 28.8354, address: "Bulevardul Grigore Vieru 13, Rîșcani" },
  { name: "Mi Piace", fsq_id: "fsq_mipiace_4", priceLevel: 3, priceLabel: "$$$ (Expensive: ~250-500 MDL)", lat: 46.9922, lng: 28.8598, address: "Strada Trandafirilor 4, Botanica" },
  { name: "Crème de la Crème", fsq_id: "fsq_creme_5", priceLevel: 2, priceLabel: "$$ (Moderate: ~120-250 MDL)", lat: 47.0238, lng: 28.8340, address: "Strada Alexandru cel Bun 98A, Centru" },
  { name: "Propaganda Cafe", fsq_id: "fsq_propaganda_6", priceLevel: 2, priceLabel: "$$ (Moderate: ~120-250 MDL)", lat: 47.0210, lng: 28.8375, address: "Strada Alexei Șciusev 47, Centru" }
];

// In-memory cache for API queries to avoid repeated external requests
const queryCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Haversine distance in meters between two lat/lng coordinates
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
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

function resolveFallback(centerLat, centerLng) {
  return FALLBACK_PLACES.slice(0, 6).map((p) => {
    let distKm = null;
    let distMeters = 999999;
    if (centerLat != null && centerLng != null && p.lat && p.lng) {
      distMeters = calculateHaversineDistance(centerLat, centerLng, p.lat, p.lng);
      distKm = Number((distMeters / 1000).toFixed(1));
    }
    return {
      name: p.name,
      fsq_id: p.fsq_id,
      fsq_place_id: p.fsq_id,
      priceLevel: p.priceLevel,
      priceLabel: p.priceLabel,
      distance_km: distKm,
      distance_meters: Math.round(distMeters),
      address: p.address,
    };
  }).sort((a, b) => a.distance_meters - b.distance_meters);
}

/**
 * Executes a single Places API search request against FSQ OS Places.
 */
async function queryFoursquarePlaces({ theme, lat, lng, radius, cleanKey }) {
  const bearerAuth = cleanKey.toLowerCase().startsWith('bearer ') ? cleanKey : `Bearer ${cleanKey}`;
  const rawAuth = cleanKey.replace(/^Bearer\s+/i, '');

  let url = `https://places-api.foursquare.com/places/search?query=${encodeURIComponent(theme)}&limit=15&fields=fsq_place_id,name,location,categories,distance,geocodes,price`;
  if (lat && lng) {
    url += `&ll=${lat},${lng}&radius=${Math.min(radius, 100000)}`;
  } else {
    url += `&near=Chisinau`;
  }

  const headers = {
    accept: 'application/json',
    Authorization: bearerAuth,
    'X-Places-Api-Version': '2025-06-17',
  };

  let response = await fetch(url, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
  });

  if (response.status === 401) {
    headers.Authorization = rawAuth;
    response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
    });
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Status ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return Array.isArray(data.results) ? data.results : [];
}

/**
 * Searches for places via FSQ OS Places using an adaptive expanding spatial grid (Uber-style).
 * Starts at a 1km neighborhood radius and expands outward until at least TARGET_COUNT places are found.
 */
const fetchFoursquarePlaces = async (param1 = "restaurant", param2 = 5000, param3 = "Chisinau") => {
  let theme = "restaurant";
  let radius = 5000;
  let near = "Chisinau";
  let latitude = null;
  let longitude = null;

  if (typeof param1 === 'object' && param1 !== null) {
    theme = param1.theme || "restaurant";
    radius = param1.radius || 5000;
    near = param1.near || "Chisinau";
    latitude = param1.latitude ?? null;
    longitude = param1.longitude ?? null;
  } else {
    theme = param1;
    radius = param2;
    near = param3;
  }

  if (typeof theme !== 'string') {
    theme = 'restaurant';
  }

  const centerLat = latitude != null ? Number(latitude) : (near && near.toLowerCase().includes('chisinau') ? 47.0105 : 47.0105);
  const centerLng = longitude != null ? Number(longitude) : (near && near.toLowerCase().includes('chisinau') ? 28.8638 : 28.8638);
  const maxRequestedRadius = Math.max(Number(radius) || 5000, 1000);

  const rawKey = process.env.FOURSQUARE_API_KEY;
  if (!rawKey || !rawKey.trim()) {
    return resolveFallback(centerLat, centerLng);
  }
  const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '');
  if (!cleanKey) {
    return resolveFallback(centerLat, centerLng);
  }

  // Quantize coordinates to ~200m grid for efficient in-memory caching
  const cacheLat = latitude ? Number(latitude).toFixed(3) : 'default';
  const cacheLng = longitude ? Number(longitude).toFixed(3) : 'default';
  const cacheKey = `${theme.toLowerCase()}_${radius}_${cacheLat}_${cacheLng}`;

  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Concentric spatial expansion rings: 1 km (neighborhood) -> 2.5 km -> maxRequestedRadius -> 10 km
  const TARGET_PLACES = 6;
  const rawRings = [
    1000,
    2500,
    maxRequestedRadius,
    Math.max(maxRequestedRadius, 8000),
  ];
  const uniqueRings = [...new Set(rawRings)].sort((a, b) => a - b);

  const accumulatedVenues = new Map();

  try {
    for (const ringRadius of uniqueRings) {
      const placesInRing = await queryFoursquarePlaces({
        theme,
        lat: centerLat,
        lng: centerLng,
        radius: ringRadius,
        cleanKey,
      }).catch((err) => {
        console.warn(`[Spatial Search] Query warning at ${ringRadius}m ring:`, err.message);
        return [];
      });

      for (const place of placesInRing) {
        const id = place.fsq_place_id || place.fsq_id || place.id;
        const normKey = id || place.name.toLowerCase().trim();

        if (!accumulatedVenues.has(normKey)) {
          let distMeters = place.distance;
          if (distMeters == null && place.geocodes?.main) {
            distMeters = calculateHaversineDistance(
              centerLat,
              centerLng,
              place.geocodes.main.latitude,
              place.geocodes.main.longitude
            );
          }
          if (distMeters == null) distMeters = ringRadius;

          const distKm = Number((distMeters / 1000).toFixed(1));
          const address = place.location?.formatted_address || place.location?.address || 'Chișinău, Moldova';

          accumulatedVenues.set(normKey, {
            name: place.name,
            fsq_id: id,
            fsq_place_id: id,
            priceLevel: place.price || null,
            priceLabel: formatPriceLabel(place.price),
            distance_km: distKm,
            distance_meters: Math.round(distMeters),
            address,
          });
        }
      }

      // Early exit if we found sufficient venues in the local spatial hexagon
      if (accumulatedVenues.size >= TARGET_PLACES) {
        break;
      }
    }

    if (accumulatedVenues.size > 0) {
      // Sort strictly by true distance ascending (closest venues first) and cap at 6
      const sortedResults = Array.from(accumulatedVenues.values())
        .sort((a, b) => a.distance_meters - b.distance_meters)
        .slice(0, 6);

      queryCache.set(cacheKey, { data: sortedResults, timestamp: Date.now() });
      return sortedResults;
    }
  } catch (error) {
    console.warn("[Foursquare] API warning, using local venue pool:", error.message);
  }

  return resolveFallback(centerLat, centerLng);
};

// Export both names to prevent undefined import errors
module.exports = {
  fetchFoursquarePlaces,
  searchRestaurants: fetchFoursquarePlaces,
  formatPriceLabel,
  FALLBACK_PLACES,
};