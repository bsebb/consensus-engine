// Multi-domain live autocomplete service for custom consensus polls.
// Queries Steam store search for games and Wikipedia for media/movies/activities.
// Results are cached in memory for fast repeat lookups.

const HEADERS = { 'User-Agent': 'ConsensusEngine/1.0 (https://consensus-engine-mauve.vercel.app)' };
const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[™®©]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

async function getJson(url, timeoutMs = 3500) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(timeoutMs) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * Searches Steam store for games matching query.
 * Filters out DLCs, soundtracks, and packs unless specifically requested.
 */
async function searchSteamGames(query) {
  const qNorm = normalize(query);
  const data = await getJson(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`
  );
  const items = Array.isArray(data?.items) ? data.items : [];
  if (items.length === 0) return [];

  const allowExtras = /soundtrack|supporter|dlc|pack/i.test(query);

  const matched = items
    .filter((item) => {
      const n = item.name.toLowerCase();
      if (!allowExtras && /soundtrack|supporter pack|artbook|dlc bundle|pre-purchase/i.test(n)) {
        return false;
      }
      return true;
    })
    .slice(0, 6)
    .map((item) => {
      return {
        name: item.name,
        category: 'gaming',
        subtitle: 'Video Game • Steam',
        poster_url: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${item.id}/header.jpg`,
        icon: 'Gamepad2',
      };
    });

  return matched;
}

/**
 * Searches Wikipedia opensearch for movies, shows, and general topics.
 */
async function searchWikipediaMedia(query) {
  const data = await getJson(
    `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json`,
    3000
  );
  const titles = Array.isArray(data?.[1]) ? data[1] : [];
  if (titles.length === 0) return [];

  return titles
    .filter((t) => !/disambiguation|list of/i.test(t))
    .slice(0, 4)
    .map((t) => {
      const cleanName = t.replace(/\s*\([^)]*\)\s*$/, '').trim();
      return {
        name: cleanName,
        category: 'movies',
        subtitle: 'Film & Media',
        poster_url: null,
        icon: 'Film',
      };
    });
}

/**
 * Main autocomplete search function combining multi-domain data sources.
 */
async function searchCustomAutocomplete({ query = '', topic = '' }) {
  const clean = String(query || '').trim();
  if (clean.length < 2) return [];

  const cacheKey = `${normalize(clean)}|${normalize(topic)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.results;
  }

  const isMovieTopic = /movi|film|cinema|watch|netflix|hulu|disney/i.test(topic);
  const isGameTopic = /gam|play|steam|lan|esport|rpg|fps|mmo|multiplayer/i.test(topic);

  let results = [];

  if (isMovieTopic) {
    results = await searchWikipediaMedia(clean);
  } else {
    // Search Steam games first
    const steamHits = await searchSteamGames(clean);
    if (steamHits.length > 0) {
      results = steamHits;
    } else if (!isGameTopic) {
      // Fall back to Wikipedia if not strictly a gaming topic
      results = await searchWikipediaMedia(clean);
    }
  }

  // Deduplicate results by normalized name
  const seen = new Set();
  const deduped = [];
  for (const item of results) {
    const key = normalize(item.name);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  cache.set(cacheKey, { timestamp: Date.now(), results: deduped });
  return deduped;
}

module.exports = { searchCustomAutocomplete, normalize };
