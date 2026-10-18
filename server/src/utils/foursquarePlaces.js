function formatPriceLabel(price) {
  switch (price) {
    case 1:
      return "$ (Budget: ~80-150 MDL)";
    case 2:
      return "$$ (Moderate: ~150-300 MDL)";
    case 3:
      return "$$$ (Upscale: ~300-500 MDL)";
    case 4:
      return "$$$$ (Fine Dining: 500+ MDL)";
    default:
      return "$$ (Moderate: ~150-300 MDL)";
  }
}

// Last-resort offline fallback pool (only used if both Foursquare and OpenStreetMap are unreachable)
const CATEGORIZED_FALLBACKS = {
  cinema: [
    { name: "Cineplex MallDova", fsq_id: "fsq_cineplex_malldova", category: "Multiplex Cinema", priceLevel: 2, priceLabel: "$$ (~140-200 MDL / ticket)", lat: 46.9972, lng: 28.8510, address: "Str. Arborilor 21" },
    { name: "Cineplex Loteanu", fsq_id: "fsq_cineplex_loteanu", category: "Movie Theater", priceLevel: 2, priceLabel: "$$ (~120-180 MDL / ticket)", lat: 47.0252, lng: 28.8315, address: "Bd. Ștefan cel Mare 103" },
    { name: "Odeon Cinema", fsq_id: "fsq_odeon_cinema", category: "Indie & Cultural Cinema", priceLevel: 1, priceLabel: "$ (~80-120 MDL / ticket)", lat: 47.0215, lng: 28.8350, address: "Str. Mihai Eminescu 55" },
    { name: "Patria Multiplex", fsq_id: "fsq_patria_riscani", category: "Cinema & Entertainment", priceLevel: 2, priceLabel: "$$ (~120-180 MDL / ticket)", lat: 47.0410, lng: 28.8620, address: "Str. Kiev 16/1" },
    { name: "Auto Cinema", fsq_id: "fsq_auto_cinema", category: "Drive-In Movie Theater", priceLevel: 2, priceLabel: "$$ (~150 MDL / car)", lat: 47.0450, lng: 28.8050, address: "Calea Ieșilor" },
    { name: "Centrul Cultural Odeon", fsq_id: "fsq_centrul_odeon", category: "Film Screenings", priceLevel: 1, priceLabel: "$ (~90-130 MDL / ticket)", lat: 47.0195, lng: 28.8380, address: "Str. Vlaicu Pârcălab 45" }
  ],
  cafes: [
    { name: "Tucano Coffee", fsq_id: "fsq_tucano_1", category: "Specialty Coffee Shop", priceLevel: 2, priceLabel: "$$ (~60-120 MDL)", lat: 47.0225, lng: 28.8340, address: "Str. Aleksandr Pușkin 15" },
    { name: "Crème de la Crème", fsq_id: "fsq_creme_3", category: "French Patisserie & Café", priceLevel: 2, priceLabel: "$$ (~90-180 MDL)", lat: 47.0238, lng: 28.8340, address: "Str. Alexandru cel Bun 98A" },
    { name: "Rozmarin Cafe", fsq_id: "fsq_rozmarin_5", category: "Brunch & Roastery", priceLevel: 2, priceLabel: "$$ (~90-180 MDL)", lat: 47.0240, lng: 28.8320, address: "Bd. Ștefan cel Mare 202" },
    { name: "Sensi Bar & Cafe", fsq_id: "fsq_sensi_2", category: "Espresso & Lounge", priceLevel: 2, priceLabel: "$$ (~80-150 MDL)", lat: 47.0265, lng: 28.8310, address: "Str. Alexandru cel Bun 111" },
    { name: "Propaganda Cafe", fsq_id: "fsq_propaganda_4", category: "Vintage Cozy Café", priceLevel: 2, priceLabel: "$$ (~80-160 MDL)", lat: 47.0210, lng: 28.8375, address: "Str. Alexei Șciusev 47" },
    { name: "Coffeemolka", fsq_id: "fsq_coffeemolka_6", category: "Artisanal Coffee House", priceLevel: 1, priceLabel: "$ (~50-100 MDL)", lat: 47.0220, lng: 28.8360, address: "Str. Mihai Eminescu 72" }
  ],
  bars: [
    { name: "Smokehouse: BBQ & Beer", fsq_id: "fsq_smokehouse_bar_2", category: "Craft Beer & Smokehouse", priceLevel: 2, priceLabel: "$$ (~140-250 MDL)", lat: 47.0245, lng: 28.8315, address: "Bd. Ștefan cel Mare 128" },
    { name: "Kozlovna Ceska Pivnice", fsq_id: "fsq_kozlovna_bar_1", category: "Czech Beer Hall", priceLevel: 2, priceLabel: "$$ (~120-220 MDL)", lat: 47.0218, lng: 28.8360, address: "Str. Pușkin 24" },
    { name: "Taproom 27 Craft Beer", fsq_id: "fsq_taproom_bar_5", category: "Craft Taproom", priceLevel: 2, priceLabel: "$$ (~110-200 MDL)", lat: 47.0205, lng: 28.8390, address: "Str. Vasile Alecsandri 117" },
    { name: "Invino Enoteca", fsq_id: "fsq_invino_bar_4", category: "Wine Bar", priceLevel: 3, priceLabel: "$$$ (~200-400 MDL)", lat: 47.0230, lng: 28.8330, address: "Str. Bănulescu-Bodoni 41" },
    { name: "Draft Arena", fsq_id: "fsq_draft_bar_3", category: "Pub & Gastropub", priceLevel: 2, priceLabel: "$$ (~120-220 MDL)", lat: 47.0189, lng: 28.8415, address: "Str. 31 August 1989 78" },
    { name: "Barbar Bar", fsq_id: "fsq_barbar_bar_6", category: "Cocktails & Nightlife", priceLevel: 2, priceLabel: "$$ (~130-240 MDL)", lat: 47.0215, lng: 28.8370, address: "Str. Mihai Eminescu 56" }
  ],
  desserts: [
    { name: "Crème de la Crème", fsq_id: "fsq_creme_dessert", category: "French Patisserie", priceLevel: 2, priceLabel: "$$ (~90-180 MDL)", lat: 47.0238, lng: 28.8340, address: "Str. Alexandru cel Bun 98A" },
    { name: "Delice d'Ange", fsq_id: "fsq_delice_dange", category: "Artisanal Cakes & Pastries", priceLevel: 2, priceLabel: "$$ (~80-160 MDL)", lat: 47.0202, lng: 28.8342, address: "Str. 31 August 1989 117" },
    { name: "Granier Bakery", fsq_id: "fsq_granier", category: "Bakery & Sweet Treats", priceLevel: 1, priceLabel: "$ (~40-90 MDL)", lat: 47.0232, lng: 28.8335, address: "Bd. Ștefan cel Mare 132" },
    { name: "Dulcinella Boutique", fsq_id: "fsq_dulcinella", category: "Confectionery & Desserts", priceLevel: 1, priceLabel: "$ (~50-110 MDL)", lat: 47.0195, lng: 28.8410, address: "Str. Tighina 49" },
    { name: "Morpho Gelato", fsq_id: "fsq_morpho_gelato", category: "Italian Gelateria", priceLevel: 2, priceLabel: "$$ (~70-130 MDL)", lat: 47.0228, lng: 28.8355, address: "Str. Vlaicu Pârcălab 63" },
    { name: "Tucano Cheesecake Bar", fsq_id: "fsq_tucano_dessert", category: "Cheesecakes & Coffee", priceLevel: 2, priceLabel: "$$ (~75-140 MDL)", lat: 47.0225, lng: 28.8340, address: "Str. Aleksandr Pușkin 15" }
  ],
  restaurants: [
    { name: "Osho Bar & Kitchen", fsq_id: "56599eec498e89a644fa47ec", category: "Modern European & Steakhouse", priceLevel: 3, priceLabel: "$$$ (~250-500 MDL)", lat: 47.0061, lng: 28.8602, address: "Bd. Decebal 7/1" },
    { name: "Mi Piace", fsq_id: "51d1c578498e66d548d97c58", category: "Italian Restaurant", priceLevel: 3, priceLabel: "$$$ (~250-500 MDL)", lat: 46.9987, lng: 28.8578, address: "Str. Trandafirilor 4" },
    { name: "La Taifas", fsq_id: "fsq_taifas_9", category: "Traditional Moldovan", priceLevel: 2, priceLabel: "$$ (~150-300 MDL)", lat: 47.0235, lng: 28.8335, address: "Str. București 67" },
    { name: "Pegas Restaurant", fsq_id: "fsq_pegas_10", category: "Grill & Terrace", priceLevel: 3, priceLabel: "$$$ (~250-450 MDL)", lat: 47.0315, lng: 28.8510, address: "Str. Albișoara 20/1" },
    { name: "Andy's Pizza", fsq_id: "fsq_andys_1", category: "Casual Dining & Pizza", priceLevel: 2, priceLabel: "$$ (~120-250 MDL)", lat: 47.0245, lng: 28.8322, address: "Bd. Ștefan cel Mare 202" },
    { name: "Pizza Mania", fsq_id: "fsq_pizzamania_3", category: "Wood-Fired Pizzeria", priceLevel: 1, priceLabel: "$ (~90-170 MDL)", lat: 47.0261, lng: 28.8354, address: "Bd. Grigore Vieru 13" }
  ]
};

