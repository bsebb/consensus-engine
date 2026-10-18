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

// Categorized fallback pools for Chișinău
const CATEGORIZED_FALLBACKS = {
  cinema: [
    { name: "Cineplex Loteanu", fsq_id: "fsq_cineplex_loteanu", priceLevel: 2, priceLabel: "$$ (~120-180 MDL / ticket)", lat: 47.0252, lng: 28.8315, address: "Bulevardul Ștefan cel Mare 103, Centru" },
    { name: "Cineplex MallDova", fsq_id: "fsq_cineplex_malldova", priceLevel: 2, priceLabel: "$$ (~140-200 MDL / ticket)", lat: 46.9972, lng: 28.8510, address: "Strada Arborilor 21 (Shopping MallDova), Centru" },
    { name: "Odeon Cinema", fsq_id: "fsq_odeon_cinema", priceLevel: 1, priceLabel: "$ (~80-120 MDL / ticket)", lat: 47.0215, lng: 28.8350, address: "Strada Mihai Eminescu 55, Centru" },
    { name: "Auto Cinema Chișinău", fsq_id: "fsq_auto_cinema", priceLevel: 2, priceLabel: "$$ (~150 MDL / car)", lat: 47.0450, lng: 28.8050, address: "Calea Ieșilor, Buiucani" },
    { name: "Centrul Cultural Odeon", fsq_id: "fsq_centrul_odeon", priceLevel: 1, priceLabel: "$ (~90-130 MDL / ticket)", lat: 47.0195, lng: 28.8380, address: "Strada Vlaicu Pârcălab 45, Centru" },
    { name: "Patria Multiplex Rîșcani", fsq_id: "fsq_patria_riscani", priceLevel: 2, priceLabel: "$$ (~120-180 MDL / ticket)", lat: 47.0410, lng: 28.8620, address: "Strada Kiev 16/1, Rîșcani" }
  ],
  cafes: [
    { name: "Tucano Coffee Costa Rica", fsq_id: "fsq_tucano_1", priceLevel: 2, priceLabel: "$$ (~60-120 MDL)", lat: 47.0225, lng: 28.8340, address: "Strada Aleksandr Pușkin 15, Centru" },
    { name: "Sensi Bar & Cafe", fsq_id: "fsq_sensi_2", priceLevel: 2, priceLabel: "$$ (~80-150 MDL)", lat: 47.0265, lng: 28.8310, address: "Strada Alexandru cel Bun 111, Centru" },
    { name: "Crème de la Crème", fsq_id: "fsq_creme_3", priceLevel: 2, priceLabel: "$$ (~90-180 MDL)", lat: 47.0238, lng: 28.8340, address: "Strada Alexandru cel Bun 98A, Centru" },
    { name: "Propaganda Cafe", fsq_id: "fsq_propaganda_4", priceLevel: 2, priceLabel: "$$ (~80-160 MDL)", lat: 47.0210, lng: 28.8375, address: "Strada Alexei Șciusev 47, Centru" },
    { name: "Rozmarin Cafe", fsq_id: "fsq_rozmarin_5", priceLevel: 2, priceLabel: "$$ (~90-180 MDL)", lat: 47.0240, lng: 28.8320, address: "Bulevardul Ștefan cel Mare 202, Centru" },
    { name: "Coffeemolka", fsq_id: "fsq_coffeemolka_6", priceLevel: 1, priceLabel: "$ (~50-100 MDL)", lat: 47.0220, lng: 28.8360, address: "Strada Mihai Eminescu 72, Centru" }
  ],
  bars: [
    { name: "Kozlovna Ceska Pivnice", fsq_id: "fsq_kozlovna_bar_1", priceLevel: 2, priceLabel: "$$ (~120-220 MDL)", lat: 47.0218, lng: 28.8360, address: "Strada Pușkin 24, Centru" },
    { name: "Smokehouse: BBQ & Beer", fsq_id: "fsq_smokehouse_bar_2", priceLevel: 2, priceLabel: "$$ (~140-250 MDL)", lat: 47.0245, lng: 28.8315, address: "Bulevardul Ștefan cel Mare 128, Centru" },
    { name: "Draft Arena", fsq_id: "fsq_draft_bar_3", priceLevel: 2, priceLabel: "$$ (~120-220 MDL)", lat: 47.0189, lng: 28.8415, address: "Strada 31 August 1989 78, Centru" },
    { name: "Invino Enoteca", fsq_id: "fsq_invino_bar_4", priceLevel: 3, priceLabel: "$$$ (~200-400 MDL)", lat: 47.0230, lng: 28.8330, address: "Strada Mitropolit Bănulescu-Bodoni 41, Centru" },
    { name: "Taproom 27 Craft Beer", fsq_id: "fsq_taproom_bar_5", priceLevel: 2, priceLabel: "$$ (~110-200 MDL)", lat: 47.0205, lng: 28.8390, address: "Strada Vasile Alecsandri 117, Centru" },
    { name: "Barbar Bar", fsq_id: "fsq_barbar_bar_6", priceLevel: 2, priceLabel: "$$ (~130-240 MDL)", lat: 47.0215, lng: 28.8370, address: "Strada Mihai Eminescu 56, Centru" }
  ],
  restaurants: [
    { name: "Osho Bar & Kitchen", fsq_id: "fsq_osho_7", priceLevel: 3, priceLabel: "$$$ (~250-500 MDL)", lat: 46.9895, lng: 28.8640, address: "Strada Decebal 7/1, Botanica" },
    { name: "Mi Piace", fsq_id: "fsq_mipiace_4", priceLevel: 3, priceLabel: "$$$ (~250-500 MDL)", lat: 46.9922, lng: 28.8598, address: "Strada Trandafirilor 4, Botanica" },
    { name: "Andy's Pizza", fsq_id: "fsq_andys_1", priceLevel: 2, priceLabel: "$$ (~120-250 MDL)", lat: 47.0245, lng: 28.8322, address: "Strada Ștefan cel Mare 202, Centru" },
    { name: "La Taifas", fsq_id: "fsq_taifas_9", priceLevel: 3, priceLabel: "$$$ (~250-500 MDL)", lat: 47.0235, lng: 28.8335, address: "Strada București 67, Centru" },
    { name: "Pegas Restaurant", fsq_id: "fsq_pegas_10", priceLevel: 4, priceLabel: "$$$$ (500+ MDL)", lat: 47.0315, lng: 28.8510, address: "Strada Albișoara 20/1, Rîșcani" },
    { name: "Pizza Mania", fsq_id: "fsq_pizzamania_3", priceLevel: 1, priceLabel: "$ (~80-160 MDL)", lat: 47.0261, lng: 28.8354, address: "Bulevardul Grigore Vieru 13, Rîșcani" }
  ]
};

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

