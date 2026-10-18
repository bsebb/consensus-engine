// Multi-domain live autocomplete service for custom consensus polls.
// Intelligently classifies domain intent (sports, food, activities, movies, gaming)
// so real-world queries never get overwhelmed by obscure Steam video games.

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

const DOMAIN_KEYWORDS = {
  sports: [
    'wrestling', 'grappling', 'boxing', 'judo', 'mma', 'bjj', 'jiu-jitsu', 'martial art',
    'combat', 'sparring', 'ufc', 'wwe', 'aew', 'football', 'soccer', 'basketball', 'tennis',
    'padel', 'volleyball', 'badminton', 'ping pong', 'table tennis', 'swimming', 'bouldering',
    'climbing', 'running', 'jogging', 'cycling', 'bike', 'gym', 'lifting', 'weights', 'workout',
    'fitness', 'karting', 'go-kart', 'bowling', 'golf', 'topgolf', 'paintball', 'airsoft',
    'yoga', 'pilates', 'skate', 'skateboarding', 'skiing', 'snowboard', 'crossfit'
  ],
  food: [
    'pizza', 'sushi', 'sashimi', 'burger', 'burgers', 'tacos', 'birria', 'ramen', 'noodles',
    'kebab', 'shawarma', 'doner', 'pasta', 'bbq', 'ribs', 'steak', 'wings', 'dumplings',
    'dim sum', 'curry', 'thai', 'pad thai', 'chinese', 'mexican', 'italian', 'brunch',
    'pancakes', 'waffles', 'dessert', 'ice cream', 'gelato', 'boba', 'bubble tea', 'coffee',
    'bakery', 'placinte', 'food', 'eat', 'dinner', 'lunch', 'takeout', 'restaurant'
  ],
  activities: [
    'escape room', 'karaoke', 'board games', 'board game', 'catan', 'monopoly', 'chess',
    'poker', 'arcade', 'vr', 'comedy', 'standup', 'pub quiz', 'trivia', 'park', 'picnic',
    'billiards', 'pool', 'snooker', 'darts', 'laser tag', 'museum', 'bar crawl', 'hangout'
  ],
  movies: [
    'movie', 'movies', 'film', 'films', 'cinema', 'watch', 'netflix', 'hbo', 'disney',
    'series', 'shows', 'anime', 'documentary', 'horror movie', 'thriller', 'blockbuster'
  ],
  gaming: [
    'game', 'games', 'gaming', 'gamer', 'videogame', 'videogames', 'steam', 'pc game',
    'console', 'ps5', 'ps4', 'xbox', 'nintendo', 'switch', 'lan party', 'esports',
    'co-op game', 'multiplayer', 'rpg', 'arpg', 'fps', 'mmo', 'moba', 'battle royale',
    'poe', 'cs2', 'csgo', 'valorant', 'fortnite', 'minecraft', 'roblox', 'gta', 'dota'
  ]
};