// In-memory cache for API queries to avoid repeated external requests
const queryCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

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
 * Generates Uber-style H3 hexagonal ring centers around (centerLat, centerLng).
 * Ring 0: [center]
 * Ring 1: 6 surrounding hex centers at distance sqrt(3) * hexRadiusMeters (~1.73 km for 1km hexes)
 */
function generateHexRingCenters(centerLat, centerLng, ringIndex, hexRadiusMeters = 1000) {
  if (ringIndex <= 0) {
    return [{ lat: centerLat, lng: centerLng, cellRadius: hexRadiusMeters }];
  }
  const distanceMeters = Math.sqrt(3) * hexRadiusMeters * ringIndex;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((centerLat * Math.PI) / 180);
  const centers = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = ((i * 60) * Math.PI) / 180;
    const dLat = (distanceMeters * Math.cos(angleRad)) / metersPerDegLat;
    const dLng = (distanceMeters * Math.sin(angleRad)) / Math.max(1, metersPerDegLng);
    centers.push({
      lat: Number((centerLat + dLat).toFixed(6)),
      lng: Number((centerLng + dLng).toFixed(6)),
      cellRadius: hexRadiusMeters,
    });
  }
  return centers;
}

function getCategoryKey(theme = '') {
  const norm = String(theme).toLowerCase().trim();
  if (norm.includes('cinema') || norm.includes('movie') || norm.includes('film')) return 'cinema';
  if (norm.includes('cafe') || norm.includes('coffee') || norm.includes('tea')) return 'cafes';
  if (norm.includes('bar') || norm.includes('pub') || norm.includes('beer') || norm.includes('wine') || norm.includes('drink')) return 'bars';
  if (norm.includes('dessert') || norm.includes('sweet') || norm.includes('bakery') || norm.includes('gelato') || norm.includes('ice cream')) return 'desserts';
  return 'restaurants';
}

