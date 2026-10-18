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

function generateHexRingCenters(centerLat, centerLng, ringIndex, hexRadiusMeters = 1000) {
  if (ringIndex <= 0) return [{ lat: centerLat, lng: centerLng, cellRadius: hexRadiusMeters }];
  const distanceMeters = Math.sqrt(3) * hexRadiusMeters * ringIndex;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((centerLat * Math.PI) / 180);
  return Array.from({ length: 6 }, (_, i) => {
    const angleRad = ((i * 60) * Math.PI) / 180;
    return {
      lat: Number((centerLat + (distanceMeters * Math.cos(angleRad)) / metersPerDegLat).toFixed(6)),
      lng: Number((centerLng + (distanceMeters * Math.sin(angleRad)) / Math.max(1, metersPerDegLng)).toFixed(6)),
      cellRadius: hexRadiusMeters,
    };
  });
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

function isRelevantFoursquarePlace(place, categoryKey, allowTownHospitality = false) {
  const nameLower = String(place.name || '').toLowerCase().trim();
  if (!nameLower) return false;

  const cats = Array.isArray(place.categories) ? place.categories : [];
  const catNames = cats.map((c) => `${c.name || ''} ${c.short_name || ''}`).join(' ').toLowerCase();
  const combined = `${nameLower} ${catNames}`;

  const bannedPatterns = [
    /\b(convenience store|grocery|supermarket|hypermarket|alimentara|magazin|minimarket|butic)\b/i,
    /\b(gas station|petrol|fuel|peco|rompetrol|lukoil|petrom|bemol|vento|car wash|auto service|tire)\b/i,
    /\b(pharmacy|farmacie|hospital|spital|clinic|clinica|dentist|bank|banca|atm|poșta|post office)\b/i,
    /\b(school|școala|liceul|gimnaziul|university|kindergarten|grădinița|cemetery|cimitir)\b/i,
    /\b(hotel|hostel|motel|apartments|residence|monument|memorial|cernobâl|fountain|havuz|bridge|podul|playground|loc de joacă|ruinele|scuarul)\b/i,
    /\b(winery|vineyard|vinărie|crama|château|chateau)\b/i,
  ];

  // Allow Chateau Vartely in Orhei only for restaurants/bars when close by, block industrial wineries for cafes/desserts
  for (const pat of bannedPatterns) {
    if (pat.test(combined)) {
      if (pat.source.includes('winery') && (categoryKey === 'restaurants' || categoryKey === 'bars') && nameLower.includes('vartely')) {
        continue;
      }
      return false;
    }
  }

  // Also reject if Foursquare explicitly labels it a Store / Retail / Shop (and not a Coffee Shop / Pastry Shop / Ice Cream Shop)
  if (
    /\b(store|shop|market|dealer|repair|salon|barber|frizerie|laundry|spălătorie)\b/i.test(catNames) &&
    !/\b(coffee|cafe|café|pastry|bakery|dessert|ice cream|gelato|sweet|donut|tea|bagel|sandwich|pizza|burger|pie|cake)\b/i.test(catNames)
  ) {
    return false;
  }

  if (categoryKey === 'cinema') {
    return /\b(cinema|movie|theater|theatre|film|multiplex|cineplex|odeon|patria)\b/i.test(combined);
  }

  if (allowTownHospitality) {
    return /\b(restaurant|cafe|café|coffee|espresso|bakery|pastry|patisserie|bistro|dessert|pizza|pizzeria|grill|bar|pub|tavern|trattoria|kebab|fast food|plăcinte|placinte|diner|kitchen|lounge)\b/i.test(combined);
  }

  if (categoryKey === 'cafes') {
    return /\b(cafe|café|coffee|espresso|bakery|pastry|patisserie|tea house|teahouse|bistro|dessert|cappuccino|latte|roastery|tucano|crème|creme|rozmarin|sensi|propaganda|coffeemolka|delice|délice)\b/i.test(combined);
  }

  if (categoryKey === 'bars') {
    return /\b(bar|pub|beer|wine bar|brewery|taproom|cocktail|lounge|nightlife|tavern|pivnice|gastropub|kozlovna|draft|smokehouse|invino|pivko)\b/i.test(combined);
  }

  if (categoryKey === 'desserts') {
    return /\b(dessert|bakery|pastry|patisserie|ice cream|icecream|gelato|cake|sweet|confectionery|cafe|café|crème|creme|delice|délice|dulcinella|sandra|granier|covrigo|cuptorul)\b/i.test(combined);
  }

  return /\b(restaurant|pizza|pizzeria|steak|grill|sushi|burger|bistro|kitchen|trattoria|tavern|gastropub|bbq|diner|cafe|café|bar|pub|european|italian|romanian|moldovan|asian|fast food|plăcinte|placinte|kfc|mcdonald|mcdonald's|hanul)\b/i.test(combined);
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

// Town-level OpenStreetMap hospitality cache so multiple searches in the same town never rate-limit Nominatim
const osmTownCache = new Map();

/**
 * Queries OpenStreetMap Nominatim within a 3.2 km town bounding box around (lat, lng).
 * Uses at most 2 requests spaced by 700ms to strictly respect Nominatim's 1 req/sec policy.
 */
async function getTownOsmHospitalityPlaces(lat, lng, categoryKey = 'restaurants') {
  if (lat == null || lng == null) return [];
  const townKey = `osm_town_${Number(lat).toFixed(2)}_${Number(lng).toFixed(2)}_${categoryKey}`;
  const cached = osmTownCache.get(townKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.places;
  }

  const radiusMeters = 3200;
  const dLat = radiusMeters / 111320;
  const dLng = radiusMeters / Math.max(1, 111320 * Math.cos((lat * Math.PI) / 180));
  const viewbox = `${(lng - dLng).toFixed(5)},${(lat + dLat).toFixed(5)},${(lng + dLng).toFixed(5)},${(lat - dLat).toFixed(5)}`;

  const primaryTerm =
    categoryKey === 'cafes' ? 'cafe' :
    categoryKey === 'bars' ? 'bar' :
    categoryKey === 'desserts' ? 'bakery' :
    categoryKey === 'cinema' ? 'cinema' : 'restaurant';

  const terms = primaryTerm === 'restaurant' ? ['restaurant', 'cafe'] : [primaryTerm, 'restaurant'];
  const allPlaces = [];

  const mapOsmTypeToLabel = (osmType, term) => {
    if (osmType === 'cafe' || term === 'cafe') return 'Coffee & Café';
    if (osmType === 'bakery' || term === 'bakery') return 'Bakery & Desserts';
    if (osmType === 'bar' || osmType === 'pub' || term === 'bar') return 'Bar & Pub';
    if (osmType === 'cinema' || term === 'cinema') return 'Movie Theater';
    if (osmType === 'fast_food') return 'Casual Dining';
    return 'Restaurant';
  };

  for (let i = 0; i < terms.length; i++) {
    const term = terms[i];
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 700));
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(term)}&viewbox=${viewbox}&bounded=1&limit=25&addressdetails=1&accept-language=en,ro`;
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ConsensusEngine/2.0 (https://consensus-engine-mauve.vercel.app)',
        },
        signal: AbortSignal.timeout ? AbortSignal.timeout(3500) : undefined,
      });
      if (!res.ok) continue;
      const items = await res.json();
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (!item.name || item.lat == null || item.lon == null) continue;
        const addrObj = item.address || {};
        const locality = addrObj.city || addrObj.town || addrObj.village || addrObj.municipality || addrObj.suburb || '';
        const street = [addrObj.road, addrObj.house_number].filter(Boolean).join(' ');
        const formattedAddr = [street, locality].filter(Boolean).join(', ') || item.display_name?.split(',').slice(0, 2).join(', ') || 'Local Area';
        const catLabel = mapOsmTypeToLabel(item.type, term);

        allPlaces.push({
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
    } catch {
      // Ignore individual term timeout
    }
  }

  if (allPlaces.length > 0) {
    osmTownCache.set(townKey, { places: allPlaces, timestamp: Date.now() });
  }
  return allPlaces;
}

/**
 * Uber-Style Expanding Hexagonal Spatial Search Engine:
 * - Ring 0: Center 1.2 km hexagon around (centerLat, centerLng)
 * - Ring 1: 3.0 km town/neighborhood hex cluster (covers an entire town like Strășeni, Orhei, Soroca, Cahul)
 * - Ring 2: 4.5 km expanded city ring (only used if < 4 local places exist in the 3.0 km town ring)
 * Never jumps to highway stops (7km+) or neighboring villages (11km+) when in-town venues exist.
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
  const cacheKey = `hex_v8_${categoryKey}_${cacheLat}_${cacheLng}_${isExactGps}`;

  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const TARGET_PLACES = 6;
  const hexRingsMeters = categoryKey === 'cinema' ? [2500, 6000, 15000] : [1200, 3000, 4500];
  const accumulatedVenues = new Map();

  const ingestCandidates = (candidates, maxRadiusMeters, allowTownHospitality = false) => {
    for (const place of candidates) {
      if (!isRelevantFoursquarePlace(place, categoryKey, allowTownHospitality)) continue;

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
        distMeters = maxRadiusMeters;
      }

      // Strictly enforce ring boundary so out-of-town highway stops (7km - 11km) are rejected
      if (distMeters > maxRadiusMeters * 1.1) continue;

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
    const townOsmPromise = categoryKey !== 'cinema'
      ? getTownOsmHospitalityPlaces(centerLat, centerLng, categoryKey).catch(() => [])
      : Promise.resolve([]);

    for (let ringIdx = 0; ringIdx < hexRingsMeters.length; ringIdx++) {
      const ringRadius = hexRingsMeters[ringIdx];

      const tasks = [townOsmPromise];
      if (cleanKey) {
        tasks.push(
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
          }).catch(() => [])
        );
      }

      const results = await Promise.all(tasks);
      const allRingCandidates = results.flat();
      ingestCandidates(allRingCandidates, ringRadius, false);

      // In Ring 1 (3.0 km town radius), if a smaller town (like Strășeni) has fewer than 6 strict matches
      // for a sub-category (e.g. only 2 pure cafes), fill the remaining spots from the town's own local
      // restaurants/bakeries/pubs within 3.2 km (from both Foursquare and OSM) rather than expanding
      // 7-11 km out to highways or neighboring villages!
      if (ringIdx === 1 && accumulatedVenues.size < TARGET_PLACES && categoryKey !== 'cinema') {
        ingestCandidates(allRingCandidates, 3200, true);
      }

      // Stop expanding as soon as we have enough local venues (or at least 3 in-town venues within 3km)
      if (accumulatedVenues.size >= TARGET_PLACES || (ringIdx >= 1 && accumulatedVenues.size >= 3)) {
        break;
      }
    }

    if (accumulatedVenues.size > 0) {
      let candidatesList = Array.from(accumulatedVenues.values())
        .sort((a, b) => a.distance_meters - b.distance_meters)
        .slice(0, 8);

      // Compute true road/bridge network distances via OSRM
      candidatesList = await enrichVenuesWithRoadDistances(centerLat, centerLng, candidatesList, isExactGps);

      const sortedResults = candidatesList
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

/**
 * Returns verified venue photos only (never scrapes random web search thumbnails).
 */
async function fetchRealVenuePhotos() {
  return [];
}

/**
 * Queries OSRM (Open Source Routing Machine) to replace straight-line Haversine distances
 * with actual street/road network distances and travel durations.
 */
async function enrichVenuesWithRoadDistances(centerLat, centerLng, venues, isExactGps) {
  if (!Array.isArray(venues) || venues.length === 0 || centerLat == null || centerLng == null) {
    return venues;
  }
  const withCoords = venues.filter((v) => v.lat != null && v.lng != null);
  if (withCoords.length === 0) return venues;

  try {
    const coordPairs = [`${centerLng},${centerLat}`, ...withCoords.map((v) => `${v.lng},${v.lat}`)].join(';');
    const url = `https://router.project-osrm.org/table/v1/driving/${coordPairs}?sources=0&annotations=distance,duration`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout ? AbortSignal.timeout(2500) : undefined,
    });
    if (!res.ok) return venues;
    const data = await res.json();
    const roadDistances = data?.distances?.[0];
    const driveDurations = data?.durations?.[0];
    if (!Array.isArray(roadDistances)) return venues;

    return venues.map((v) => {
      const idx = withCoords.findIndex((wc) => wc.name === v.name && wc.lat === v.lat);
      if (idx === -1) return v;
      const roadMeters = roadDistances[idx + 1];
      const driveSec = driveDurations?.[idx + 1];
      if (typeof roadMeters !== 'number' || isNaN(roadMeters) || roadMeters <= 0) return v;

      const roadKm = Math.max(0.1, Number((roadMeters / 1000).toFixed(1)));
      return {
        ...v,
        distance_meters: Math.round(roadMeters),
        distance_km: isExactGps ? roadKm : null,
        drive_minutes: typeof driveSec === 'number' ? Math.max(2, Math.round(driveSec / 60)) : Math.max(2, Math.round(roadKm * 2.2)),
        walk_minutes: Math.max(2, Math.round(roadMeters / 78)),
      };
    });
  } catch {
    return venues;
  }
}

module.exports = {
  fetchFoursquarePlaces,
  searchRestaurants: fetchFoursquarePlaces,
  fetchRealVenuePhotos,
  enrichVenuesWithRoadDistances,
  formatPriceLabel,
  generateHexRingCenters,
  CATEGORIZED_FALLBACKS,
  FALLBACK_PLACES: CATEGORIZED_FALLBACKS.restaurants,
};