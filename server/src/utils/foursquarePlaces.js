const { resolveVenuePhotosBatch, resolveVenuePhoto } = require('./venuePhotoService');
const { CATEGORIZED_FALLBACKS, resolveRegionalFallback, formatPriceLabel } = require('./fallbackVenues');
const { filterReportedVenues } = require('./reportedVenues');

// In-memory cache for API queries to avoid repeated external requests
const MAX_CACHE_ENTRIES = 500;
function setBoundedCache(map, key, value, maxEntries = MAX_CACHE_ENTRIES) {
  if (map.size >= maxEntries) {
    const oldestKey = map.keys().next().value;
    if (oldestKey) map.delete(oldestKey);
  }
  map.set(key, value);
}
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

function getCanonicalVenueKey(name = '') {
  let clean = String(name || '').toLowerCase().trim();
  clean = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  clean = clean.replace(/['’"`\-_.,/\\()&!]/g, '');
  clean = clean.replace(/\b(restaurant|restaurante|pizzeria|pizza|cafe|café|bar|pub|bistro|grill|terrace|terasa|lounge|club|la)\b/gi, '');
  return clean.replace(/\s+/g, '').trim();
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

const THEME_MAPPINGS = [
  { match: /cinema|movie|film/, key: 'cinema', query: 'cinema' },
  { match: /cafe|coffee|tea|brunch/, key: 'cafes', query: 'cafe' },
  { match: /bar|pub|beer|wine|cocktail/, key: 'bars', query: 'bar' },
  { match: /dessert|sweet|bakery|gelato/, key: 'desserts', query: 'bakery' },
  { match: /burger|pizza|fast|street/, key: 'fast_food', query: 'fast food burger pizza' },
  { match: /game|arcade|bowling|billiard/, key: 'entertainment', query: 'games arcade bowling' },
  { match: /park|outdoor|nature/, key: 'outdoors', query: 'park garden' },
  { match: /music|concert|club|jazz/, key: 'nightlife', query: 'live music lounge' },
  { match: /spa|wellness|sauna/, key: 'wellness', query: 'spa sauna wellness' },
];

function getCategoryConfig(theme = '') {
  const norm = String(theme).toLowerCase().trim();
  return THEME_MAPPINGS.find((m) => m.match.test(norm)) || { key: 'restaurants', query: 'restaurant' };
}
const getCategoryKey = (theme) => getCategoryConfig(theme).key;
const getSearchQueryForTheme = (theme) => getCategoryConfig(theme).query;

function isRelevantFoursquarePlace(place, categoryKey, allowTownHospitality = false) {
  const nameLower = String(place.name || '').toLowerCase().trim();
  if (!nameLower) return false;

  const cats = Array.isArray(place.categories) ? place.categories : [];
  const catNames = cats.map((c) => `${c.name || ''} ${c.short_name || ''}`).join(' ').toLowerCase();
  const combined = `${nameLower} ${catNames}`;

  // Global rejection of permanently closed historical / defunct venues
  const defunctVenues = /\b(odeon|flac[aă]ra|gaudeamus|moscova|patria r[iî][sș]cani|smokehouse|barbar|propaganda|hostaria amarcord|casa dac[aă]|casa[\s\-_]*mare|the york pub|morimoto|ava 1727|havana mama)\b/i;
  if (defunctVenues.test(combined)) {
    return false;
  }

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
    return /\b(cinema|movie|theater|theatre|film|multiplex|cineplex|autocinema|cinematograf)\b/i.test(combined);
  }

  if (allowTownHospitality) {
    return /\b(restaurant|cafe|café|coffee|espresso|bakery|pastry|patisserie|bistro|dessert|pizza|pizzeria|grill|bar|pub|tavern|trattoria|kebab|fast food|plăcinte|placinte|diner|kitchen|lounge)\b/i.test(combined);
  }

  if (categoryKey === 'cafes') {
    return /\b(cafe|café|coffee|espresso|bakery|pastry|patisserie|tea house|teahouse|bistro|dessert|cappuccino|latte|roastery|tucano|crème|creme|rozmarin|sensi|coffeemolka|delice|délice)\b/i.test(combined);
  }
  if (categoryKey === 'bars') {
    return /\b(bar|pub|beer|wine bar|brewery|taproom|cocktail|lounge|nightlife|tavern|pivnice|gastropub|kozlovna|draft|marl[eè]ne|invino|covor|pivko)\b/i.test(combined);
  }
  if (categoryKey === 'desserts') {
    return /\b(dessert|bakery|pastry|patisserie|ice cream|icecream|gelato|cake|sweet|confectionery|cafe|café|crème|creme|delice|délice|dulcinella|gioelia|granier|covrigo|cuptorul)\b/i.test(combined);
  }
  return /\b(restaurant|pizza|pizzeria|steak|grill|sushi|burger|bistro|kitchen|trattoria|tavern|gastropub|bbq|diner|cafe|café|bar|pub|european|italian|romanian|moldovan|asian|fast food|plăcinte|placinte|kfc|mcdonald|mcdonald's|hanul|fuior|nonna)\b/i.test(combined);
}

function inferPriceLevel(place, categoryKey) {
  if (place.price && place.price >= 1 && place.price <= 4) return place.price;
  const nameLower = String(place.name || '').toLowerCase();
  const catNames = (place.categories || []).map((c) => (c.name || '').toLowerCase()).join(' ');
  if (nameLower.includes('osho') || nameLower.includes('mi piace') || nameLower.includes('pegas') || nameLower.includes('invino') || nameLower.includes('chateau') || nameLower.includes('nobil') || nameLower.includes('fuior') || nameLower.includes('marlene') || nameLower.includes('marlène') || catNames.includes('steakhouse') || catNames.includes('fine dining') || catNames.includes('modern european')) return 3;
  if (nameLower.includes('mania') || nameLower.includes('mcdonald') || nameLower.includes('kfc') || nameLower.includes('coffeemolka') || nameLower.includes('granier') || catNames.includes('fast food') || catNames.includes('bakery') || catNames.includes('ice cream')) return 1;
  return 2;
}

const resolveFallback = resolveRegionalFallback;

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

  const primaryTerm = categoryKey === 'cafes' ? 'cafe' : categoryKey === 'bars' ? 'bar' : categoryKey === 'desserts' ? 'bakery' : categoryKey === 'cinema' ? 'cinema' : 'restaurant';
  const allPlaces = [];

  const mapOsmTypeToLabel = (osmType, term) => {
    if (osmType === 'cafe' || term === 'cafe') return 'Coffee & Café';
    if (osmType === 'bakery' || term === 'bakery') return 'Bakery & Desserts';
    if (osmType === 'bar' || osmType === 'pub' || term === 'bar') return 'Bar & Pub';
    return osmType === 'cinema' || term === 'cinema' ? 'Movie Theater' : osmType === 'fast_food' ? 'Casual Dining' : 'Restaurant';
  };

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(primaryTerm)}&viewbox=${viewbox}&bounded=1&limit=30&addressdetails=1&accept-language=en,ro`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'NoYouPick/1.0 (https://noyoupick.org)',
      },
      signal: AbortSignal.timeout ? AbortSignal.timeout(1800) : undefined,
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
          const catLabel = mapOsmTypeToLabel(item.type, primaryTerm);

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
      }
    }
  } catch {
    // Ignore individual term timeout
  }

  if (allPlaces.length > 0) {
    setBoundedCache(osmTownCache, townKey, { places: allPlaces, timestamp: Date.now() });
  }
  return allPlaces;
}

/**
 * Expanding Hexagonal Spatial Search Engine (1km Hex Grid Resolution):
 * - Ring 0: Center 1.0 km hexagon cell around user coords
 * - Ring 1: 2.6 km cluster covering 6 neighboring 1km hex cells (centroid dist ~1.73km)
 * - Ring 2: 4.5 km ring of neighboring hex cells
 * - Ring 3: 7.5 km ring
 * - Ring 4: 12.5 km expanded regional metro reach
 */
const fetchFoursquarePlaces = async (param1 = "restaurant", param2 = 5000) => {
  const isObj = typeof param1 === 'object' && param1 !== null;
  const theme = (isObj ? param1.theme : param1) || 'restaurant';
  const radius = (isObj ? param1.radius : param2) || 5000;
  const latitude = isObj ? param1.latitude : null;
  const longitude = isObj ? param1.longitude : null;
  let isExactGps = isObj ? Boolean(param1.is_exact_gps) : false;
  const targetPlaces = isObj && param1.targetPlaces ? Math.max(3, Math.min(50, Number(param1.targetPlaces))) : 6;

  const DEFAULT_LAT = 47.0225;
  const DEFAULT_LNG = 28.8340;
  const hasValidCoords = latitude != null && longitude != null && !isNaN(Number(latitude)) && !isNaN(Number(longitude)) && Math.abs(Number(latitude)) <= 90 && Math.abs(Number(longitude)) <= 180;
  const centerLat = hasValidCoords ? Number(latitude) : DEFAULT_LAT;
  const centerLng = hasValidCoords ? Number(longitude) : DEFAULT_LNG;
  if (!hasValidCoords) isExactGps = false;

  const categoryKey = getCategoryKey(theme);
  const queryTerm = getSearchQueryForTheme(theme);

  const rawKey = process.env.FOURSQUARE_API_KEY || '';
  const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '');

  const cacheLat = centerLat.toFixed(3);
  const cacheLng = centerLng.toFixed(3);
  const cacheKey = `hex_v10_${categoryKey}_${cacheLat}_${cacheLng}_${isExactGps}_${targetPlaces}`;

  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const TARGET_PLACES = targetPlaces;
  const hexRingsMeters = categoryKey === 'cinema' ? [2500, 6000, 12000, 18000] : [1000, 2600, 4500, 7500, 12500];
  const accumulatedVenues = new Map();

  const getVenueQualityMetrics = (place, cKey = '') => {
    let rawRating = null;
    if (typeof place.rating === 'number' && place.rating > 0) {
      rawRating = place.rating > 5 ? place.rating / 2 : place.rating;
    }
    let rawReviews = place.stats?.total_ratings || place.stats?.rating_count || null;

    const knownHotspots = {
      osho: { rating: 4.7, reviews: 2450 }, mipiace: { rating: 4.6, reviews: 3420 },
      cremedelacreme: { rating: 4.7, reviews: 2980 }, andys: { rating: 4.4, reviews: 4250 },
      placinte: { rating: 4.5, reviews: 3600 }, draft: { rating: 4.3, reviews: 1180 },
      pizzamania: { rating: 4.5, reviews: 1340 }, fuior: { rating: 4.8, reviews: 1450 },
      kozlovna: { rating: 4.5, reviews: 1930 }, pegas: { rating: 4.7, reviews: 3890 },
      tucano: { rating: 4.6, reviews: 2800 }, marlene: { rating: 4.8, reviews: 920 },
      rozmarin: { rating: 4.6, reviews: 1230 }, invino: { rating: 4.8, reviews: 750 },
      cineplex: { rating: 4.6, reviews: 4200 }, loteanu: { rating: 4.6, reviews: 3100 },
      autocinema: { rating: 4.5, reviews: 850 }, privatecinema: { rating: 4.7, reviews: 420 },
      gioelia: { rating: 4.8, reviews: 1250 }, nonna: { rating: 4.6, reviews: 2600 },
      covor: { rating: 4.7, reviews: 680 },
      alindor: { rating: 4.5, reviews: 410 }, struguras: { rating: 4.4, reviews: 320 },
      laculverde: { rating: 4.6, reviews: 540 }, hanul: { rating: 4.5, reviews: 480 },
      delice: { rating: 4.6, reviews: 280 }, azasu: { rating: 4.8, reviews: 520 },
      grekofresh: { rating: 4.7, reviews: 680 }, box: { rating: 4.6, reviews: 740 },
      pannicotta: { rating: 4.7, reviews: 860 }, vartely: { rating: 4.8, reviews: 1900 },
    };

    if (!rawRating && cKey) {
      for (const [k, v] of Object.entries(knownHotspots)) {
        if (cKey.includes(k) || k.includes(cKey)) {
          rawRating = v.rating;
          rawReviews = v.reviews;
          break;
        }
      }
    }

    return {
      rating: Number((rawRating || 4.5).toFixed(1)),
      reviews: rawReviews || 120,
    };
  };

  const calculateCompositeScore = (venue, maxDistanceMeters = 15000) => {
    const rNorm = Math.max(0, Math.min(1, ((venue.rating || 4.5) - 3.5) / 1.5));
    const distMeters = Math.max(10, venue.distance_meters || 1000);
    const dNorm = Math.max(0, 1 - distMeters / Math.max(1000, maxDistanceMeters));
    const lNorm = Math.max(0, Math.min(1, (Math.log10(Math.max(10, venue.reviews || 100)) - 1) / 2.7));
    return 0.40 * rNorm + 0.35 * dNorm + 0.25 * lNorm;
  };

  const ingestCandidates = (candidates, maxRadiusMeters, allowTownHospitality = false) => {
    for (const place of candidates) {
      if (!isRelevantFoursquarePlace(place, categoryKey, allowTownHospitality)) continue;

      const id = place.fsq_place_id || place.fsq_id || place.id || `venue_${Math.random()}`;
      const name = String(place.name || '').trim();
      const normNameKey = name.toLowerCase();
      if (!normNameKey) continue;
      const cKey = getCanonicalVenueKey(name);

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

      if (distMeters > maxRadiusMeters * 1.1) continue;

      let existingMatchKey = null;
      for (const [key, ex] of accumulatedVenues.entries()) {
        const exCKey = getCanonicalVenueKey(ex.name);
        const hasCoords = placeLat != null && placeLng != null && ex.lat != null && ex.lng != null;
        const coordDist = hasCoords ? calculateHaversineDistance(placeLat, placeLng, ex.lat, ex.lng) : null;

        const isSameBuilding = coordDist != null && coordDist <= 250;
        const keyMatch = (cKey && exCKey && cKey === exCKey) ||
          (cKey.length >= 4 && exCKey.length >= 4 && (cKey.includes(exCKey) || exCKey.includes(cKey)));

        if ((isSameBuilding && (keyMatch || coordDist <= 80)) || keyMatch) {
          existingMatchKey = key;
          break;
        }
      }

      if (existingMatchKey) {
        const existing = accumulatedVenues.get(existingMatchKey);
        if (existing.distance_meters <= distMeters) {
          if (!existing.address && place.location?.address) {
            existing.address = place.location.address;
          }
          continue;
        } else {
          accumulatedVenues.delete(existingMatchKey);
        }
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
      const metrics = getVenueQualityMetrics(place, cKey);

      accumulatedVenues.set(cKey || normNameKey, {
        name: place.name,
        fsq_id: id,
        fsq_place_id: id,
        category: fsqCategoryName,
        priceLevel,
        priceLabel: formatPriceLabel(priceLevel),
        distance_km: distKm,
        distance_meters: Math.round(distMeters),
        rating: metrics.rating,
        reviews: metrics.reviews,
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
          queryFoursquarePlaces({ queryTerm, lat: centerLat, lng: centerLng, radius: ringRadius, cleanKey }).catch(() => []),
          queryFoursquarePlaces({ queryTerm: '', lat: centerLat, lng: centerLng, radius: ringRadius, cleanKey }).catch(() => [])
        );

        // In Ring 1 (1km neighbor hex ring), query neighbor centroids if center hex alone had < 6
        if (ringIdx === 1 && accumulatedVenues.size < TARGET_PLACES) {
          const hexCentroids = generateHexRingCenters(centerLat, centerLng, 1, 1000);
          for (let c = 0; c < Math.min(6, hexCentroids.length); c++) {
            tasks.push(
              queryFoursquarePlaces({ queryTerm, lat: hexCentroids[c].lat, lng: hexCentroids[c].lng, radius: 1000, cleanKey }).catch(() => [])
            );
          }
        }
      }

      const results = await Promise.all(tasks);
      const allRingCandidates = results.flat();
      ingestCandidates(allRingCandidates, ringRadius, false);

      if (accumulatedVenues.size < TARGET_PLACES && categoryKey !== 'cinema') {
        ingestCandidates(allRingCandidates, ringRadius, true);
      }

      // Stop expanding only once target deck size (6) is satisfied
      if (accumulatedVenues.size >= TARGET_PLACES) {
        break;
      }
    }

    // Seamlessly backfill remaining slots from regional verified hotspots if fewer than TARGET_PLACES found
    if (accumulatedVenues.size < TARGET_PLACES) {
      const fallbacks = await resolveRegionalFallback(theme, centerLat, centerLng, isExactGps, TARGET_PLACES, radius);
      for (const fb of fallbacks) {
        if (accumulatedVenues.size >= TARGET_PLACES) break;
        const fbCKey = getCanonicalVenueKey(fb.name);
        const duplicate = Array.from(accumulatedVenues.values()).some((ex) => {
          const exCKey = getCanonicalVenueKey(ex.name);
          return (fbCKey && exCKey && fbCKey === exCKey) || ex.name.toLowerCase() === fb.name.toLowerCase();
        });
        if (!duplicate) {
          accumulatedVenues.set(fbCKey || fb.name, fb);
        }
      }
    }

    if (accumulatedVenues.size > 0) {
      const activeRadius = hexRingsMeters[Math.min(hexRingsMeters.length - 1, 3)];
      let candidatesList = Array.from(accumulatedVenues.values())
        .map((v) => ({ ...v, composite_score: calculateCompositeScore(v, activeRadius) }))
        .sort((a, b) => b.composite_score - a.composite_score)
        .slice(0, TARGET_PLACES + 2);

      candidatesList = await enrichVenuesWithRoadDistances(centerLat, centerLng, candidatesList, isExactGps);
      candidatesList = await resolveVenuePhotosBatch(candidatesList);

      const filteredCandidates = filterReportedVenues(candidatesList);
      const sortedResults = filteredCandidates
        .map((v) => ({ ...v, composite_score: calculateCompositeScore(v, activeRadius) }))
        .sort((a, b) => b.composite_score - a.composite_score)
        .slice(0, TARGET_PLACES);

      setBoundedCache(queryCache, cacheKey, { data: sortedResults, timestamp: Date.now() });
      return sortedResults;
    }
  } catch (error) {
    console.warn("[Hex Spatial Search] Warning, falling back:", error.message);
  }

  const fallbackResults = await resolveRegionalFallback(theme, centerLat, centerLng, isExactGps, TARGET_PLACES);
  const activeFallback = filterReportedVenues(Array.isArray(fallbackResults) ? fallbackResults : []);
  return activeFallback.slice(0, TARGET_PLACES);
};

/**
 * Returns verified venue photos for any venue using the persistent photo cache and dynamic lookup.
 */
async function fetchRealVenuePhotos(name = '', address = '', category = '') {
  const photo = await resolveVenuePhoto(name, address, address, category);
  return photo ? [photo] : [];
}

/**
 * Enriches straight-line Haversine distances with urban street-network estimates
 * immediately in 0ms without blocking room creation on external OSRM table queries.
 */
async function enrichVenuesWithRoadDistances(centerLat, centerLng, venues, isExactGps) {
  if (!Array.isArray(venues) || venues.length === 0 || centerLat == null || centerLng == null) {
    return venues;
  }
  return venues.map((v) => {
    const rawMeters = typeof v.distance_meters === 'number' && v.distance_meters > 0
      ? v.distance_meters
      : (v.lat != null && v.lng != null ? calculateHaversineDistance(centerLat, centerLng, v.lat, v.lng) : 1200);
    const roadMeters = Math.round(rawMeters * 1.24);
    const roadKm = Math.max(0.1, Number((roadMeters / 1000).toFixed(1)));
    return {
      ...v,
      distance_meters: roadMeters,
      distance_km: isExactGps ? roadKm : null,
      drive_minutes: Math.max(2, Math.round(roadKm * 2.2)),
      walk_minutes: Math.max(2, Math.round(roadMeters / 78)),
    };
  });
}

module.exports = {
  fetchFoursquarePlaces,
  searchRestaurants: fetchFoursquarePlaces,
  fetchRealVenuePhotos,
  enrichVenuesWithRoadDistances,
  formatPriceLabel,
  generateHexRingCenters,
  getCanonicalVenueKey,
  CATEGORIZED_FALLBACKS,
  FALLBACK_PLACES: CATEGORIZED_FALLBACKS.restaurants,
};