function getSearchQueryForTheme(theme = '') {
  const key = getCategoryKey(theme);
  if (key === 'cinema') return 'cinema';
  if (key === 'cafes') return 'cafe';
  if (key === 'bars') return 'bar';
  if (key === 'desserts') return 'bakery';
  return 'restaurant';
}

function isRelevantFoursquarePlace(place, categoryKey) {
  const nameLower = String(place.name || '').toLowerCase();
  const cats = Array.isArray(place.categories) ? place.categories : [];
  const catNames = cats.map((c) => `${c.name || ''} ${c.short_name || ''} ${c.icon?.prefix || ''}`).join(' ').toLowerCase();
  const combined = `${nameLower} ${catNames}`;

  const bannedKeywords = [
    'supermarket', 'hypermarket', 'grocery', 'playground', 'loc de joacă',
    'monument', 'memorial', 'cernobâl', 'fountain', 'havuz', 'bridge', 'podul',
    'lake', 'lacul', 'beach', 'plaja', 'hotel', 'hostel', 'wedding', 'ballroom',
    'pharmacy', 'hospital', 'clinic', 'bank', 'atm', 'gas station', 'petrol',
    'school', 'university', 'kindergarten', 'cemetery', 'ruinele', 'scuarul'
  ];
  if (bannedKeywords.some((kw) => combined.includes(kw))) {
    return false;
  }

  if (categoryKey === 'cinema') {
    const cinemaKeywords = ['cinema', 'movie', 'theater', 'theatre', 'film', 'multiplex', 'cineplex', 'odeon', 'patria', 'movietheater', 'auto cinema'];
    return cinemaKeywords.some((kw) => combined.includes(kw));
  }

  if (categoryKey === 'cafes') {
    const cafeKeywords = ['cafe', 'café', 'coffee', 'espresso', 'bakery', 'pastry', 'patisserie', 'tea', 'bistro', 'dessert', 'tucano', 'crème', 'creme', 'rozmarin', 'sensi', 'propaganda', 'coffeemolka'];
    return cafeKeywords.some((kw) => combined.includes(kw));
  }

  if (categoryKey === 'bars') {
    const barKeywords = ['bar', 'pub', 'beer', 'wine', 'brewery', 'taproom', 'cocktail', 'lounge', 'nightlife', 'tavern', 'pivnice', 'gastropub', 'kozlovna', 'draft', 'smokehouse', 'invino', 'pivko'];
    return barKeywords.some((kw) => combined.includes(kw));
  }

  if (categoryKey === 'desserts') {
    const dessertKeywords = ['dessert', 'bakery', 'pastry', 'patisserie', 'ice cream', 'icecream', 'gelato', 'cake', 'sweet', 'confectionery', 'cafe', 'café', 'crème', 'creme', 'delice', 'dulcinella', 'sandra', 'granier'];
    return dessertKeywords.some((kw) => combined.includes(kw));
  }

  const diningKeywords = ['restaurant', 'food/', 'pizza', 'pizzeria', 'steak', 'grill', 'sushi', 'burger', 'bistro', 'kitchen', 'trattoria', 'tavern', 'gastropub', 'bbq', 'diner', 'cafe', 'café', 'bar', 'pub', 'european', 'italian', 'romanian', 'moldovan', 'asian', 'fast food', 'plăcinte', 'placinte', 'kfc', 'mcdonald'];
  return diningKeywords.some((kw) => combined.includes(kw));
}