const CURATED_CATALOG = [
  // --- SPORTS & COMBAT ---
  {
    name: 'Freestyle Wrestling / Grappling',
    category: 'sports',
    subtitle: 'Combat Sport • Mat Sparring & Takedowns',
    icon: 'Trophy',
    keywords: ['wrestling', 'grappling', 'freestyle', 'combat', 'mat', 'takedown'],
    poster_url: 'https://images.unsplash.com/photo-1517438322307-e67111335449?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Pro Wrestling / WWE Watch Party',
    category: 'sports',
    subtitle: 'Sports Entertainment • Live Pay-Per-View Viewing',
    icon: 'Trophy',
    keywords: ['wrestling', 'wwe', 'aew', 'pro wrestling', 'watch party'],
    poster_url: 'https://images.unsplash.com/photo-1517438322307-e67111335449?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Boxing / Sparring Session',
    category: 'sports',
    subtitle: 'Combat Sport • Gloves, Heavy Bag & Footwork',
    icon: 'Trophy',
    keywords: ['boxing', 'box', 'sparring', 'gloves', 'punching'],
    poster_url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'BJJ / Brazilian Jiu-Jitsu Open Mat',
    category: 'sports',
    subtitle: 'Combat Sport • Submissions & Rolls',
    icon: 'Trophy',
    keywords: ['bjj', 'jiu-jitsu', 'grappling', 'wrestling', 'rolls'],
    poster_url: 'https://images.unsplash.com/photo-1517438322307-e67111335449?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'MMA / Mixed Martial Arts Training',
    category: 'sports',
    subtitle: 'Combat Sport • Striking & Cage Work',
    icon: 'Trophy',
    keywords: ['mma', 'martial arts', 'fighting', 'combat', 'ufc'],
    poster_url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Football / Soccer Match',
    category: 'sports',
    subtitle: 'Pitch Match • 5v5 or 7v7',
    icon: 'Trophy',
    keywords: ['football', 'soccer', 'pitch', 'turf', 'match'],
    poster_url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Padel Tennis',
    category: 'sports',
    subtitle: 'Double Racquet Sport in Glass Court',
    icon: 'Trophy',
    keywords: ['padel', 'tennis', 'racket', 'court'],
    poster_url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Basketball 3v3 / Pickup',
    category: 'sports',
    subtitle: 'Half-Court / Full-Court Hoops',
    icon: 'Trophy',
    keywords: ['basketball', 'hoops', 'streetball', '3v3'],
    poster_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Tennis Match',
    category: 'sports',
    subtitle: 'Singles / Doubles Clay or Hard Court',
    icon: 'Trophy',
    keywords: ['tennis', 'racket', 'singles', 'doubles'],
    poster_url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Bouldering / Rock Climbing',
    category: 'sports',
    subtitle: 'Indoor Climbing Gym & Problems',
    icon: 'Trophy',
    keywords: ['bouldering', 'climbing', 'rock climbing', 'gym'],
    poster_url: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Bowling Night',
    category: 'sports',
    subtitle: '10-Pin Bowling Lanes & Friendly Match',
    icon: 'Trophy',
    keywords: ['bowling', 'lanes', 'strikes'],
    poster_url: 'https://images.unsplash.com/photo-1545232979-fbf67540a9a3?w=800&auto=format&fit=crop&q=80',
  },

  // --- FOOD & DINING ---
  {
    name: 'Wood-Fired Pizza',
    category: 'food',
    subtitle: 'Artisan Neapolitan & Crispy Crust',
    icon: 'Utensils',
    keywords: ['pizza', 'italian', 'slices', 'crust'],
    poster_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Sushi & Sashimi Platter',
    category: 'food',
    subtitle: 'Fresh Rolls, Nigiri & Edamame',
    icon: 'Utensils',
    keywords: ['sushi', 'rolls', 'japanese', 'salmon'],
    poster_url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Smash Burgers & Loaded Fries',
    category: 'food',
    subtitle: 'Crispy Patties, Melted Cheddar & Sauce',
    icon: 'Utensils',
    keywords: ['burger', 'burgers', 'fries', 'fast food'],
    poster_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Shawarma & Doner Kebabs',
    category: 'food',
    subtitle: 'Spiced Meat Wraps & Garlic Sauce',
    icon: 'Utensils',
    keywords: ['shawarma', 'kebab', 'doner', 'wrap'],
    poster_url: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Tacos & Birria Quesadillas',
    category: 'food',
    subtitle: 'Street Tacos, Salsa & Guacamole',
    icon: 'Utensils',
    keywords: ['tacos', 'mexican', 'birria'],
    poster_url: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&auto=format&fit=crop&q=80',
  },

  // --- ACTIVITIES & SOCIAL ---
  {
    name: 'Escape Room Adventure',
    category: 'activities',
    subtitle: '60-Minute Mystery & Puzzle Solving',
    icon: 'Compass',
    keywords: ['escape room', 'puzzle', 'mystery'],
    poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Karaoke Lounge & Private Room',
    category: 'activities',
    subtitle: 'Sing-Along Classics & Microphones',
    icon: 'Compass',
    keywords: ['karaoke', 'singing', 'music'],
    poster_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Board Game Cafe Hangout',
    category: 'activities',
    subtitle: 'Tabletop Games, Snacks & Coffee',
    icon: 'Compass',
    keywords: ['board games', 'cafe', 'tabletop', 'catan'],
    poster_url: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Arcade & VR Experience',
    category: 'activities',
    subtitle: 'Retro Cabinets, Air Hockey & VR Simulators',
    icon: 'Compass',
    keywords: ['arcade', 'vr', 'virtual reality'],
    poster_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Pub Quiz & Trivia Night',
    category: 'activities',
    subtitle: 'Team Brainstorming & Bar Food',
    icon: 'Compass',
    keywords: ['trivia', 'pub quiz', 'quiz'],
    poster_url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&auto=format&fit=crop&q=80',
  },

  // --- POPULAR VIDEO GAMES ---
  {
    name: 'Path of Exile 2',
    category: 'gaming',
    subtitle: 'Action RPG • Grinding Gear Games',
    icon: 'Gamepad2',
    keywords: ['poe', 'poe2', 'path of exile', 'arpg', 'action rpg'],
    poster_url: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2694490/header.jpg',
  },
  {
    name: 'Counter-Strike 2',
    category: 'gaming',
    subtitle: 'Tactical FPS • Valve',
    icon: 'Gamepad2',
    keywords: ['cs2', 'csgo', 'counter strike', 'shooter'],
    poster_url: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/header.jpg',
  },
  {
    name: 'Valorant',
    category: 'gaming',
    subtitle: 'Hero Tactical Shooter • Riot Games',
    icon: 'Gamepad2',
    keywords: ['val', 'fps', 'riot', 'valorant'],
    poster_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Minecraft',
    category: 'gaming',
    subtitle: 'Sandbox Survival & Creative • Mojang',
    icon: 'Gamepad2',
    keywords: ['mc', 'minecraft', 'sandbox', 'survival'],
    poster_url: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=800&auto=format&fit=crop&q=80',
  },
];

