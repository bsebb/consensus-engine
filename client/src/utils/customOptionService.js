import { useState, useEffect } from 'react';
import { apiUrl } from './api';

// Curated high-resolution poster library for popular activities, games, movies, and takeout
export const KNOWN_CUSTOM_POSTERS = {
  // Video Games
  'counter-strike': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/header.jpg',
  'cs2': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/header.jpg',
  'cs:go': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/header.jpg',
  'shooter night': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/header.jpg',
  'fifa': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2195250/header.jpg',
  'ea fc': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2195250/header.jpg',
  'ea sports fc': 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2195250/header.jpg',
  'minecraft': 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=800&auto=format&fit=crop&q=80',
  'sandbox': 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=800&auto=format&fit=crop&q=80',
  'mario kart': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
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
    return JSON.parse(localStorage.getItem('consensus_custom_posters') || '{}');
  } catch {
    return {};
  }
}

function savePersistentPoster(name, url) {
  if (typeof localStorage === 'undefined') return;
  try {
    const existing = loadPersistentPosterCache();
    existing[name.toLowerCase().trim()] = url;
    localStorage.setItem('consensus_custom_posters', JSON.stringify(existing));
  } catch {}
}

/**
 * Automatically detects the most relevant Idea Library tab based on the room's custom topic.
 * E.g. "What game are we playing?" -> 'gaming'
 */
export function inferLibraryTabFromTopic(topic = '') {
  const norm = String(topic || '').toLowerCase();
  if (/\b(game|gaming|games|play|steam|ps5|xbox|pc|lan|esport|coop|co-op)\b/i.test(norm)) {
    return 'gaming';
  }
  if (/\b(movie|film|cinema|watch|netflix|show|series|hbo|tv)\b/i.test(norm)) {
    return 'movies';
  }
  if (/\b(food|eat|dinner|lunch|breakfast|cook|order|takeout|pizza|sushi|burger|kebab)\b/i.test(norm)) {
    return 'food_ideas';
  }
  return 'activities';
}

/**
 * Synchronously checks curated dictionary and local cache for an instant poster match.
 */
export function resolveCuratedOptionPhoto(name = '') {
  const clean = String(name || '').toLowerCase().trim();
  if (!clean) return null;

  // Direct exact match
  if (KNOWN_CUSTOM_POSTERS[clean]) return KNOWN_CUSTOM_POSTERS[clean];

  // Substring match
  for (const [key, url] of Object.entries(KNOWN_CUSTOM_POSTERS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return url;
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
 * Resolves a game poster dynamically via the Steam Store Search proxy.
 */
export async function fetchDynamicGamePoster(name = '') {
  const clean = String(name || '').trim();
  if (!clean || clean.length < 2) return null;

  const curated = resolveCuratedOptionPhoto(clean);
  if (curated) return curated;

  try {
    const res = await fetch(apiUrl(`/api/v1/options/game-poster?query=${encodeURIComponent(clean)}`), {
      signal: AbortSignal.timeout ? AbortSignal.timeout(3500) : undefined,
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
    const isGamingTopic = inferLibraryTabFromTopic(topic) === 'gaming' || /\b(game|gaming|play)\b/i.test(name);

    if (isGamingTopic) {
      fetchDynamicGamePoster(name).then((url) => {
        if (isMounted) {
          if (url) setPhoto(url);
          setHasResolved(true);
        }
      });
    } else {
      setHasResolved(true);
    }

    return () => {
      isMounted = false;
    };
  }, [name, topic, initialUrl]);

  return { photo, hasResolved };
}
