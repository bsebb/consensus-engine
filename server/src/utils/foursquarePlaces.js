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

/**
 * Searches for places via Foursquare API v3 with caching and instant local fallback.
 * Supports both object params and positional arguments.
 */
const fetchFoursquarePlaces = async (param1 = "restaurant", param2 = 5000, param3 = "Chisinau") => {
  // Normalize params whether called as ({ theme, radius, near, latitude, longitude }) or (theme, radius, near)
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

  // Ensure theme is a clean string
  if (typeof theme !== 'string') {
    theme = 'restaurant';
  }

  // Fast path: if no API key is configured, return fallback data immediately (0ms delay)
  const rawKey = process.env.FOURSQUARE_API_KEY;
  if (!rawKey || !rawKey.trim()) {
    return FALLBACK_PLACES;
  }
  const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '');
  if (!cleanKey) {
    return FALLBACK_PLACES;
  }

  // Check in-memory cache
  const cacheKey = `${theme.toLowerCase()}_${radius}_${latitude || near}_${longitude || ''}`;
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Foursquare Places API (FSQ OS Places) modern endpoint
  const bearerAuth = cleanKey.toLowerCase().startsWith('bearer ')
    ? cleanKey
    : `Bearer ${cleanKey}`;
  const rawAuth = cleanKey.replace(/^Bearer\s+/i, '');

  try {
    let url = `https://places-api.foursquare.com/places/search?query=${encodeURIComponent(theme)}&radius=${radius}&limit=12&fields=fsq_id,name,price`;
    if (latitude && longitude) {
      url += `&ll=${latitude},${longitude}`;
    } else {
      url += `&near=${encodeURIComponent(near)}`;
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

    // If 401 with Bearer header, retry with raw key format
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

    if (data.results && data.results.length > 0) {
      const results = data.results.map((place) => ({
        name: place.name,
        fsq_id: place.fsq_id,
        fsq_place_id: place.fsq_id,
        priceLevel: place.price || null,
        priceLabel: formatPriceLabel(place.price),
      }));

      queryCache.set(cacheKey, { data: results, timestamp: Date.now() });
      return results;
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