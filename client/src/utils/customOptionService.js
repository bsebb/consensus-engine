import { useState, useEffect } from 'react';
import { apiUrl } from './api';

// Curated high-resolution poster library for popular activities, games, movies, and takeout
export const KNOWN_CUSTOM_POSTERS = {
  // Video Games
  'counter-strike': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/header.jpg',
  'counter-strike 2': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/header.jpg',
  'cs2': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/header.jpg',
  'cs:go': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/header.jpg',
  'shooter night': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/header.jpg',
  'fifa': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2195250/header.jpg',
  'fifa / ea fc': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2195250/header.jpg',
  'ea fc': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2195250/header.jpg',
  'ea sports fc': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2195250/header.jpg',
  'jackbox': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1005300/header.jpg',
  'party games': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1005300/header.jpg',
  'grand theft auto': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/271590/header.jpg',
  'gta': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/271590/header.jpg',
  'gta v': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/271590/header.jpg',
  'lethal company': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1966720/header.jpg',
  'co-op survival': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1966720/header.jpg',
  'helldivers': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/553850/header.jpg',
  'helldivers 2': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/553850/header.jpg',
  'baldurs gate': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1086940/header.jpg',
  'baldurs gate 3': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1086940/header.jpg',
  'cyberpunk': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg',
  'elden ring': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg',
  'stardew valley': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/413150/header.jpg',
  'palworld': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1623730/header.jpg',
  'subnautica': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1962700/header.jpg',
  'among us': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/945360/header.jpg',
  'rust': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/252490/header.jpg',
  'dota 2': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/570/header.jpg',
  'dota': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/570/header.jpg',
  'apex legends': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1172470/header.jpg',
  'fighting games': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1778820/header.jpg',
  'tekken': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1778820/header.jpg',
  'path of exile 2': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2694490/header.jpg',
  'path of exile': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/238960/header.jpg',
  'poe 2': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2694490/header.jpg',
  'poe': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/238960/header.jpg',
  'witcher 3': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/292030/header.jpg',
  'the witcher 3': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/292030/header.jpg',
  'hades 2': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1145350/header.jpg',
  'hades ii': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1145350/header.jpg',
  'black myth: wukong': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2358720/header.jpg',
  'wukong': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2358720/header.jpg',
  'diablo 4': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2344520/header.jpg',
  'diablo iv': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2344520/header.jpg',

  // Board Games & Tabletop
  'poker': 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=800&auto=format&fit=crop&q=80',
  'card night': 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?w=800&auto=format&fit=crop&q=80',
  'board games': 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&auto=format&fit=crop&q=80',
  'catan': 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&auto=format&fit=crop&q=80',
  'monopoly': 'https://images.unsplash.com/photo-1563941402622-4e7a488bcc57?w=800&auto=format&fit=crop&q=80',
  'chess': 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&auto=format&fit=crop&q=80',

  // Group Activities
  'bowling': 'https://images.unsplash.com/photo-1545232979-fbf67540a9a3?w=800&auto=format&fit=crop&q=80',
  'billiards': 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&auto=format&fit=crop&q=80',
  'pool': 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&auto=format&fit=crop&q=80',
  'karaoke': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80',
  'escape room': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
  'park walk': 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800&auto=format&fit=crop&q=80',
  'arcade': 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
  'darts': 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
  'night drive': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80',

  // Sports & Fitness
  'football': 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=80',
  'soccer': 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=80',
  'basketball': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
  'tennis': 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&auto=format&fit=crop&q=80',
  'padel': 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&auto=format&fit=crop&q=80',
  'bouldering': 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&auto=format&fit=crop&q=80',
  'climbing': 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&auto=format&fit=crop&q=80',
  'volleyball': 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&auto=format&fit=crop&q=80',
  'karting': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80',
  'go-kart': 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80',
  'table tennis': 'https://images.unsplash.com/photo-1534158914592-062992fbe900?w=800&auto=format&fit=crop&q=80',
  'ping pong': 'https://images.unsplash.com/photo-1534158914592-062992fbe900?w=800&auto=format&fit=crop&q=80',
  'gym': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
  'swimming': 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&auto=format&fit=crop&q=80',

  // Movies & TV
  'sci-fi': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
  'thriller': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
  'comedy': 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=800&auto=format&fit=crop&q=80',
  'horror': 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=800&auto=format&fit=crop&q=80',
  'action': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
  'anime': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
  'documentary': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80',
  'classic movie': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80',
  'series binge': 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&auto=format&fit=crop&q=80',

  // Food & Takeout
  'pizza': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80',
  'sushi': 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop&q=80',
  'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
  'cook dinner': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop&q=80',
  'shawarma': 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&auto=format&fit=crop&q=80',
  'kebab': 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&auto=format&fit=crop&q=80',
  'tacos': 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&auto=format&fit=crop&q=80',
  'plăcinte': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
  'placinte': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
  'desserts': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80',
};

