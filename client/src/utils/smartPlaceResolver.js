/**
 * Smart Fuzzy Place, Chain & Craving Resolver with Nearest-Branch Routing.
 *
 * Detects chains, local restaurants, cafes, entertainment spots, and food cravings
 * even with typos (e.g. "macdonals", "mcdonlds", "mc donalds", "kfcc", "andys piza",
 * "placinte", "starbuks", "burgr king", "tucano", "oliva", "osho", "shaurma")
 * and routes the group to the nearest real location relative to their GPS.
 */

import { calculateDistanceKm, getSavedExactGps } from './location.js';

import { SMART_PLACE_DIRECTORY } from './smartPlaceDirectory.js';
export { SMART_PLACE_DIRECTORY };
const DEFAULT_CENTER = { lat: 47.0245, lng: 28.8322, label: 'Chișinău' };

/**
 * Strips diacritics, punctuation, and normalizes repeated characters for phonetic/fuzzy matching.
 */
export function normalizePlaceToken(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`".\-_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compresses phonetic variations (e.g. "mac" -> "mc", "ph" -> "f", "sh"/"ch" -> "s", repeated letters)
 */
function phoneticSkeleton(str) {
  return normalizePlaceToken(str)
    .replace(/\bmac/g, 'mc')
    .replace(/mcdon/g, 'mcdon')
    .replace(/ph/g, 'f')
    .replace(/ck/g, 'k')
    .replace(/sh|ch|sch/g, 's')
    .replace(/oo/g, 'u')
    .replace(/(.)\1+/g, '$1')
    .replace(/\s+/g, '');
}

/**
 * Standard Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a, b) {
  const s = String(a || '');
  const t = String(b || '');
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;

  const v0 = new Array(t.length + 1);
  const v1 = new Array(t.length + 1);
  for (let i = 0; i <= t.length; i++) v0[i] = i;

  for (let i = 0; i < s.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < t.length; j++) {
      const cost = s[i] === t[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= t.length; j++) v0[j] = v1[j];
  }
  return v1[t.length];
}

/**
 * Maps a SMART_PLACE_DIRECTORY entry to one or more discovery categories:
 * 'restaurants', 'cafes', 'bars', 'desserts', 'activities'
 */
function getEntryDiscoveryDomains(entry) {
  const cat = String(entry.category || '').toLowerCase();
  const name = String(entry.canonicalName || '').toLowerCase();
  const domains = new Set();

  if (/fun & distractions|cinema|bowling|billiard|karting|laser|arcade|escape|trampoline/i.test(cat)) {
    domains.add('activities');
  }
  if (/coffee|patisserie|roastery|brunch|cafe|café/i.test(cat) || /tucano|starbucks|rozmarin|bonjour|creme|delice/i.test(name)) {
    domains.add('cafes');
  }
  if (/gelateria|confectionery|dessert|patisserie/i.test(cat) || /gioelia|dulcinella|creme|delice/i.test(name)) {
    domains.add('desserts');
  }
  if (/pub|taproom|craft beer|cocktail|nightlife|bar/i.test(cat) || /draft|smokehouse|taproom|marlene|eli pili|pegas/i.test(name)) {
    domains.add('bars');
  }
  if (
    domains.size === 0 ||
    /burger|pizza|dining|trattoria|sushi|kebab|grill|steakhouse|pies|subs|tacos|bbq/i.test(cat)
  ) {
    if (!domains.has('activities')) {
      domains.add('restaurants');
    }
  }
  return domains;
}

/**
 * Infers the active discovery domain from category ID or room topic.
 */
export function inferDiscoveryDomain(categoryOrTopic = '') {
  const s = String(categoryOrTopic || '').toLowerCase();
  if (/fun|distraction|activit|bowling|game|play|bored|weekend/i.test(s)) return 'activities';
  if (/cafe|coffee|café|espresso|latte|кафе|кофе/i.test(s)) return 'cafes';
  if (/bar|pub|drink|beer|cocktail|wine|nightlife|pahar|băutură|бар|выпить/i.test(s)) return 'bars';
  if (/dessert|sweet|gelato|ice cream|cake|pastry|dulce|dulciuri|десерт|сладк/i.test(s)) return 'desserts';
  if (/restaurant|eat|dinner|lunch|food|hungry|mâncăm|ресторан|поедим/i.test(s)) return 'restaurants';
  return null;
}

/**
 * Checks if a custom poll topic is asking about a physical place to eat, drink, or go out.
 */
export function isPlaceOrDiningTopic(topic = '') {
  const t = String(topic || '').toLowerCase();
  return /\b(where|eat|eating|dinner|lunch|breakfast|brunch|food|restaurant|spot|place|go|going|hangout|drink|drinks|bar|cafe|coffee|tonight|out)\b/i.test(t);
}

/**
 * Checks if an option is a non-routable media/home item (like a video game or streaming movie).
 */
function isPureMediaOrGameOption(rawInput = '', topic = '') {
  const clean = normalizePlaceToken(rawInput);
  const t = String(topic || '').toLowerCase();
  if (/\b(game|gaming|play|steam|ps5|xbox)\b/i.test(t) && !isPlaceOrDiningTopic(t)) {
    return true;
  }
  const mediaGames = [
    'fortnite', 'valorant', 'counter strike', 'cs2', 'minecraft', 'dota 2',
    'league of legends', 'gta', 'grand theft auto', 'elden ring', 'helldivers',
    'deadlock', 'marvel rivals', 'balatro', 'warzone', 'apex legends', 'rust',
    'cyberpunk', 'baldurs gate', 'interstellar', 'inception', 'oppenheimer',
    'the dark knight', 'dune',
  ];
  return mediaGames.some((g) => clean === g || clean.startsWith(g + ' '));
}

/**
 * Fuzzy-matches user input against SMART_PLACE_DIRECTORY using:
 * 1. Exact or substring alias match
 * 2. Phonetic skeleton match (catches "macdonals", "mcdonlds", "starbuks", "andys piza", "shaurma")
 * 3. Word-level & full-string Levenshtein edit distance (<= 2 edits)
 */
export function matchSmartPlaceEntry(rawInput) {
  const norm = normalizePlaceToken(rawInput);
  if (!norm || norm.length < 2) return null;

  const skel = phoneticSkeleton(rawInput);
  const inputWords = norm.split(' ').filter(Boolean);

  let bestEntry = null;
  let bestScore = 0;

  for (const entry of SMART_PLACE_DIRECTORY) {
    const canonNorm = normalizePlaceToken(entry.canonicalName);
    const canonSkel = phoneticSkeleton(entry.canonicalName);

    // 1. Exact match on canonical or alias
    if (norm === canonNorm || skel === canonSkel) {
      return { entry, score: 100 };
    }

    for (const alias of entry.aliases) {
      const aliasNorm = normalizePlaceToken(alias);
      const aliasSkel = phoneticSkeleton(alias);

      if (norm === aliasNorm || (skel.length >= 3 && skel === aliasSkel)) {
        return { entry, score: 98 };
      }

      // Multi-word or prefix containment (e.g. "mcdonalds botanica" or "nearest mcdonalds")
      if (aliasNorm.length >= 4 && (norm.includes(aliasNorm) || aliasNorm.includes(norm))) {
        const sc = norm.startsWith(aliasNorm) || aliasNorm.startsWith(norm) ? 88 : 80;
        if (sc > bestScore) {
          bestScore = sc;
          bestEntry = entry;
        }
      }

      // Edit distance on full normalized string
      if (norm.length >= 4 && aliasNorm.length >= 4) {
        const dist = levenshteinDistance(norm, aliasNorm);
        const skelDist = levenshteinDistance(skel, aliasSkel);
        const maxAllowed = Math.min(2, Math.floor(Math.min(norm.length, aliasNorm.length) / 3));
        if (dist <= maxAllowed || skelDist <= 1) {
          const sc = 85 - Math.min(dist, skelDist) * 8;
          if (sc > bestScore) {
            bestScore = sc;
            bestEntry = entry;
          }
        }
      }

      // Word-level typo check (e.g. "where macdonals" or "andys piza")
      for (const word of inputWords) {
        if (word.length < 4) continue;
        const aliasFirstWord = aliasNorm.split(' ')[0];
        if (aliasFirstWord.length >= 4) {
          const wDist = levenshteinDistance(word, aliasFirstWord);
          const wSkelDist = levenshteinDistance(phoneticSkeleton(word), phoneticSkeleton(aliasFirstWord));
          const maxW = word.length >= 6 ? 2 : 1;
          if (wDist <= maxW || wSkelDist <= 1) {
            const sc = 78 - Math.min(wDist, wSkelDist) * 8;
            if (sc > bestScore) {
              bestScore = sc;
              bestEntry = entry;
            }
          }
        }
      }
    }
  }

  return bestScore >= 65 ? { entry: bestEntry, score: bestScore } : null;
}

/**
 * Resolves a custom poll option (e.g., "mcdonalds", "macdonals", "andys piza", "Tucano")
 * into a rich venue card with nearest-branch coordinates, road distance, and direct routing URLs.
 */
export function resolveSmartCustomVenue(rawName, topic = '', userGps = null) {
  const cleanRaw = String(rawName || '').trim();
  if (!cleanRaw) return null;

  if (isPureMediaOrGameOption(cleanRaw, topic)) {
    return null;
  }

  const savedGps = userGps || getSavedExactGps() || DEFAULT_CENTER;
  const refLat = Number(savedGps?.lat) || DEFAULT_CENTER.lat;
  const refLng = Number(savedGps?.lng) || DEFAULT_CENTER.lng;
  const cityLabel = savedGps?.label ? String(savedGps.label).split(',')[0].trim() : 'Chișinău';

  const matched = matchSmartPlaceEntry(cleanRaw);

  if (matched && matched.entry) {
    const { entry } = matched;
    // Find nearest branch relative to user's coordinates
    let nearestBranch = null;
    let minAirKm = Infinity;

    for (const branch of entry.branches || []) {
      const d = calculateDistanceKm(refLat, refLng, branch.lat, branch.lng);
      if (d != null && d < minAirKm) {
        minAirKm = d;
        nearestBranch = branch;
      }
    }

    // If user is within 30 km of a known branch, attach exact branch coordinates & road distance
    const isNearKnownBranch = nearestBranch && minAirKm <= 30;
    const roadDistKm = isNearKnownBranch
      ? Math.max(0.2, Number((minAirKm * 1.25).toFixed(1)))
      : null;
    const walkMin = roadDistKm != null ? Math.max(2, Math.round(roadDistKm * 12)) : null;
    const driveMin = roadDistKm != null ? Math.max(2, Math.round(roadDistKm * 2.3)) : null;

    const destQuery = isNearKnownBranch
      ? `${nearestBranch.name} ${nearestBranch.address}`
      : `${entry.canonicalName} near ${cityLabel}`;

    const googleMapsUrl = isNearKnownBranch
      ? `https://www.google.com/maps/dir/?api=1&origin=${refLat},${refLng}&destination=${encodeURIComponent(destQuery)}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&origin=${refLat},${refLng}&destination=${encodeURIComponent(entry.canonicalName)}&travelmode=driving`;

    const appleMapsUrl = isNearKnownBranch
      ? `https://maps.apple.com/?saddr=${refLat},${refLng}&daddr=${encodeURIComponent(destQuery)}`
      : `https://maps.apple.com/?saddr=${refLat},${refLng}&daddr=${encodeURIComponent(entry.canonicalName)}`;

    return {
      canonicalName: entry.canonicalName,
      matchedBranchName: isNearKnownBranch ? nearestBranch.name : entry.canonicalName,
      category: entry.category,
      price_level: entry.priceLevel || 2,
      vibe: entry.vibe,
      address: isNearKnownBranch
        ? nearestBranch.address
        : cityLabel,
      lat: isNearKnownBranch ? nearestBranch.lat : null,
      lng: isNearKnownBranch ? nearestBranch.lng : null,
      distance_km: roadDistKm,
      walk_minutes: walkMin,
      drive_minutes: driveMin,
      isRoutablePlace: true,
      wasTypoCorrected: cleanRaw.toLowerCase() !== entry.canonicalName.toLowerCase(),
      googleMapsUrl,
      appleMapsUrl,
    };
  }

  // If the poll question is explicitly about where to eat/drink/go out, make any custom place routable to nearest match!
  if (isPlaceOrDiningTopic(topic)) {
    const destQuery = `${cleanRaw} ${cityLabel}`;
    return {
      canonicalName: cleanRaw,
      matchedBranchName: cleanRaw,
      category: 'Group Pick',
      price_level: 2,
      vibe: 'Local Spot',
      address: cityLabel,
      lat: null,
      lng: null,
      distance_km: null,
      walk_minutes: null,
      drive_minutes: null,
      isRoutablePlace: true,
      wasTypoCorrected: false,
      googleMapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${refLat},${refLng}&destination=${encodeURIComponent(destQuery)}&travelmode=driving`,
      appleMapsUrl: `https://maps.apple.com/?saddr=${refLat},${refLng}&daddr=${encodeURIComponent(destQuery)}`,
    };
  }

  return null;
}

