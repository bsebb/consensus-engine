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
  { name: "Andys Pizza", fsq_id: "fallback_fsq_1", priceLevel: 2, priceLabel: "$$ (Moderate: ~120-250 MDL)" },
  { name: "Draft Pizza", fsq_id: "fallback_fsq_2", priceLevel: 2, priceLabel: "$$ (Moderate: ~120-250 MDL)" },
  { name: "Pizza Mania", fsq_id: "fallback_fsq_3", priceLevel: 1, priceLabel: "$ (Budget: ~50-120 MDL)" },
  { name: "Mi Piace", fsq_id: "fallback_fsq_4", priceLevel: 3, priceLabel: "$$$ (Expensive: ~250-500 MDL)" },
  { name: "Crème de la Crème", fsq_id: "fallback_fsq_5", priceLevel: 2, priceLabel: "$$ (Moderate: ~120-250 MDL)" },
  { name: "Propaganda Cafe", fsq_id: "fallback_fsq_6", priceLevel: 2, priceLabel: "$$ (Moderate: ~120-250 MDL)" },
  { name: "Kozlovna", fsq_id: "fallback_fsq_7", priceLevel: 2, priceLabel: "$$ (Moderate: ~120-250 MDL)" },
  { name: "La Taifas", fsq_id: "fallback_fsq_8", priceLevel: 3, priceLabel: "$$$ (Expensive: ~250-500 MDL)" }
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

/**
 * Executes a single Places API search request against FSQ OS Places.
 */
async function queryFoursquarePlaces({ theme, lat, lng, radius, cleanKey }) {
  const bearerAuth = cleanKey.toLowerCase().startsWith('bearer ') ? cleanKey : `Bearer ${cleanKey}`;
  const rawAuth = cleanKey.replace(/^Bearer\s+/i, '');

  let url = `https://places-api.foursquare.com/places/search?query=${encodeURIComponent(theme)}&limit=20`;
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

  const rawKey = process.env.FOURSQUARE_API_KEY;
  if (!rawKey || !rawKey.trim()) {
    return FALLBACK_PLACES;
  }
  const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '');
  if (!cleanKey) {
    return FALLBACK_PLACES;
  }

  // Quantize coordinates to ~200m grid for efficient in-memory caching
  const cacheLat = latitude ? Number(latitude).toFixed(3) : 'default';
  const cacheLng = longitude ? Number(longitude).toFixed(3) : 'default';
  const cacheKey = `${theme.toLowerCase()}_${radius}_${cacheLat}_${cacheLng}`;

  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const centerLat = latitude != null ? Number(latitude) : (near && near.toLowerCase().includes('chisinau') ? 47.0105 : 47.0105);
  const centerLng = longitude != null ? Number(longitude) : (near && near.toLowerCase().includes('chisinau') ? 28.8638 : 28.8638);
  const maxRequestedRadius = Math.max(Number(radius) || 5000, 1000);

  // Concentric spatial expansion rings: 1 km (neighborhood) -> 2.5 km -> maxRequestedRadius -> 10 km
  const TARGET_PLACES = 12;
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
      // Sort strictly by true distance ascending (closest venues first)
      const sortedResults = Array.from(accumulatedVenues.values())
        .sort((a, b) => a.distance_meters - b.distance_meters)
        .slice(0, 15);

      queryCache.set(cacheKey, { data: sortedResults, timestamp: Date.now() });
      return sortedResults;
    }
  } catch (error) {
    console.warn("[Foursquare] API warning, using local venue pool:", error.message);
  }

  return FALLBACK_PLACES;
};

// Export both names to prevent undefined import errors
module.exports = {
  fetchFoursquarePlaces,
  searchRestaurants: fetchFoursquarePlaces,
  formatPriceLabel,
  FALLBACK_PLACES,
};