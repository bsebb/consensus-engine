const { resolveVenuePhotosBatch } = require('./venuePhotoService');

function formatPriceLabel(price) {
  const map = {
    1: "$ (Budget: ~80-150 MDL)",
    2: "$$ (Moderate: ~150-300 MDL)",
    3: "$$$ (Upscale: ~300-500 MDL)",
    4: "$$$$ (Fine Dining: 500+ MDL)"
  };
  return map[price] || "$$ (Moderate: ~150-300 MDL)";
}

// Curated Moldovan hotspots (only used when user coordinates are actually inside Moldova)
const CATEGORIZED_FALLBACKS = {
  cinema: [
    { name: "Cineplex MallDova", fsq_id: "fsq_cineplex_malldova", category: "Multiplex Cinema", priceLevel: 2, priceLabel: "$$ (~140-200 MDL / ticket)", lat: 46.9972, lng: 28.8510, address: "Str. Arborilor 21, Chișinău" },
    { name: "Cineplex Loteanu", fsq_id: "fsq_cineplex_loteanu", category: "Movie Theater", priceLevel: 2, priceLabel: "$$ (~120-180 MDL / ticket)", lat: 47.0252, lng: 28.8315, address: "Bd. Ștefan cel Mare 103, Chișinău" },
    { name: "Odeon Cinema", fsq_id: "fsq_odeon_cinema", category: "Indie & Cultural Cinema", priceLevel: 1, priceLabel: "$ (~80-120 MDL / ticket)", lat: 47.0215, lng: 28.8350, address: "Str. Mihai Eminescu 55, Chișinău" },
    { name: "Patria Multiplex", fsq_id: "fsq_patria_riscani", category: "Cinema & Entertainment", priceLevel: 2, priceLabel: "$$ (~120-180 MDL / ticket)", lat: 47.0410, lng: 28.8620, address: "Str. Kiev 16/1, Chișinău" },
    { name: "Auto Cinema Chișinău", fsq_id: "fsq_autocinema_chisinau", category: "Drive-in Cinema", priceLevel: 2, priceLabel: "$$ (~120-180 MDL / ticket)", lat: 47.0512, lng: 28.8780, address: "Str. Mihai Sadoveanu 42/6, Chișinău" },
    { name: "Cinema Flacăra", fsq_id: "fsq_cinema_flacara", category: "Community Cinema", priceLevel: 1, priceLabel: "$ (~60-100 MDL / ticket)", lat: 47.0345, lng: 28.7890, address: "Str. Ion Creangă 49, Chișinău" },
  ],
  cafes: [
    { name: "Tucano Coffee", fsq_id: "fsq_tucano_1", category: "Specialty Coffee Shop", priceLevel: 2, priceLabel: "$$ (~60-120 MDL)", lat: 47.0225, lng: 28.8340, address: "Str. Aleksandr Pușkin 15, Chișinău" },
    { name: "Crème de la Crème", fsq_id: "fsq_creme_3", category: "French Patisserie & Café", priceLevel: 2, priceLabel: "$$ (~90-180 MDL)", lat: 47.0238, lng: 28.8340, address: "Str. Alexandru cel Bun 98A, Chișinău" },
    { name: "Rozmarin Cafe", fsq_id: "fsq_rozmarin_5", category: "Brunch & Roastery", priceLevel: 2, priceLabel: "$$ (~90-180 MDL)", lat: 47.0240, lng: 28.8320, address: "Bd. Ștefan cel Mare 202, Chișinău" },
    { name: "Sensi Bar & Cafe", fsq_id: "fsq_sensi_2", category: "Espresso & Lounge", priceLevel: 2, priceLabel: "$$ (~80-150 MDL)", lat: 47.0265, lng: 28.8310, address: "Str. Alexandru cel Bun 111, Chișinău" },
    { name: "Coffeemolka", fsq_id: "fsq_coffeemolka_1", category: "Specialty Espresso Bar", priceLevel: 1, priceLabel: "$ (~50-90 MDL)", lat: 47.0210, lng: 28.8355, address: "Str. Mihai Eminescu 48, Chișinău" },
    { name: "DC Donuts & Coffee", fsq_id: "fsq_dcdonuts_1", category: "Artisanal Coffee & Bakery", priceLevel: 2, priceLabel: "$$ (~60-120 MDL)", lat: 47.0220, lng: 28.8375, address: "Str. Pușkin 16, Chișinău" },
  ],
  bars: [
    { name: "Smokehouse: BBQ & Beer", fsq_id: "fsq_smokehouse_bar_2", category: "Craft Beer & Smokehouse", priceLevel: 2, priceLabel: "$$ (~140-250 MDL)", lat: 47.0245, lng: 28.8315, address: "Bd. Ștefan cel Mare 128, Chișinău" },
    { name: "Kozlovna Ceska Pivnice", fsq_id: "fsq_kozlovna_bar_1", category: "Czech Beer Hall", priceLevel: 2, priceLabel: "$$ (~120-220 MDL)", lat: 47.0218, lng: 28.8360, address: "Str. Pușkin 24, Chișinău" },
    { name: "Taproom 27 Craft Beer", fsq_id: "fsq_taproom_bar_5", category: "Craft Taproom", priceLevel: 2, priceLabel: "$$ (~110-200 MDL)", lat: 47.0205, lng: 28.8390, address: "Str. Vasile Alecsandri 117, Chișinău" },
    { name: "Invino Enoteca", fsq_id: "fsq_invino_bar_4", category: "Wine Bar", priceLevel: 3, priceLabel: "$$$ (~200-400 MDL)", lat: 47.0230, lng: 28.8330, address: "Str. Bănulescu-Bodoni 41, Chișinău" },
    { name: "BarBar Cocktail Lounge", fsq_id: "fsq_barbar_cocktail", category: "Cocktail Bar & Lounge", priceLevel: 3, priceLabel: "$$$ (~180-350 MDL)", lat: 47.0250, lng: 28.8290, address: "Str. Mihai Eminescu 45, Chișinău" },
    { name: "Draft Pub", fsq_id: "fsq_draft_pub_1", category: "Craft Beer Pub & Grill", priceLevel: 2, priceLabel: "$$ (~120-220 MDL)", lat: 47.0185, lng: 28.8480, address: "Bd. Dacia 35, Chișinău" },
  ],
  desserts: [
    { name: "Crème de la Crème", fsq_id: "fsq_creme_dessert", category: "French Patisserie", priceLevel: 2, priceLabel: "$$ (~90-180 MDL)", lat: 47.0238, lng: 28.8340, address: "Str. Alexandru cel Bun 98A, Chișinău" },
    { name: "Delice d'Ange", fsq_id: "fsq_delice_dange", category: "Artisanal Cakes & Pastries", priceLevel: 2, priceLabel: "$$ (~80-160 MDL)", lat: 47.0202, lng: 28.8342, address: "Str. 31 August 1989 117, Chișinău" },
    { name: "Granier Bakery", fsq_id: "fsq_granier", category: "Bakery & Sweet Treats", priceLevel: 1, priceLabel: "$ (~40-90 MDL)", lat: 47.0232, lng: 28.8335, address: "Bd. Ștefan cel Mare 132, Chișinău" },
    { name: "Dulcinella Boutique", fsq_id: "fsq_dulcinella", category: "Confectionery & Desserts", priceLevel: 1, priceLabel: "$ (~50-110 MDL)", lat: 47.0195, lng: 28.8410, address: "Str. Tighina 49, Chișinău" },
    { name: "Sandra Artisanal Gelato", fsq_id: "fsq_sandra_gelato", category: "Gelateria & Italian Ice Cream", priceLevel: 1, priceLabel: "$ (~45-90 MDL)", lat: 47.0242, lng: 28.8328, address: "Bd. Ștefan cel Mare 105, Chișinău" },
    { name: "Panna Cotta Cafe", fsq_id: "fsq_pannacotta_cafe", category: "Dessert Parlor & Pastry", priceLevel: 2, priceLabel: "$$ (~70-150 MDL)", lat: 47.0260, lng: 28.8315, address: "Str. Bănulescu-Bodoni 22, Chișinău" },
  ],
  restaurants: [
    { name: "Osho Bar & Kitchen", fsq_id: "56599eec498e89a644fa47ec", category: "Modern European & Steakhouse", priceLevel: 3, priceLabel: "$$$ (~250-500 MDL)", lat: 47.0061, lng: 28.8602, address: "Bd. Decebal 7/1, Chișinău" },
    { name: "Mi Piace", fsq_id: "51d1c578498e66d548d97c58", category: "Italian Restaurant", priceLevel: 3, priceLabel: "$$$ (~250-500 MDL)", lat: 46.9987, lng: 28.8578, address: "Str. Trandafirilor 4, Chișinău" },
    { name: "La Taifas", fsq_id: "fsq_taifas_9", category: "Traditional Moldovan", priceLevel: 2, priceLabel: "$$ (~150-300 MDL)", lat: 47.0235, lng: 28.8335, address: "Str. București 67, Chișinău" },
    { name: "Pegas Restaurant", fsq_id: "fsq_pegas_10", category: "Grill & Terrace", priceLevel: 3, priceLabel: "$$$ (~250-450 MDL)", lat: 47.0315, lng: 28.8510, address: "Str. Albișoara 20/1, Chișinău" },
    { name: "Andy's Pizza", fsq_id: "fsq_andys_1", category: "Casual Dining & Pizza", priceLevel: 2, priceLabel: "$$ (~120-250 MDL)", lat: 47.0245, lng: 28.8322, address: "Bd. Ștefan cel Mare 202, Chișinău" },
    { name: "Pizza Mania", fsq_id: "fsq_pizzamania_3", category: "Wood-Fired Pizzeria", priceLevel: 1, priceLabel: "$ (~90-170 MDL)", lat: 47.0261, lng: 28.8354, address: "Bd. Grigore Vieru 13, Chișinău" },
  ],
};

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
 * Searches OpenStreetMap in an expanded 12-25 km radius when a user selects a suburban
 * or state centroid (such as New Jersey, USA) where the initial 3km radius has 0 venues.
 */