// In-memory cache for dynamic poster searches
const posterMemoryCache = new Map();

function loadPersistentPosterCache() {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('consensus_custom_posters_v2') || '{}');
  } catch {
    return {};
  }
}

function savePersistentPoster(name, url) {
  if (typeof localStorage === 'undefined') return;
  try {
    const existing = loadPersistentPosterCache();
    existing[name.toLowerCase().trim()] = url;
    localStorage.setItem('consensus_custom_posters_v2', JSON.stringify(existing));
  } catch {}
}

export function cacheOptionPoster(name, url) {
  if (!name || !url) return;
  const clean = String(name).toLowerCase().trim();
  posterMemoryCache.set(clean, url);
  savePersistentPoster(name, url);
}

/**
 * Automatically detects the most relevant Idea Library tab based on the room's custom topic.
 * E.g. "What game are we playing?", "what are we playin tonight" -> 'gaming'
 */
export function inferLibraryTabFromTopic(topic = '') {
  const norm = String(topic || '').toLowerCase();

  // Gaming: covers "play", "playing", "playin", "playin'", "games", "gaming", "gamer", video games, steam, consoles, etc.
  if (/\b(gam(e|es|ing|ers?)|play(ing|in|s|ed)?|steam|ps[45]|playstation|xbox|nintendo|switch|lan|esports?|co-?op|multiplayer|boardgames?|videogames?|rpg|arpg|fps|mmo|poe|exile|witcher|hades|diablo|wukong|kart|smash|zelda|pokemon)\b/i.test(norm)) {
    return 'gaming';
  }

  // Sports & Fitness: covers "sport", "sports", "football", "soccer", "basketball", "padel", "tennis", "volleyball", "climb", "gym", "workout", "lifting", "running", "jog", "cycling", "bike", "swimming", "badminton", "golf", "kart", "paintball", "yoga"
  if (/\b(sport|sports|football|soccer|basketball|padel|tennis|volleyball|climb(ing)?|boulder(ing)?|gym|workout|lift(ing)?|run(ning)?|jog(ging)?|cycl(ing)?|bikes?|swim(ming)?|badminton|golf|kart(ing)?|paintball|boxing|yoga|fitness|match)\b/i.test(norm)) {
    return 'sports';
  }

  // Movies & TV: covers "movie", "movies", "film", "films", "cinema", "watch", "watching", "netflix", "series", "shows", "anime"
  if (/\b(movi(e|es)?|films?|cinema|watch(ing)?|stream(ing)?|netflix|hulu|disney|hbo|series|shows?|anime|binge)\b/i.test(norm)) {
    return 'movies';
  }

  // Food & Dining: covers "food", "eat", "eating", "dinner", "lunch", "breakfast", "brunch", "cook", "cooking", "order", "ordering", "takeout", "pizza", "sushi", "burgers", "kebab", "shawarma", "tacos"
  if (/\b(food|eat(ing)?|eats?|dinner|lunch|breakfast|brunch|cook(ing)?|order(ing)?|takeout|delivery|pizza|sushi|burgers?|kebab|shawarma|tacos?|restaurants?|bistros?|cafes?|coffee|drinks?)\b/i.test(norm)) {
    return 'food_ideas';
  }

  return 'activities';
}