function getCategoryKey(theme = '') {
  const norm = String(theme).toLowerCase().trim();
  if (norm.includes('cinema') || norm.includes('movie') || norm.includes('film')) return 'cinema';
  if (norm.includes('cafe') || norm.includes('coffee') || norm.includes('tea') || norm.includes('bakery')) return 'cafes';
  if (norm.includes('bar') || norm.includes('pub') || norm.includes('beer') || norm.includes('wine') || norm.includes('drink')) return 'bars';
  return 'restaurants';
}

function getFoursquareCategory(theme = '') {
  const key = getCategoryKey(theme);
  if (key === 'cinema') return '10024'; // Movie Theaters
  if (key === 'cafes') return '13032'; // Coffee Shops & Cafes
  if (key === 'bars') return '13003,13018'; // Bars & Pubs
  return '13000'; // Dining and Drinking
}

function resolveFallback(theme = '', centerLat = 47.0105, centerLng = 28.8638) {
  const key = getCategoryKey(theme);
  const places = CATEGORIZED_FALLBACKS[key] || CATEGORIZED_FALLBACKS.restaurants;

  return places.map((p) => {
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
  })
  .sort((a, b) => a.distance_meters - b.distance_meters)
  .slice(0, 6);
}

/**
 * Executes a single Places API search request against FSQ OS Places.
 */
async function queryFoursquarePlaces({ theme, lat, lng, radius, cleanKey }) {
  const bearerAuth = cleanKey.toLowerCase().startsWith('bearer ') ? cleanKey : `Bearer ${cleanKey}`;
  const rawAuth = cleanKey.replace(/^Bearer\s+/i, '');
  const catParam = getFoursquareCategory(theme);

  let url = `https://places-api.foursquare.com/places/search?query=${encodeURIComponent(theme)}&categories=${catParam}&limit=15&fields=fsq_place_id,name,location,categories,distance,geocodes,price`;
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

  const centerLat = latitude != null ? Number(latitude) : 47.0105;
  const centerLng = longitude != null ? Number(longitude) : 28.8638;
  const maxRequestedRadius = Math.max(Number(radius) || 5000, 1000);

  const rawKey = process.env.FOURSQUARE_API_KEY;
  if (!rawKey || !rawKey.trim()) {
    return resolveFallback(theme, centerLat, centerLng);
  }
  const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '');
  if (!cleanKey) {
    return resolveFallback(theme, centerLat, centerLng);
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

  return resolveFallback(theme, centerLat, centerLng);
};

// Export both names to prevent undefined import errors
module.exports = {
  fetchFoursquarePlaces,
  searchRestaurants: fetchFoursquarePlaces,
  formatPriceLabel,
  CATEGORIZED_FALLBACKS,
  FALLBACK_PLACES: CATEGORIZED_FALLBACKS.restaurants,
};