function inferPriceLevel(place, categoryKey) {
  if (place.price && place.price >= 1 && place.price <= 4) {
    return place.price;
  }
  const nameLower = String(place.name || '').toLowerCase();
  const catNames = (place.categories || []).map((c) => (c.name || '').toLowerCase()).join(' ');
  if (nameLower.includes('osho') || nameLower.includes('mi piace') || nameLower.includes('pegas') || nameLower.includes('invino') || nameLower.includes('chateau') || nameLower.includes('nobil') || catNames.includes('steakhouse') || catNames.includes('fine dining') || catNames.includes('modern european')) {
    return 3;
  }
  if (nameLower.includes('mania') || nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('odeon') || nameLower.includes('coffeemolka') || nameLower.includes('granier') || catNames.includes('fast food') || catNames.includes('bakery') || catNames.includes('ice cream')) {
    return 1;
  }
  if (categoryKey === 'cinema') return 2;
  return 2;
}

function resolveFallback(theme = '', centerLat = 47.0225, centerLng = 28.8340, isExactGps = false) {
  const key = getCategoryKey(theme);
  const places = CATEGORIZED_FALLBACKS[key] || CATEGORIZED_FALLBACKS.restaurants;

  return places.map((p) => {
    let distMeters = 1500;
    if (centerLat != null && centerLng != null && p.lat && p.lng) {
      distMeters = calculateHaversineDistance(centerLat, centerLng, p.lat, p.lng);
    }
    const distKm = isExactGps ? Math.max(0.1, Number((distMeters / 1000).toFixed(1))) : null;

    return {
      name: p.name,
      fsq_id: p.fsq_id,
      fsq_place_id: p.fsq_id,
      category: p.category || 'Local Favorite',
      priceLevel: p.priceLevel,
      priceLabel: p.priceLabel,
      distance_km: distKm,
      distance_meters: Math.round(distMeters),
      address: p.address,
      lat: p.lat,
      lng: p.lng,
    };
  })
  .sort((a, b) => a.distance_meters - b.distance_meters)
  .slice(0, 6);
}