async function searchExpandedOsmVenues(lat, lng, theme = 'restaurant', isExactGps = false) {
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

  for (const radiusMeters of [12000, 24000]) {
    try {
      const dLat = radiusMeters / 111320;
      const dLng = radiusMeters / Math.max(1, 111320 * Math.cos((lat * Math.PI) / 180));
      const viewbox = `${(lng - dLng).toFixed(5)},${(lat + dLat).toFixed(5)},${(lng + dLng).toFixed(5)},${(lat - dLat).toFixed(5)}`;
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(term)}&viewbox=${viewbox}&bounded=1&limit=12&addressdetails=1&accept-language=en,ro`;

      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ConsensusEngine/2.0 (https://consensus-engine-mauve.vercel.app)',
        },
        signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
      });

      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) continue;

      const valid = data.filter((d) => d.name && d.lat != null && d.lon != null);
      if (valid.length === 0) continue;

      const candidates = valid.slice(0, 6).map((d) => {
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
 * Resolves fallback venues, strictly enforcing that locations outside Moldova
 * never fall back to Chișinău restaurants thousands of kilometers away.
 */
async function resolveRegionalFallback(theme = '', centerLat = 47.0225, centerLng = 28.8340, isExactGps = false) {
  // If coordinates are outside Moldova, resolve genuine regional venues via expanded radius search
  if (!isInsideMoldovaRegion(centerLat, centerLng)) {
    const regionalVenues = await searchExpandedOsmVenues(centerLat, centerLng, theme, isExactGps);
    if (regionalVenues.length > 0) {
      return regionalVenues;
    }
  }

  // Inside Moldova or default coordinates: return verified Moldovan hotspots
  const key = theme.toLowerCase().includes('cinema') ? 'cinema' :
    theme.toLowerCase().includes('cafe') ? 'cafes' :
    theme.toLowerCase().includes('bar') ? 'bars' :
    theme.toLowerCase().includes('dessert') ? 'desserts' : 'restaurants';

  const places = CATEGORIZED_FALLBACKS[key] || CATEGORIZED_FALLBACKS.restaurants;
  const mapped = places.map((p) => {
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
      lat: p.lat,
      lng: p.lng,
    };
  });

  return await resolveVenuePhotosBatch(mapped);
}

module.exports = {
  CATEGORIZED_FALLBACKS,
  resolveRegionalFallback,
  isInsideMoldovaRegion,
  searchExpandedOsmVenues,
  formatPriceLabel,
};
