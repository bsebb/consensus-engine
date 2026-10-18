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

// Authentic categorized pools for Chișinău (used to top up or fallback if offline)
const CATEGORIZED_FALLBACKS = {
  cinema: [
    { name: "Cineplex MallDova", fsq_id: "fsq_cineplex_malldova", category: "Multiplex Cinema", priceLevel: 2, priceLabel: "$$ (~140-200 MDL / ticket)", lat: 46.9972, lng: 28.8510, address: "Str. Arborilor 21 (Shopping MallDova)" },
    { name: "Cineplex Loteanu", fsq_id: "fsq_cineplex_loteanu", category: "Movie Theater", priceLevel: 2, priceLabel: "$$ (~120-180 MDL / ticket)", lat: 47.0252, lng: 28.8315, address: "Bd. Ștefan cel Mare 103, Centru" },
    { name: "Odeon Cinema", fsq_id: "fsq_odeon_cinema", category: "Indie & Cultural Cinema", priceLevel: 1, priceLabel: "$ (~80-120 MDL / ticket)", lat: 47.0215, lng: 28.8350, address: "Str. Mihai Eminescu 55, Centru" },
    { name: "Patria Multiplex Rîșcani", fsq_id: "fsq_patria_riscani", category: "Cinema & Entertainment", priceLevel: 2, priceLabel: "$$ (~120-180 MDL / ticket)", lat: 47.0410, lng: 28.8620, address: "Str. Kiev 16/1, Rîșcani" },
    { name: "Auto Cinema Chișinău", fsq_id: "fsq_auto_cinema", category: "Drive-In Movie Theater", priceLevel: 2, priceLabel: "$$ (~150 MDL / car)", lat: 47.0450, lng: 28.8050, address: "Calea Ieșilor, Buiucani" },
    { name: "Centrul Cultural Odeon", fsq_id: "fsq_centrul_odeon", category: "Film Screenings", priceLevel: 1, priceLabel: "$ (~90-130 MDL / ticket)", lat: 47.0195, lng: 28.8380, address: "Str. Vlaicu Pârcălab 45, Centru" }
  ],
  cafes: [
    { name: "Tucano Coffee Costa Rica", fsq_id: "fsq_tucano_1", category: "Specialty Coffee Shop", priceLevel: 2, priceLabel: "$$ (~60-120 MDL)", lat: 47.0225, lng: 28.8340, address: "Str. Aleksandr Pușkin 15, Centru" },
    { name: "Crème de la Crème", fsq_id: "fsq_creme_3", category: "French Patisserie & Café", priceLevel: 2, priceLabel: "$$ (~90-180 MDL)", lat: 47.0238, lng: 28.8340, address: "Str. Alexandru cel Bun 98A, Centru" },
    { name: "Rozmarin Cafe", fsq_id: "fsq_rozmarin_5", category: "Brunch & Roastery", priceLevel: 2, priceLabel: "$$ (~90-180 MDL)", lat: 47.0240, lng: 28.8320, address: "Bd. Ștefan cel Mare 202, Centru" },
    { name: "Sensi Bar & Cafe", fsq_id: "fsq_sensi_2", category: "Espresso & Lounge", priceLevel: 2, priceLabel: "$$ (~80-150 MDL)", lat: 47.0265, lng: 28.8310, address: "Str. Alexandru cel Bun 111, Centru" },
    { name: "Propaganda Cafe", fsq_id: "fsq_propaganda_4", category: "Vintage Cozy Café", priceLevel: 2, priceLabel: "$$ (~80-160 MDL)", lat: 47.0210, lng: 28.8375, address: "Str. Alexei Șciusev 47, Centru" },
    { name: "Coffeemolka", fsq_id: "fsq_coffeemolka_6", category: "Artisanal Coffee House", priceLevel: 1, priceLabel: "$ (~50-100 MDL)", lat: 47.0220, lng: 28.8360, address: "Str. Mihai Eminescu 72, Centru" }
  ],
  bars: [
    { name: "Smokehouse: BBQ & Beer", fsq_id: "fsq_smokehouse_bar_2", category: "Craft Beer & Smokehouse", priceLevel: 2, priceLabel: "$$ (~140-250 MDL)", lat: 47.0245, lng: 28.8315, address: "Bd. Ștefan cel Mare 128, Centru" },
    { name: "Kozlovna Ceska Pivnice", fsq_id: "fsq_kozlovna_bar_1", category: "Czech Beer Hall", priceLevel: 2, priceLabel: "$$ (~120-220 MDL)", lat: 47.0218, lng: 28.8360, address: "Str. Pușkin 24, Centru" },
    { name: "Taproom 27 Craft Beer", fsq_id: "fsq_taproom_bar_5", category: "Craft Taproom", priceLevel: 2, priceLabel: "$$ (~110-200 MDL)", lat: 47.0205, lng: 28.8390, address: "Str. Vasile Alecsandri 117, Centru" },
    { name: "Invino Enoteca", fsq_id: "fsq_invino_bar_4", category: "Moldovan Wine Bar", priceLevel: 3, priceLabel: "$$$ (~200-400 MDL)", lat: 47.0230, lng: 28.8330, address: "Str. Bănulescu-Bodoni 41, Centru" },
    { name: "Draft Arena", fsq_id: "fsq_draft_bar_3", category: "Pub & Gastropub", priceLevel: 2, priceLabel: "$$ (~120-220 MDL)", lat: 47.0189, lng: 28.8415, address: "Str. 31 August 1989 78, Centru" },
    { name: "Barbar Bar", fsq_id: "fsq_barbar_bar_6", category: "Cocktails & Nightlife", priceLevel: 2, priceLabel: "$$ (~130-240 MDL)", lat: 47.0215, lng: 28.8370, address: "Str. Mihai Eminescu 56, Centru" }
  ],
  desserts: [
    { name: "Crème de la Crème", fsq_id: "fsq_creme_dessert", category: "French Patisserie", priceLevel: 2, priceLabel: "$$ (~90-180 MDL)", lat: 47.0238, lng: 28.8340, address: "Str. Alexandru cel Bun 98A, Centru" },
    { name: "Delice d'Ange", fsq_id: "fsq_delice_dange", category: "Artisanal Cakes & Pastries", priceLevel: 2, priceLabel: "$$ (~80-160 MDL)", lat: 47.0202, lng: 28.8342, address: "Str. 31 August 1989 117, Centru" },
    { name: "Granier Bakery", fsq_id: "fsq_granier", category: "Bakery & Sweet Treats", priceLevel: 1, priceLabel: "$ (~40-90 MDL)", lat: 47.0232, lng: 28.8335, address: "Bd. Ștefan cel Mare 132, Centru" },
    { name: "Dulcinella Boutique", fsq_id: "fsq_dulcinella", category: "Confectionery & Desserts", priceLevel: 1, priceLabel: "$ (~50-110 MDL)", lat: 47.0195, lng: 28.8410, address: "Str. Tighina 49, Centru" },
    { name: "Morpho Gelato", fsq_id: "fsq_morpho_gelato", category: "Italian Gelateria", priceLevel: 2, priceLabel: "$$ (~70-130 MDL)", lat: 47.0228, lng: 28.8355, address: "Str. Vlaicu Pârcălab 63, Centru" },
    { name: "Tucano Coffee Cheesecake Bar", fsq_id: "fsq_tucano_dessert", category: "Cheesecakes & Coffee", priceLevel: 2, priceLabel: "$$ (~75-140 MDL)", lat: 47.0225, lng: 28.8340, address: "Str. Aleksandr Pușkin 15, Centru" }
  ],
  restaurants: [
    { name: "Osho Bar & Kitchen", fsq_id: "56599eec498e89a644fa47ec", category: "Modern European & Steakhouse", priceLevel: 3, priceLabel: "$$$ (~250-500 MDL)", lat: 47.0061, lng: 28.8602, address: "Bd. Decebal 7/1, Botanica" },
    { name: "Mi Piace", fsq_id: "51d1c578498e66d548d97c58", category: "Italian Restaurant", priceLevel: 3, priceLabel: "$$$ (~250-500 MDL)", lat: 46.9987, lng: 28.8578, address: "Str. Trandafirilor 4, Botanica" },
    { name: "La Taifas", fsq_id: "fsq_taifas_9", category: "Traditional Moldovan", priceLevel: 2, priceLabel: "$$ (~150-300 MDL)", lat: 47.0235, lng: 28.8335, address: "Str. București 67, Centru" },
    { name: "Pegas Restaurant", fsq_id: "fsq_pegas_10", category: "Grill & Terrace", priceLevel: 3, priceLabel: "$$$ (~250-450 MDL)", lat: 47.0315, lng: 28.8510, address: "Str. Albișoara 20/1, Centru" },
    { name: "Andy's Pizza", fsq_id: "fsq_andys_1", category: "Casual Dining & Pizza", priceLevel: 2, priceLabel: "$$ (~120-250 MDL)", lat: 47.0245, lng: 28.8322, address: "Bd. Ștefan cel Mare 202, Centru" },
    { name: "Pizza Mania", fsq_id: "fsq_pizzamania_3", category: "Wood-Fired Pizzeria", priceLevel: 1, priceLabel: "$ (~90-170 MDL)", lat: 47.0261, lng: 28.8354, address: "Bd. Grigore Vieru 13, Centru" }
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
  if (key === 'desserts') return 'cafe';
  return 'restaurant';
}

/**
 * Filters out non-venue noise (supermarkets, monuments, playgrounds, wedding halls, parks)
 * and ensures returned Foursquare results match the user's chosen category.
 */
function isRelevantFoursquarePlace(place, categoryKey) {
  const nameLower = String(place.name || '').toLowerCase();
  const cats = Array.isArray(place.categories) ? place.categories : [];
  const catNames = cats.map((c) => `${c.name || ''} ${c.short_name || ''} ${c.icon?.prefix || ''}`).join(' ').toLowerCase();
  const combined = `${nameLower} ${catNames}`;

  // Always exclude non-social / non-venue POIs
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
    const dessertKeywords = ['dessert', 'bakery', 'pastry', 'patisserie', 'ice cream', 'icecream', 'gelato', 'cake', 'sweet', 'confectionery', 'cafe', 'café', 'crème', 'creme', 'delice', 'dulcinella', 'sandra'];
    return dessertKeywords.some((kw) => combined.includes(kw));
  }

  // Default: restaurants / dining
  const diningKeywords = ['restaurant', 'food/', 'pizza', 'pizzeria', 'steak', 'grill', 'sushi', 'burger', 'bistro', 'kitchen', 'trattoria', 'tavern', 'gastropub', 'bbq', 'diner', 'cafe', 'café', 'bar', 'pub', 'european', 'italian', 'romanian', 'moldovan', 'asian'];
  return diningKeywords.some((kw) => combined.includes(kw));
}