/**
 * Queries Foursquare Places API sorted by DISTANCE from (lat, lng)
 * so the closest branch of any chain (e.g. McDonald's) is returned first.
 */
async function queryFoursquarePlaces({ queryTerm, lat, lng, radius, cleanKey }) {
  if (!cleanKey) return [];
  const bearerAuth = cleanKey.toLowerCase().startsWith('bearer ') ? cleanKey : `Bearer ${cleanKey}`;
  const rawAuth = cleanKey.replace(/^Bearer\s+/i, '');

  let url = `https://places-api.foursquare.com/places/search?limit=40`;
  if (queryTerm) {
    url += `&query=${encodeURIComponent(queryTerm)}`;
  }
  if (lat != null && lng != null) {
    url += `&ll=${lat},${lng}&radius=${Math.min(Math.round(radius), 100000)}&sort=DISTANCE`;
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
 * Queries OpenStreetMap Nominatim within a bounded hexagonal bounding box around (lat, lng).
 * Crucial for smaller cities and towns where Foursquare coverage is sparse.
 */
async function queryNominatimBoundedPlaces({ categoryKey, lat, lng, radiusMeters }) {
  if (lat == null || lng == null) return [];
  const dLat = radiusMeters / 111320;
  const dLng = radiusMeters / Math.max(1, 111320 * Math.cos((lat * Math.PI) / 180));
  const viewbox = `${(lng - dLng).toFixed(5)},${(lat + dLat).toFixed(5)},${(lng + dLng).toFixed(5)},${(lat - dLat).toFixed(5)}`;

  const termsByCategory = {
    restaurants: ['restaurant', 'pizza'],
    cafes: ['cafe', 'coffee'],
    bars: ['bar', 'pub'],
    cinema: ['cinema'],
    desserts: ['bakery', 'cafe'],
  };
  const terms = termsByCategory[categoryKey] || ['restaurant'];
  const combinedResults = [];

  for (const term of terms) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(term)}&viewbox=${viewbox}&bounded=1&limit=20&addressdetails=1&accept-language=en,ro`;
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ConsensusEngine/1.0 (https://consensus-engine-mauve.vercel.app)',
        },
        signal: AbortSignal.timeout ? AbortSignal.timeout(3500) : undefined,
      });
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items)) {
          for (const item of items) {
            if (!item.name || item.lat == null || item.lon == null) continue;
            const addrObj = item.address || {};
            const locality = addrObj.city || addrObj.town || addrObj.village || addrObj.municipality || addrObj.suburb || '';
            const street = [addrObj.road, addrObj.house_number].filter(Boolean).join(' ');
            const formattedAddr = [street, locality].filter(Boolean).join(', ') || item.display_name?.split(',').slice(0, 2).join(', ') || 'Local Area';
            const catLabel =
              categoryKey === 'cinema' ? 'Movie Theater' :
              categoryKey === 'cafes' ? 'Coffee & Café' :
              categoryKey === 'bars' ? 'Bar & Pub' :
              categoryKey === 'desserts' ? 'Bakery & Desserts' :
              item.type === 'fast_food' ? 'Fast Food' : 'Restaurant';

            combinedResults.push({
              fsq_id: `osm_${item.place_id}`,
              name: item.name,
              latitude: parseFloat(item.lat),
              longitude: parseFloat(item.lon),
              categories: [{ name: catLabel, short_name: catLabel }],
              location: {
                address: formattedAddr,
                locality,
              },
            });
          }
        }
      }
    } catch (err) {
      console.warn(`[OSM Hex Search] Warning for term "${term}":`, err.message);
    }
  }

  return combinedResults;
}

/**
 * Uber-Style Expanding Hexagonal Spatial Search Engine:
 * - Ring 0: Center 1.0 km hexagon around (centerLat, centerLng)
 * - Ring 1: 6 surrounding 1.0 km hexagons (~2.5 km hex cluster)
 * - Ring 2: 5.0 km expanded regional ring
 * - Ring 3: 10.0 km town/suburban ring
 * Works in ANY city or town globally without clamping to Chișinău,
 * and always keeps the closest branch of any chain (e.g., McDonald's).
 */
const fetchFoursquarePlaces = async (param1 = "restaurant", param2 = 5000) => {
  let theme = "restaurant";
  let radius = 5000;
  let latitude = null;
  let longitude = null;
  let isExactGps = false;

  if (typeof param1 === 'object' && param1 !== null) {
    theme = param1.theme || "restaurant";
    radius = param1.radius || 5000;
    latitude = param1.latitude ?? null;
    longitude = param1.longitude ?? null;
    isExactGps = Boolean(param1.is_exact_gps);
  } else {
    theme = param1;
    radius = param2;
  }

  if (typeof theme !== 'string') {
    theme = 'restaurant';
  }

  const DEFAULT_LAT = 47.0225;
  const DEFAULT_LNG = 28.8340;

  const hasValidCoords =
    latitude != null &&
    longitude != null &&
    !isNaN(Number(latitude)) &&
    !isNaN(Number(longitude)) &&
    Math.abs(Number(latitude)) <= 90 &&
    Math.abs(Number(longitude)) <= 180;

  const centerLat = hasValidCoords ? Number(latitude) : DEFAULT_LAT;
  const centerLng = hasValidCoords ? Number(longitude) : DEFAULT_LNG;
  if (!hasValidCoords) {
    isExactGps = false;
  }

  const categoryKey = getCategoryKey(theme);
  const queryTerm = getSearchQueryForTheme(theme);

  const rawKey = process.env.FOURSQUARE_API_KEY || '';
  const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '');

  const cacheLat = centerLat.toFixed(3);
  const cacheLng = centerLng.toFixed(3);
  const cacheKey = `hex_v4_${categoryKey}_${cacheLat}_${cacheLng}_${isExactGps}`;

  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Uber-style expanding hexagonal rings:
  // Ring 0: 1.0 km center hex
  // Ring 1: 2.5 km (covers 6 surrounding 1km hexagons at d = 1.73 km)
  // Ring 2: 5.0 km
  // Ring 3: 10.0 km (if in a smaller town or sparse category like Cinema)
  const TARGET_PLACES = 6;
  const hexRingsMeters = [1000, 2500, 5000, 10000];
  const accumulatedVenues = new Map();

  const ingestCandidates = (candidates, fallbackRadiusMeters) => {
    for (const place of candidates) {
      if (!isRelevantFoursquarePlace(place, categoryKey)) continue;

      const id = place.fsq_place_id || place.fsq_id || place.id || `venue_${Math.random()}`;
      const normNameKey = String(place.name || '').toLowerCase().trim();
      if (!normNameKey) continue;

      const placeLat = place.latitude ?? place.geocodes?.main?.latitude ?? null;
      const placeLng = place.longitude ?? place.geocodes?.main?.longitude ?? null;

      let distMeters = null;
      if (placeLat != null && placeLng != null) {
        distMeters = calculateHaversineDistance(centerLat, centerLng, placeLat, placeLng);
      } else if (place.distance != null) {
        distMeters = place.distance;
      } else {
        distMeters = fallbackRadiusMeters;
      }

      // Discard venues outside the current expansion ring + 20% tolerance
      if (distMeters > fallbackRadiusMeters * 1.25) continue;

      // CLOSEST-BRANCH RULE: If a chain (e.g., McDonald's, Andy's Pizza) is already in the map,
      // only overwrite it if this branch is physically closer to the user's coordinates!
      const existing = accumulatedVenues.get(normNameKey);
      if (existing && existing.distance_meters <= distMeters) {
        continue;
      }

      const distKm = isExactGps ? Math.max(0.1, Number((distMeters / 1000).toFixed(1))) : null;

      const locality = place.location?.neighborhood?.[0] || place.location?.locality || '';
      const rawAddr = place.location?.address || place.location?.formatted_address || locality || 'Local Venue';
      const address = locality && !rawAddr.toLowerCase().includes(locality.toLowerCase())
        ? `${rawAddr}, ${locality}`
        : rawAddr;

      const fsqCategoryName = place.categories?.[0]?.name || place.categories?.[0]?.short_name || (
        categoryKey === 'cinema' ? 'Movie Theater' :
        categoryKey === 'cafes' ? 'Coffee & Café' :
        categoryKey === 'bars' ? 'Bar & Pub' :
        categoryKey === 'desserts' ? 'Bakery & Desserts' : 'Restaurant'
      );
      const priceLevel = inferPriceLevel(place, categoryKey);

      accumulatedVenues.set(normNameKey, {
        name: place.name,
        fsq_id: id,
        fsq_place_id: id,
        category: fsqCategoryName,
        priceLevel,
        priceLabel: formatPriceLabel(priceLevel),
        distance_km: distKm,
        distance_meters: Math.round(distMeters),
        address,
        lat: placeLat,
        lng: placeLng,
      });
    }
  };

  try {
    for (let ringIdx = 0; ringIdx < hexRingsMeters.length; ringIdx++) {
      const ringRadius = hexRingsMeters[ringIdx];

      // 1. Query Foursquare at the hex center sorted by DISTANCE
      if (cleanKey) {
        const [typedPlaces, broadPlaces] = await Promise.all([
          queryFoursquarePlaces({
            queryTerm,
            lat: centerLat,
            lng: centerLng,
            radius: ringRadius,
            cleanKey,
          }).catch(() => []),
          queryFoursquarePlaces({
            queryTerm: '',
            lat: centerLat,
            lng: centerLng,
            radius: ringRadius,
            cleanKey,
          }).catch(() => []),
        ]);

        ingestCandidates([...typedPlaces, ...broadPlaces], ringRadius);

        // If Ring 1 (6 neighbor hexagons at 1.73 km) still needs more spots, sample the 6 hex vertices
        if (ringIdx === 1 && accumulatedVenues.size < TARGET_PLACES) {
          const neighborHexes = generateHexRingCenters(centerLat, centerLng, 1, 1000);
          const hexSamples = await Promise.all(
            neighborHexes.map((hex) =>
              queryFoursquarePlaces({
                queryTerm,
                lat: hex.lat,
                lng: hex.lng,
                radius: hex.cellRadius,
                cleanKey,
              }).catch(() => [])
            )
          );
          for (const sample of hexSamples) {
            ingestCandidates(sample, ringRadius);
          }
        }
      }

      // 2. If fewer than TARGET_PLACES in this hex ring, also query OpenStreetMap Nominatim bounded hex box
      // so smaller cities and towns get all their local restaurants/cafes/bars
      if (accumulatedVenues.size < TARGET_PLACES && ringIdx >= 1) {
        const osmPlaces = await queryNominatimBoundedPlaces({
          categoryKey,
          lat: centerLat,
          lng: centerLng,
          radiusMeters: ringRadius,
        });
        ingestCandidates(osmPlaces, ringRadius);
      }

      // Stop expanding outward as soon as we have enough local venues in the current hex ring!
      if (accumulatedVenues.size >= TARGET_PLACES) {
        break;
      }
    }

    if (accumulatedVenues.size > 0) {
      const sortedResults = Array.from(accumulatedVenues.values())
        .sort((a, b) => a.distance_meters - b.distance_meters)
        .slice(0, 6);

      queryCache.set(cacheKey, { data: sortedResults, timestamp: Date.now() });
      return sortedResults;
    }
  } catch (error) {
    console.warn("[Hex Spatial Search] Warning, falling back:", error.message);
  }

  return resolveFallback(theme, centerLat, centerLng, isExactGps);
};

module.exports = {
  fetchFoursquarePlaces,
  searchRestaurants: fetchFoursquarePlaces,
  formatPriceLabel,
  generateHexRingCenters,
  CATEGORIZED_FALLBACKS,
  FALLBACK_PLACES: CATEGORIZED_FALLBACKS.restaurants,
};