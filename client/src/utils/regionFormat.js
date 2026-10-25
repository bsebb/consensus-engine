/**
 * Location-Aware Regional Currency & Distance Unit Engine.
 * Automatically adapts price indicators ($, EUR, GBP, RON, MDL) and distance units (mi vs km)
 * based on the selected/detected location coordinates, city label, or browser locale.
 */

const REGION_PROFILES = {
  US: {
    code: 'US',
    currency: 'USD',
    symbol: '$',
    unit: 'mi',
    isImperial: true,
    tiers: {
      1: { short: '< $15', range: '$8-$15', avg: '~$12', maxDisplay: '$15', symbolRepeat: '$' },
      2: { short: '$15-$30', range: '$15-$30', avg: '~$22', maxDisplay: '$30', symbolRepeat: '$$' },
      3: { short: '$30-$60', range: '$30-$60', avg: '~$45', maxDisplay: '$60', symbolRepeat: '$$$' },
      4: { short: '$60+', range: '$60+', avg: '~$80', maxDisplay: '$80+', symbolRepeat: '$$$$' },
    },
  },
  GB: {
    code: 'GB',
    currency: 'GBP',
    symbol: '£',
    unit: 'mi',
    isImperial: true,
    tiers: {
      1: { short: '< £15', range: '£8-£15', avg: '~£12', maxDisplay: '£15', symbolRepeat: '£' },
      2: { short: '£15-£30', range: '£15-£30', avg: '~£22', maxDisplay: '£30', symbolRepeat: '££' },
      3: { short: '£30-£55', range: '£30-£55', avg: '~£42', maxDisplay: '£55', symbolRepeat: '£££' },
      4: { short: '£55+', range: '£55+', avg: '~£75', maxDisplay: '£75+', symbolRepeat: '££££' },
    },
  },
  EU: {
    code: 'EU',
    currency: 'EUR',
    symbol: '€',
    unit: 'km',
    isImperial: false,
    tiers: {
      1: { short: '< €15', range: '€8-€15', avg: '~€12', maxDisplay: '€15', symbolRepeat: '€' },
      2: { short: '€15-€30', range: '€15-€30', avg: '~€22', maxDisplay: '€30', symbolRepeat: '€€' },
      3: { short: '€30-€60', range: '€30-€60', avg: '~€45', maxDisplay: '€60', symbolRepeat: '€€€' },
      4: { short: '€60+', range: '€60+', avg: '~€75', maxDisplay: '€75+', symbolRepeat: '€€€€' },
    },
  },
  RO: {
    code: 'RO',
    currency: 'RON',
    symbol: 'RON',
    unit: 'km',
    isImperial: false,
    tiers: {
      1: { short: '< 45 RON', range: '25-45 RON', avg: '~35 RON', maxDisplay: '45 RON', symbolRepeat: '$' },
      2: { short: '45-100 RON', range: '45-100 RON', avg: '~70 RON', maxDisplay: '100 RON', symbolRepeat: '$$' },
      3: { short: '100-180 RON', range: '100-180 RON', avg: '~135 RON', maxDisplay: '180 RON', symbolRepeat: '$$$' },
      4: { short: '180+ RON', range: '180+ RON', avg: '~220 RON', maxDisplay: '220+ RON', symbolRepeat: '$$$$' },
    },
  },
  MD: {
    code: 'MD',
    currency: 'MDL',
    symbol: 'MDL',
    unit: 'km',
    isImperial: false,
    tiers: {
      1: { short: '< 150 MDL', range: '80-150 MDL', avg: '~110 MDL', maxDisplay: '150 MDL', symbolRepeat: '$' },
      2: { short: '150-300 MDL', range: '150-300 MDL', avg: '~180 MDL', maxDisplay: '300 MDL', symbolRepeat: '$$' },
      3: { short: '300-500 MDL', range: '300-500 MDL', avg: '~350 MDL', maxDisplay: '500 MDL', symbolRepeat: '$$$' },
      4: { short: '500+ MDL', range: '500+ MDL', avg: '~600 MDL', maxDisplay: '500+ MDL', symbolRepeat: '$$$$' },
    },
  },
};