/**
 * Classifies query intent based on topic context and keyword dictionaries.
 */
function detectDomainIntent(query = '', topic = '') {
  const q = String(query).toLowerCase().trim();
  const t = String(topic).toLowerCase().trim();

  // If the room topic explicitly defines the domain, that takes priority
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some((k) => new RegExp(`(^|[^a-z0-9])${k}([^a-z0-9]|$)`, 'i').test(t))) {
      return domain;
    }
  }

  // Otherwise, inspect the user's typed search query
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some((k) => q === k || q.includes(k) || (k.length > 3 && k.startsWith(q)))) {
      return domain;
    }
  }

  return 'general';
}

/**
 * Searches Steam store for games matching query.
 * Filters out DLCs, soundtracks, and simulator clones.
 */
async function searchSteamGames(query, maxItems = 4) {
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
    .slice(0, maxItems)
    .map((item) => ({
      name: item.name,
      category: 'gaming',
      subtitle: 'Video Game • Steam',
      poster_url: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${item.id}/header.jpg`,
      icon: 'Gamepad2',
    }));

  return matched;
}

/**
 * Searches Wikipedia opensearch for movies and general topics.
 */
async function searchWikipediaMedia(query, category = 'movies') {
  const data = await getJson(
    `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json`,
    3000
  );
  const titles = Array.isArray(data?.[1]) ? data[1] : [];
  if (titles.length === 0) return [];

  return titles
    .filter((t) => !/disambiguation|list of|results|conspiracy|scandal|controversy|incident/i.test(t))
    .slice(0, 3)
    .map((t) => {
      const cleanName = t.replace(/\s*\([^)]*\)\s*$/, '').trim();
      return {
        name: cleanName,
        category,
        subtitle: category === 'movies' ? 'Film & Media' : 'Topic & Culture',
        poster_url: null,
        icon: category === 'movies' ? 'Film' : 'Compass',
      };
    });
}

/**
 * Main domain-intelligent autocomplete search function.
 */
async function searchCustomAutocomplete({ query = '', topic = '' }) {
  const clean = String(query || '').trim();
  if (clean.length < 2) return [];

  const cacheKey = `${normalize(clean)}|${normalize(topic)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.results;
  }

  const domain = detectDomainIntent(clean, topic);
  const qNorm = clean.toLowerCase();

  // 1. Search curated catalog for high-precision matches
  const curatedMatches = CURATED_CATALOG.filter((item) => {
    if (domain !== 'general' && item.category !== domain) return false;
    const n = item.name.toLowerCase();
    const sub = item.subtitle.toLowerCase();
    const kws = item.keywords || [];
    return n.includes(qNorm) || sub.includes(qNorm) || kws.some((k) => k.includes(qNorm) || qNorm.includes(k));
  });

  let results = [];

  // 2. Route based on domain intent:
  if (domain === 'sports' || domain === 'food' || domain === 'activities') {
    // When the user enters a real-world sport, food, or activity: NEVER flood them with Steam video games!
    results = [...curatedMatches];

    // If curated has fewer than 3 items, complement with Wikipedia media/topics (not Steam games)
    if (results.length < 3) {
      const wikiItems = await searchWikipediaMedia(clean, domain === 'sports' ? 'sports' : 'activities');
      results.push(...wikiItems);
    }
  } else if (domain === 'movies') {
    // Movies / Cinema
    results = [...curatedMatches];
    if (results.length < 4) {
      const wikiMovies = await searchWikipediaMedia(clean, 'movies');
      results.push(...wikiMovies);
    }
  } else if (domain === 'gaming') {
    // User explicitly in a gaming room or typed video game keywords -> Steam query
    results = [...curatedMatches];
    const steamHits = await searchSteamGames(clean, 5);
    results.push(...steamHits);
  } else {
    // General / Unknown query (e.g. "Path of Exile 2", "Interstellar", "Lethal Company")
    results = [...curatedMatches];

    // Check Steam for high-confidence titles
    const steamHits = await searchSteamGames(clean, 3);
    results.push(...steamHits);

    // If still room, check Wikipedia
    if (results.length < 4) {
      const wikiHits = await searchWikipediaMedia(clean, 'movies');
      results.push(...wikiHits);
    }
  }

  // 3. Deduplicate results by normalized name
  const seen = new Set();
  const deduped = [];
  for (const item of results) {
    const key = normalize(item.name);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  const finalResults = deduped.slice(0, 6);
  cache.set(cacheKey, { timestamp: Date.now(), results: finalResults });
  return finalResults;
}

module.exports = { searchCustomAutocomplete, detectDomainIntent, normalize };