function inferPriceLevel(place, categoryKey) {
  if (place.price && place.price >= 1 && place.price <= 4) {
    return place.price;
  }
  const nameLower = String(place.name || '').toLowerCase();
  const catNames = (place.categories || []).map((c) => (c.name || '').toLowerCase()).join(' ');
  if (nameLower.includes('osho') || nameLower.includes('mi piace') || nameLower.includes('pegas') || nameLower.includes('invino') || catNames.includes('steakhouse') || catNames.includes('fine dining') || catNames.includes('modern european')) {
    return 3;
  }
  if (nameLower.includes('mania') || nameLower.includes('odeon') || nameLower.includes('coffeemolka') || catNames.includes('fast food') || catNames.includes('bakery') || catNames.includes('ice cream')) {
    return 1;
  }
  if (categoryKey === 'cinema') return 2;
  return 2;
}

function resolveFallback(theme = '', centerLat = 47.0185, centerLng = 28.8360) {
  const key = getCategoryKey(theme);
  const places = CATEGORIZED_FALLBACKS[key] || CATEGORIZED_FALLBACKS.restaurants;

  return places.map((p) => {
    let distKm = 1.2;
    let distMeters = 1200;
    if (centerLat != null && centerLng != null && p.lat && p.lng) {
      distMeters = calculateHaversineDistance(centerLat, centerLng, p.lat, p.lng);
      distKm = Number((distMeters / 1000).toFixed(1));
    }
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
    };
  })
  .sort((a, b) => a.distance_meters - b.distance_meters)
  .slice(0, 6);
}