/**
 * Provides 4 seed options tailored to the detected topic so the poll is immediately populated with rich poster cards.
 */
export function getDefaultSeedOptions(topic = '') {
  const tab = inferLibraryTabFromTopic(topic);
  if (tab === 'gaming') {
    return ['Counter-Strike 2', 'Minecraft', 'FIFA / EA FC', 'Jackbox Party Pack'];
  }
  if (tab === 'movies') {
    return ['Sci-Fi / Thriller Movie', 'Comedy Movie Night', 'Action Blockbuster', 'Horror Movie Night'];
  }
  if (tab === 'food_ideas') {
    return ['Order Wood-Fired Pizza', 'Sushi & Rolls Platter', 'Smash Burgers & Fries', 'Shawarma / Kebab Run'];
  }
  return ['Bowling Night', 'Escape Room', 'Board Games Night', 'Billiards & Pool'];
}

/**
 * Synchronously checks curated dictionary and local cache for an instant poster match.
 */
export function resolveCuratedOptionPhoto(name = '') {
  const clean = String(name || '').toLowerCase().trim();
  if (!clean) return null;

  // Direct exact match
  if (KNOWN_CUSTOM_POSTERS[clean]) return KNOWN_CUSTOM_POSTERS[clean];

  // Whole-word phrase match, longest key first ("helldivers 2" beats "helldivers")
  const keys = Object.keys(KNOWN_CUSTOM_POSTERS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(clean)) {
      return KNOWN_CUSTOM_POSTERS[key];
    }
  }

  // Memory cache
  if (posterMemoryCache.has(clean)) {
    return posterMemoryCache.get(clean);
  }

  // Persistent localStorage cache
  const localCache = loadPersistentPosterCache();
  if (localCache[clean]) {
    posterMemoryCache.set(clean, localCache[clean]);
    return localCache[clean];
  }

  return null;
}

/**
 * Logos are transparent marks, not banners; cards render them contained instead of cropped.
 */
export function isLogoImage(url = '') {
  return /logo|\.svg/i.test(String(url || ''));
}

/**
 * Resolves a game poster dynamically via the Steam Store Search proxy.
 */
export async function fetchDynamicGamePoster(name = '') {
  const clean = String(name || '').trim();
  if (!clean || clean.length < 2) return null;

  const curated = resolveCuratedOptionPhoto(clean);
  if (curated) return curated;

  try {
    const res = await fetch(apiUrl(`/api/v1/options/game-poster?query=${encodeURIComponent(clean)}`), {
      signal: AbortSignal.timeout ? AbortSignal.timeout(9000) : undefined,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.poster_url) {
      posterMemoryCache.set(clean.toLowerCase(), data.poster_url);
      savePersistentPoster(clean, data.poster_url);
      return data.poster_url;
    }
  } catch {}

  return null;
}

/**
 * React hook to resolve and cache option images in the background.
 */
export function useCustomOptionPhoto(name = '', topic = '', initialUrl = null) {
  const [photo, setPhoto] = useState(() => initialUrl || resolveCuratedOptionPhoto(name));
  const [hasResolved, setHasResolved] = useState(Boolean(initialUrl || resolveCuratedOptionPhoto(name)));

  useEffect(() => {
    if (initialUrl) {
      setPhoto(initialUrl);
      setHasResolved(true);
      return;
    }

    const curated = resolveCuratedOptionPhoto(name);
    if (curated) {
      setPhoto(curated);
      setHasResolved(true);
      return;
    }

    let isMounted = true;
    fetchDynamicGamePoster(name).then((url) => {
      if (isMounted) {
        if (url) setPhoto(url);
        setHasResolved(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [name, topic, initialUrl]);

  return { photo, hasResolved };
}