function getSavedLocationSnapshot() {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem('consensus_exact_gps');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function resolveRegionProfile(context = {}) {
  const saved = getSavedLocationSnapshot();
  const lat = context?.lat ?? context?.latitude ?? saved?.lat ?? null;
  const lng = context?.lng ?? context?.longitude ?? saved?.lng ?? null;
  const textHint = `${context?.label || ''} ${context?.address || ''} ${saved?.label || ''}`.toLowerCase();

  // 1. Coordinate-based geometric resolution (most accurate when location is selected or GPS is active)
  if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    const nLat = Number(lat);
    const nLng = Number(lng);

    // Americas (USA, Canada, etc.)
    if (nLng < -30) {
      return REGION_PROFILES.US;
    }
    // United Kingdom
    if (nLat >= 49.9 && nLat <= 60.9 && nLng >= -8.6 && nLng <= 1.8) {
      return REGION_PROFILES.GB;
    }
    // Moldova bounding box
    if (nLat >= 45.4 && nLat <= 48.6 && nLng >= 26.6 && nLng <= 30.3) {
      return REGION_PROFILES.MD;
    }
    // Romania bounding box
    if (nLat >= 43.6 && nLat <= 48.3 && nLng >= 20.2 && nLng < 26.6) {
      return REGION_PROFILES.RO;
    }
    // Continental Europe & Rest of World default to EUR + km
    return REGION_PROFILES.EU;
  }

  // 2. Text / Address hint resolution
  if (/\b(usa|united states|new york|jersey|newark|california|texas|chicago|miami|boston|seattle)\b/i.test(textHint)) {
    return REGION_PROFILES.US;
  }
  if (/\b(uk|united kingdom|london|manchester|edinburgh|birmingham)\b/i.test(textHint)) {
    return REGION_PROFILES.GB;
  }
  if (/\b(romania|românia|bucharest|bucurești|cluj|iași|timișoara|brașov)\b/i.test(textHint)) {
    return REGION_PROFILES.RO;
  }
  if (/\b(moldova|chișinău|chisinau|bălți|balti|strășeni|straseni|orhei|cahul)\b/i.test(textHint)) {
    return REGION_PROFILES.MD;
  }
  if (/\b(france|paris|lyon|germany|deutschland|berlin|munich|spain|españa|madrid|barcelona|italy|rome|milan|netherlands|amsterdam|austria|vienna|belgium|brussels)\b/i.test(textHint)) {
    return REGION_PROFILES.EU;
  }

  // 3. Timezone / Locale fallback when no coordinates or city label exist yet
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.startsWith('America/')) return REGION_PROFILES.US;
    if (tz === 'Europe/London') return REGION_PROFILES.GB;
    if (tz === 'Europe/Bucharest') return REGION_PROFILES.RO;
    if (tz === 'Europe/Chisinau' || tz === 'Europe/Tiraspol') return REGION_PROFILES.MD;
    if (tz.startsWith('Europe/')) return REGION_PROFILES.EU;
  } catch {
    // Ignore Intl errors
  }

  return REGION_PROFILES.EU;
}

/**
 * Formats a price level (1..4) into a concise badge like "$$ • ~$22" or "€€ • ~€22" or "$$ • ~180 MDL"
 */
export function formatRegionalPriceBadge(priceLevel = 2, context = {}) {
  const profile = resolveRegionProfile(context);
  const lvl = [1, 2, 3, 4].includes(Number(priceLevel)) ? Number(priceLevel) : 2;
  const tier = profile.tiers[lvl] || profile.tiers[2];
  return `${tier.symbolRepeat} • ${tier.avg}`;
}

/**
 * Formats a short price range description for a tier (e.g. "< $15", "$15-$30", "< €15", "< 150 MDL")
 */
export function formatRegionalTierShort(priceLevel = 2, context = {}) {
  const profile = resolveRegionProfile(context);
  const lvl = [1, 2, 3, 4].includes(Number(priceLevel)) ? Number(priceLevel) : 2;
  const tier = profile.tiers[lvl] || profile.tiers[2];
  return tier.short;
}

/**
 * Formats the maximum budget cap badge for StepZeroVault (e.g. "$15", "€30", "300 MDL")
 */
export function formatRegionalMaxBudget(budgetLimit, context = {}) {
  const profile = resolveRegionProfile(context);
  const lvl = budgetLimit <= 180 ? 1 : budgetLimit <= 350 ? 2 : budgetLimit <= 500 ? 3 : 4;
  return profile.tiers[lvl]?.maxDisplay || profile.tiers[2].maxDisplay;
}

/**
 * Converts a distance in kilometers into the regional unit (miles for US/UK, km elsewhere)
 */
export function formatRegionalDistance(distanceKm, context = {}) {
  if (distanceKm == null || isNaN(Number(distanceKm))) return null;
  const profile = resolveRegionProfile(context);
  const km = Number(distanceKm);
  if (profile.isImperial) {
    const miles = Math.max(0.1, Number((km * 0.621371).toFixed(1)));
    return `${miles} mi`;
  }
  return `${Math.max(0.1, Number(km.toFixed(1)))} km`;
}

/**
 * Formats a search radius (stored internally in km) into the regional unit
 */
export function formatRegionalRadius(radiusKm, context = {}) {
  const profile = resolveRegionProfile(context);
  const km = Number(radiusKm) || 5;
  if (profile.isImperial) {
    const miles = Math.max(0.5, Number((km * 0.621371).toFixed(1)));
    return `${miles} mi`;
  }
  return `${km.toFixed(1).replace(/\.0$/, '')} km`;
}