/**
 * Searches SMART_PLACE_DIRECTORY with typo tolerance and category awareness for autocomplete suggestions.
 */
export function searchSmartPlaceSuggestions(query = '', existingNames = [], categoryOrTopic = '') {
  const norm = normalizePlaceToken(query);
  const existingSet = new Set(existingNames.map((n) => normalizePlaceToken(n)));
  const activeDomain = inferDiscoveryDomain(categoryOrTopic);
  const results = [];

  // When query is empty, return curated popular chains/places for the active category
  if (!norm) {
    for (const entry of SMART_PLACE_DIRECTORY) {
      if (existingSet.has(normalizePlaceToken(entry.canonicalName))) continue;
      const domains = getEntryDiscoveryDomains(entry);
      const isDomainMatch = activeDomain ? domains.has(activeDomain) : true;
      if (!isDomainMatch) continue;

      const uiCategory = domains.has('activities') ? 'activities' : 'food';
      results.push({
        name: entry.canonicalName,
        category: uiCategory,
        subtitle: `${entry.vibe} • Routes to nearest location`,
        score: isDomainMatch ? 95 : 70,
      });
    }
    return results.slice(0, 7);
  }

  const matched = norm.length >= 2 ? matchSmartPlaceEntry(query) : null;

  for (const entry of SMART_PLACE_DIRECTORY) {
    const canonNorm = normalizePlaceToken(entry.canonicalName);
    if (existingSet.has(canonNorm)) continue;

    const domains = getEntryDiscoveryDomains(entry);
    const isDomainMatch = activeDomain ? domains.has(activeDomain) : false;
    const domainBoost = isDomainMatch ? 12 : 0;
    const uiCategory = domains.has('activities') ? 'activities' : 'food';

    if (matched && matched.entry.canonicalName === entry.canonicalName) {
      results.push({
        name: entry.canonicalName,
        category: uiCategory,
        subtitle: `${entry.vibe} • Routes to nearest location`,
        score: matched.score + 15 + domainBoost,
      });
      continue;
    }

    if (
      canonNorm.startsWith(norm) ||
      entry.aliases.some((a) => normalizePlaceToken(a).startsWith(norm))
    ) {
      results.push({
        name: entry.canonicalName,
        category: uiCategory,
        subtitle: `${entry.vibe} • Routes to nearest location`,
        score: 88 + domainBoost,
      });
      continue;
    }

    if (
      norm.length >= 2 &&
      (canonNorm.includes(norm) ||
        entry.aliases.some((a) => normalizePlaceToken(a).includes(norm)) ||
        normalizePlaceToken(entry.vibe).includes(norm) ||
        normalizePlaceToken(entry.category).includes(norm))
    ) {
      results.push({
        name: entry.canonicalName,
        category: uiCategory,
        subtitle: `${entry.vibe} • Routes to nearest location`,
        score: 75 + domainBoost,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 7);
}

export const resolveSmartPlaceQuery = resolveSmartCustomVenue;
export const searchCustomPlaceSuggestions = searchSmartPlaceSuggestions;