/**
 * Executes a Places API search request against FSQ OS Places (2025-06-17).
 * Note: Does NOT request premium credit fields (`price`, `rating`, `photos`) or legacy `geocodes`
 * so the Free/Developer API key succeeds with HTTP 200 every time.
 */
async function queryFoursquarePlaces({ queryTerm, lat, lng, radius, cleanKey }) {
  const bearerAuth = cleanKey.toLowerCase().startsWith('bearer ') ? cleanKey : `Bearer ${cleanKey}`;
  const rawAuth = cleanKey.replace(/^Bearer\s+/i, '');

  let url = `https://places-api.foursquare.com/places/search?limit=25`;
  if (queryTerm) {
    url += `&query=${encodeURIComponent(queryTerm)}`;
  }
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
    signal: AbortSignal.timeout ? AbortSignal.timeout(4500) : undefined,
  });

  if (response.status === 401) {
    headers.Authorization = rawAuth;
    response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout ? AbortSignal.timeout(4500) : undefined,
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
 * Starts at a 1.2km neighborhood radius and expands outward until at least TARGET_PLACES are found.
 */
const fetchFoursquarePlaces = async (param1 = "restaurant", param2 = 5000, param3 = "Chisinau") => {
  let theme = "restaurant";
  let radius = 5000;
  let latitude = null;
  let longitude = null;

  if (typeof param1 === 'object' && param1 !== null) {
    theme = param1.theme || "restaurant";
    radius = param1.radius || 5000;
    latitude = param1.latitude ?? null;
    longitude = param1.longitude ?? null;
  } else {
    theme = param1;
    radius = param2;
  }

  if (typeof theme !== 'string') {
    theme = 'restaurant';
  }

  // Default city center: Central Chișinău (Ștefan cel Mare / Centru)
  const CHISINAU_LAT = 47.0185;
  const CHISINAU_LNG = 28.8360;

  let centerLat = latitude != null ? Number(latitude) : CHISINAU_LAT;
  let centerLng = longitude != null ? Number(longitude) : CHISINAU_LNG;

  // If browser IP geolocation resolved to a rural node > 12km outside Chișinău,
  // snap search center to Chișinău so local rings find real city spots with accurate distances.
  const distFromCityCenter = calculateHaversineDistance(centerLat, centerLng, CHISINAU_LAT, CHISINAU_LNG);
  if (isNaN(distFromCityCenter) || distFromCityCenter > 12000) {
    centerLat = CHISINAU_LAT;
    centerLng = CHISINAU_LNG;
  }

  const maxRequestedRadius = Math.max(Number(radius) || 5000, 1500);
  const categoryKey = getCategoryKey(theme);
  const queryTerm = getSearchQueryForTheme(theme);

  const rawKey = process.env.FOURSQUARE_API_KEY;
  if (!rawKey || !rawKey.trim()) {
    return resolveFallback(theme, centerLat, centerLng);
  }
  const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '');
  if (!cleanKey) {
    return resolveFallback(theme, centerLat, centerLng);
  }

  // Quantize coordinates to ~200m grid for efficient in-memory caching
  const cacheLat = centerLat.toFixed(3);
  const cacheLng = centerLng.toFixed(3);
  const cacheKey = `v2_${categoryKey}_${maxRequestedRadius}_${cacheLat}_${cacheLng}`;

  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Concentric spatial expansion rings: 1.2 km (neighborhood) -> 3 km -> maxRequestedRadius -> 10 km
  const TARGET_PLACES = 6;
  const rawRings = [
    1200,
    3000,
    maxRequestedRadius,
    Math.max(maxRequestedRadius, 10000),
  ];
  const uniqueRings = [...new Set(rawRings)].sort((a, b) => a - b);

  const accumulatedVenues = new Map();

  try {
    for (const ringRadius of uniqueRings) {
      let placesInRing = await queryFoursquarePlaces({
        queryTerm,
        lat: centerLat,
        lng: centerLng,
        radius: ringRadius,
        cleanKey,
      }).catch((err) => {
        console.warn(`[Spatial Search] Query warning at ${ringRadius}m ring:`, err.message);
        return [];
      });

      // For broad restaurant discovery, if `query=restaurant` returned few items in a tight ring,
      // also run an open spatial query at this ring and filter by food categories
      if (placesInRing.length < 4 && categoryKey === 'restaurants') {
        const broadPlaces = await queryFoursquarePlaces({
          queryTerm: '',
          lat: centerLat,
          lng: centerLng,
          radius: ringRadius,
          cleanKey,
        }).catch(() => []);
        placesInRing = [...placesInRing, ...broadPlaces];
      }

      for (const place of placesInRing) {
        if (!isRelevantFoursquarePlace(place, categoryKey)) continue;

        const id = place.fsq_place_id || place.fsq_id || place.id;
        const normNameKey = String(place.name || '').toLowerCase().trim();
        if (!normNameKey) continue;

        if (!accumulatedVenues.has(normNameKey)) {
          let distMeters = place.distance;
          const placeLat = place.latitude ?? place.geocodes?.main?.latitude;
          const placeLng = place.longitude ?? place.geocodes?.main?.longitude;

          if (distMeters == null && placeLat != null && placeLng != null) {
            distMeters = calculateHaversineDistance(centerLat, centerLng, placeLat, placeLng);
          }
          if (distMeters == null) distMeters = ringRadius * 0.6;

          const distKm = Number((distMeters / 1000).toFixed(1));
          const address = place.location?.address || place.location?.formatted_address || 'Chișinău';
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
          });
        }
      }

      // Early exit if we found sufficient venues in the local spatial hexagon
      if (accumulatedVenues.size >= TARGET_PLACES) {
        break;
      }
    }

    // If a specialized category (like Cinema in a smaller city) has < 6 Foursquare entries,
    // top up the remaining slots with verified local venues from that category so the deck has 6 choices.
    if (accumulatedVenues.size > 0 && accumulatedVenues.size < TARGET_PLACES) {
      const topUpPool = resolveFallback(theme, centerLat, centerLng);
      for (const item of topUpPool) {
        const normKey = item.name.toLowerCase().trim();
        if (!accumulatedVenues.has(normKey)) {
          accumulatedVenues.set(normKey, item);
        }
        if (accumulatedVenues.size >= TARGET_PLACES) break;
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