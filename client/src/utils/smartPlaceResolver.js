/**
 * Smart Fuzzy Place, Chain & Craving Resolver with Nearest-Branch Routing.
 *
 * Detects chains, local restaurants, cafes, entertainment spots, and food cravings
 * even with typos (e.g. "macdonals", "mcdonlds", "mc donalds", "kfcc", "andys piza",
 * "placinte", "starbuks", "burgr king", "tucano", "oliva", "osho", "shaurma")
 * and routes the group to the nearest real location relative to their GPS.
 */

import { calculateDistanceKm, getSavedExactGps } from './location.js';

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
 * Multi-branch directory of popular chains, restaurants, cafes, and entertainment spots.
 * When a user is within 30km of a branch, we route to the exact nearest branch!
 * If the user is in another city/country, we route to the nearest location via GPS-anchored Maps search.
 */
export const SMART_PLACE_DIRECTORY = [
  {
    canonicalName: "McDonald's",
    category: 'Fast Food & Burgers',
    priceLevel: 1,
    vibe: 'Burgers, Fries & Drive-Thru',
    aliases: [
      'mcdonalds', 'mc donalds', 'mcdonald', 'mc donald', 'macdonals', 'macdonalds',
      'mcdonlds', 'mcdonals', 'makdonalds', 'makdonald', 'mcd', 'mc', 'maccas',
      'mcdo', 'big mac', 'mc nuggets', 'mcnuggets', 'mcflurry', 'mcdonalds drive',
    ],
    branches: [
      { name: "McDonald's Centru", address: 'Bd. Ștefan cel Mare 134, Chișinău', lat: 47.0243, lng: 28.8325 },
      { name: "McDonald's MallDova", address: 'Str. Arborilor 21 (MallDova), Chișinău', lat: 46.9972, lng: 28.8510 },
      { name: "McDonald's Botanica", address: 'Bd. Dacia 21/1, Chișinău', lat: 46.9896, lng: 28.8576 },
      { name: "McDonald's Rîșcani", address: 'Bd. Moscova 2/1, Chișinău', lat: 47.0405, lng: 28.8602 },
      { name: "McDonald's Ciocana", address: 'Bd. Mircea cel Bătrân 24/6, Chișinău', lat: 47.0468, lng: 28.8842 },
      { name: "McDonald's ZityMall", address: 'Str. Calea Ieșilor 8, Chișinău', lat: 47.0389, lng: 28.8185 },
      { name: "McDonald's Telecentru", address: 'Șos. Hîncești 53, Chișinău', lat: 47.0028, lng: 28.8218 },
    ],
  },
  {
    canonicalName: 'KFC',
    category: 'Crispy Chicken & Fast Food',
    priceLevel: 1,
    vibe: 'Crispy Chicken Buckets & Wings',
    aliases: [
      'kfc', 'k f c', 'kfcc', 'kentucky', 'kentucky fried chicken', 'kentuki',
      'kfc drive', 'crispy strips', 'zinger', 'kfc bucket',
    ],
    branches: [
      { name: 'KFC Centru', address: 'Bd. Ștefan cel Mare 64, Chișinău', lat: 47.0185, lng: 28.8415 },
      { name: 'KFC MallDova', address: 'Str. Arborilor 21 (MallDova), Chișinău', lat: 46.9972, lng: 28.8510 },
      { name: 'KFC Rîșcani', address: 'Bd. Moscova 1/3, Chișinău', lat: 47.0398, lng: 28.8598 },
      { name: 'KFC Botanica', address: 'Bd. Dacia 30/2, Chișinău', lat: 46.9862, lng: 28.8615 },
      { name: 'KFC Ciocana', address: 'Bd. Mircea cel Bătrân 25, Chișinău', lat: 47.0472, lng: 28.8848 },
    ],
  },
  {
    canonicalName: "Andy's Pizza",
    category: 'Pizza & Family Dining',
    priceLevel: 2,
    vibe: 'Pizza, Pasta & Casual Dining',
    aliases: [
      'andys', 'andys pizza', 'andy pizza', 'andys piza', 'andy piza', 'andis',
      'andis pizza', 'andyspiza', 'andyspizza', 'andy',
    ],
    branches: [
      { name: "Andy's Pizza Centru", address: 'Bd. Ștefan cel Mare 64, Chișinău', lat: 47.0190, lng: 28.8410 },
      { name: "Andy's Pizza Pușkin", address: 'Str. Pușkin 32, Chișinău', lat: 47.0245, lng: 28.8350 },
      { name: "Andy's Pizza Botanica", address: 'Bd. Dacia 28, Chișinău', lat: 46.9885, lng: 28.8590 },
      { name: "Andy's Pizza Rîșcani", address: 'Bd. Moscova 9, Chișinău', lat: 47.0432, lng: 28.8620 },
      { name: "Andy's Pizza Ciocana", address: 'Bd. Mircea cel Bătrân 11, Chișinău', lat: 47.0435, lng: 28.8815 },
      { name: "Andy's Pizza Buiucani", address: 'Str. Alba Iulia 75, Chișinău', lat: 47.0375, lng: 28.7885 },
    ],
  },
  {
    canonicalName: 'La Plăcinte',
    category: 'Traditional Moldovan Dining',
    priceLevel: 2,
    vibe: 'Warm Moldovan Pies, Sarmale & Wine',
    aliases: [
      'la placinte', 'laplacinte', 'placinte', 'placinta', 'la placinta', 'la placinti',
      'placintele', 'moldovan pies', 'zeama',
    ],
    branches: [
      { name: 'La Plăcinte Pușkin', address: 'Str. Pușkin 33, Chișinău', lat: 47.0250, lng: 28.8355 },
      { name: 'La Plăcinte Ștefan cel Mare', address: 'Bd. Ștefan cel Mare 182, Chișinău', lat: 47.0298, lng: 28.8260 },
      { name: 'La Plăcinte Botanica', address: 'Bd. Dacia 27, Chișinău', lat: 46.9888, lng: 28.8585 },
      { name: 'La Plăcinte Rîșcani', address: 'Bd. Moscova 9/1, Chișinău', lat: 47.0435, lng: 28.8622 },
      { name: 'La Plăcinte Ciocana', address: 'Bd. Mircea cel Bătrân 12, Chișinău', lat: 47.0452, lng: 28.8825 },
    ],
  },
  {
    canonicalName: 'Star Kebab',
    category: 'Kebab & Street Food',
    priceLevel: 1,
    vibe: 'Charcoal Wraps, Crispy Fries & Sauces',
    aliases: [
      'star kebab', 'starkebab', 'star kebap', 'starkebap', 'kebab star',
    ],
    branches: [
      { name: 'Star Kebab Centru', address: 'Str. Ismail 84, Chișinău', lat: 47.0215, lng: 28.8445 },
      { name: 'Star Kebab Botanica', address: 'Bd. Dacia 20, Chișinău', lat: 46.9905, lng: 28.8570 },
      { name: 'Star Kebab Rîșcani', address: 'Str. Kiev 11, Chișinău', lat: 47.0420, lng: 28.8605 },
      { name: 'Star Kebab Buiucani', address: 'Str. Calea Ieșilor 10, Chișinău', lat: 47.0392, lng: 28.8195 },
    ],
  },
  {
    canonicalName: 'Mister Kebab',
    category: 'Kebab & Shawarma',
    priceLevel: 1,
    vibe: 'Loaded Shawarma Wraps & Late-Night Bites',
    aliases: ['mister kebab', 'misterkebab', 'mr kebab', 'mrkebab'],
    branches: [
      { name: 'Mister Kebab Centru', address: 'Bd. Ștefan cel Mare 128, Chișinău', lat: 47.0235, lng: 28.8332 },
      { name: 'Mister Kebab Rîșcani', address: 'Bd. Moscova 5, Chișinău', lat: 47.0415, lng: 28.8608 },
    ],
  },
  {
    canonicalName: 'Burger King',
    category: 'Flame-Grilled Burgers',
    priceLevel: 1,
    vibe: 'Flame-Grilled Whoppers & Crispy Fries',
    aliases: ['burger king', 'burgerking', 'burgr king', 'burger kng', 'whopper', 'bk'],
    branches: [
      { name: 'Burger King / Craft Burger Spot', address: 'Str. Arborilor 21, Chișinău', lat: 46.9972, lng: 28.8510 },
    ],
  },
  {
    canonicalName: 'Torro Burgers',
    category: 'Craft Burger Grill',
    priceLevel: 2,
    vibe: 'Juicy Smash Burgers, Brioche & Craft Sauces',
    aliases: ['torro', 'torro burgers', 'toro burgers', 'toro burger', 'torro burger'],
    branches: [
      { name: 'Torro Burgers Centru', address: 'Str. Alexandru cel Bun 98, Chișinău', lat: 47.0258, lng: 28.8342 },
      { name: 'Torro Burgers MallDova', address: 'Str. Arborilor 21 (MallDova), Chișinău', lat: 46.9972, lng: 28.8510 },
    ],
  },
  {
    canonicalName: 'Starbucks',
    category: 'Coffeehouse & Espresso',
    priceLevel: 2,
    vibe: 'Iced Lattes, Frappuccinos & Pastries',
    aliases: ['starbucks', 'starbuks', 'starbuck', 'starbux', 'star bucks', 'frappuccino'],
    branches: [
      { name: 'Specialty Coffee & Roastery Central', address: 'Str. Pușkin 15, Chișinău', lat: 47.0225, lng: 28.8340 },
    ],
  },
  {
    canonicalName: 'Tucano Coffee',
    category: 'Specialty Coffee & Roastery',
    priceLevel: 2,
    vibe: 'Specialty Espresso,Cheesecakes & Cozy Vibe',
    aliases: ['tucano', 'tucano coffee', 'tukano', 'tucanno', 'tucano brasil', 'tucano costa rica'],
    branches: [
      { name: 'Tucano Coffee Brasil', address: 'Str. Aleksandr Pușkin 15, Chișinău', lat: 47.0225, lng: 28.8340 },
      { name: 'Tucano Coffee Costa Rica', address: 'Bd. Ștefan cel Mare 182, Chișinău', lat: 47.0245, lng: 28.8315 },
      { name: 'Tucano Coffee Peace', address: 'Bd. Moscova 5, Chișinău', lat: 47.0415, lng: 28.8605 },
      { name: 'Tucano Coffee MallDova', address: 'Str. Arborilor 21 (MallDova), Chișinău', lat: 46.9972, lng: 28.8510 },
    ],
  },
  {
    canonicalName: 'Oliva Restaurant',
    category: 'Mediterranean & Italian',
    priceLevel: 2,
    vibe: 'Wood-Fired Pizza, Salads & Mediterranean Pasta',
    aliases: ['oliva', 'oliva restaurant', 'olivia', 'oliva verde', 'restaurant oliva'],
    branches: [
      { name: 'Oliva Centru', address: 'Bd. Ștefan cel Mare 132, Chișinău', lat: 47.0242, lng: 28.8330 },
      { name: 'Oliva Rîșcani', address: 'Bd. Moscova 5, Chișinău', lat: 47.0418, lng: 28.8605 },
      { name: 'Oliva Botanica', address: 'Bd. Decebal 139, Chișinău', lat: 47.0055, lng: 28.8595 },
      { name: 'Oliva Pușkin', address: 'Str. Pușkin 22, Chișinău', lat: 47.0222, lng: 28.8355 },
    ],
  },
  {
    canonicalName: 'Trattoria della Nonna',
    category: 'Italian Trattoria',
    priceLevel: 2,
    vibe: 'Authentic Pasta, Quattro Formaggi & Tiramisu',
    aliases: ['trattoria', 'tratoria', 'trattoria della nonna', 'della nonna', 'tratoria dela nona'],
    branches: [
      { name: 'Trattoria della Nonna Centru', address: 'Str. Mitropolit Varlaam 65, Chișinău', lat: 47.0238, lng: 28.8390 },
      { name: 'Trattoria della Nonna Rîșcani', address: 'Bd. Moscova 17/4, Chișinău', lat: 47.0460, lng: 28.8640 },
      { name: 'Trattoria della Nonna Botanica', address: 'Bd. Dacia 23, Chișinău', lat: 46.9892, lng: 28.8580 },
    ],
  },
  {
    canonicalName: 'Osho Bar & Kitchen',
    category: 'Steakhouse & Dry-Aged Grill',
    priceLevel: 4,
    vibe: 'Dry-Aged Ribeye Steaks, Seafood & Wine',
    aliases: ['osho', 'osho bar', 'oshoo', 'osho steak', 'osho restaurant'],
    branches: [
      { name: 'Osho Bar & Kitchen', address: 'Bd. Decebal 23/1, Chișinău', lat: 47.0072, lng: 28.8578 },
    ],
  },
  {
    canonicalName: 'Pegas Restaurant & Terrace',
    category: '24/7 Grill & European Dining',
    priceLevel: 3,
    vibe: 'Signature Sausages, Steaks & Lively Terrace',
    aliases: ['pegas', 'pegas restaurant', 'pegass', 'pegas terrace'],
    branches: [
      { name: 'Pegas Restaurant & Terrace', address: 'Str. Albișoara 20/1, Chișinău', lat: 47.0325, lng: 28.8380 },
    ],
  },
  {
    canonicalName: 'Mi Piace Ristorante',
    category: 'Fine Italian & Parkside Dining',
    priceLevel: 3,
    vibe: 'Neapolitan Wood-Fired Pizza, Risotto & Wine',
    aliases: ['mi piace', 'mipiace', 'mi piaci', 'ristorante mi piace'],
    branches: [
      { name: 'Mi Piace Ristorante', address: 'Str. Trandafirilor 4, Chișinău', lat: 47.0020, lng: 28.8565 },
    ],
  },
  {
    canonicalName: 'Rozmarin Cafe',
    category: 'Brunch, Roastery & Bistro',
    priceLevel: 2,
    vibe: 'Avocado Toast, Specialty Coffee & Cozy Patio',
    aliases: ['rozmarin', 'rozmarin cafe', 'rosmarin', 'rozmarine'],
    branches: [
      { name: 'Rozmarin Cafe', address: 'Bd. Ștefan cel Mare 202, Chișinău', lat: 47.0320, lng: 28.8225 },
    ],
  },
  {
    canonicalName: 'Crème de la Crème',
    category: 'French Patisserie & Brunch',
    priceLevel: 2,
    vibe: 'Croissants, French Macarons & Garden Terrace',
    aliases: ['creme de la creme', 'creme', 'crem de la crem'],
    branches: [
      { name: 'Crème de la Crème', address: 'Str. Alexandru cel Bun 98A, Chișinău', lat: 47.0238, lng: 28.8340 },
    ],
  },
  {
    canonicalName: 'Draft Arena',
    category: 'Craft Beer Pub & Grill',
    priceLevel: 2,
    vibe: 'Draft Beers, Burger Platters & Live Sports',
    aliases: ['draft', 'draft arena', 'draft pub', 'draft beer'],
    branches: [
      { name: 'Draft Arena Botanica', address: 'Bd. Dacia 35, Chișinău', lat: 46.9855, lng: 28.8620 },
      { name: 'Draft Arena Rîșcani', address: 'Str. Kiev 16, Chișinău', lat: 47.0430, lng: 28.8610 },
      { name: 'Draft Arena Ciocana', address: 'Bd. Mircea cel Bătrân 12/2, Chișinău', lat: 47.0460, lng: 28.8820 },
      { name: 'Draft Arena Buiucani', address: 'Str. Alba Iulia 75, Chișinău', lat: 47.0370, lng: 28.7880 },
    ],
  },
  {
    canonicalName: 'Smokehouse BBQ',
    category: 'Texas BBQ & Craft Beer',
    priceLevel: 2,
    vibe: 'Smoked Brisket, Pulled Pork Ribs & Craft Ales',
    aliases: ['smokehouse', 'smoke house', 'smokehouse bbq', 'bbq ribs'],
    branches: [
      { name: 'Smokehouse BBQ & Beer', address: 'Bd. Ștefan cel Mare 128, Chișinău', lat: 47.0230, lng: 28.8325 },
    ],
  },
  {
    canonicalName: 'Taproom 27',
    category: 'Craft Beer Taproom',
    priceLevel: 2,
    vibe: 'Local Craft IPAs, Stouts & Smokehouse Bites',
    aliases: ['taproom', 'taproom 27', 'tap room', 'taproom27'],
    branches: [
      { name: 'Taproom 27 Craft Beer', address: 'Str. Vasile Alecsandri 117, Chișinău', lat: 47.0205, lng: 28.8390 },
    ],
  },
  {
    canonicalName: 'Esushi',
    category: 'Sushi & Japanese Rolls',
    priceLevel: 2,
    vibe: 'Philadelphia Rolls, Salmon Sashimi & Poke Bowls',
    aliases: ['esushi', 'e sushi', 'e-sushi', 'vasabi', 'sushi', 'susi', 'sushi rolls', 'sashimi'],
    branches: [
      { name: 'Esushi Centru', address: 'Str. București 68, Chișinău', lat: 47.0225, lng: 28.8318 },
      { name: 'Esushi MallDova', address: 'Str. Arborilor 21 (MallDova), Chișinău', lat: 46.9972, lng: 28.8510 },
      { name: 'Esushi Rîșcani', address: 'Bd. Moscova 14, Chișinău', lat: 47.0445, lng: 28.8630 },
    ],
  },
  {
    canonicalName: 'Gioelia Cremeria',
    category: 'Artisanal Italian Gelateria',
    priceLevel: 2,
    vibe: 'Pistachio & Hazelnut Freshly Churned Gelato',
    aliases: ['gioelia', 'gioela', 'gioelia cremeria', 'gelato', 'inghetata', 'ice cream'],
    branches: [
      { name: 'Gioelia Cremeria Centru', address: 'Str. Constantin Tănase 9, Chișinău', lat: 47.0285, lng: 28.8365 },
      { name: 'Gioelia Cremeria MallDova', address: 'Str. Arborilor 21 (MallDova), Chișinău', lat: 46.9972, lng: 28.8510 },
    ],
  },
  {
    canonicalName: 'Dulcinella',
    category: 'Confectionery & Desserts',
    priceLevel: 1,
    vibe: 'Cakes, Pastries & Sweet Treats',
    aliases: ['dulcinella', 'dulcinela', 'tort', 'prajituri'],
    branches: [
      { name: 'Dulcinella Centru', address: 'Str. Tighina 49, Chișinău', lat: 47.0195, lng: 28.8410 },
      { name: 'Dulcinella Botanica', address: 'Bd. Decebal 64, Chișinău', lat: 47.0075, lng: 28.8590 },
      { name: 'Dulcinella Rîșcani', address: 'Bd. Moscova 3, Chișinău', lat: 47.0420, lng: 28.8610 },
    ],
  },
  {
    canonicalName: "Domino's Pizza",
    category: 'Pizza Delivery & Takeout',
    priceLevel: 2,
    vibe: 'Hot Loaded Pizzas & Cheesy Bread',
    aliases: ['dominos', 'domino', 'dominos pizza', 'domino pizza'],
    branches: [
      { name: 'Wood-Fired Pizza Spot', address: 'Bd. Ștefan cel Mare 132, Chișinău', lat: 47.0242, lng: 28.8330 },
    ],
  },
  {
    canonicalName: 'Subway',
    category: 'Fresh Subs & Sandwiches',
    priceLevel: 1,
    vibe: 'Toasted Sub Sandwiches & Cookies',
    aliases: ['subway', 'subwey', 'sub way'],
    branches: [
      { name: 'Subway / Artisan Sandwich Spot', address: 'Bd. Ștefan cel Mare 128, Chișinău', lat: 47.0235, lng: 28.8332 },
    ],
  },
  {
    canonicalName: 'Taco Bell',
    category: 'Tacos & Quesadillas',
    priceLevel: 1,
    vibe: 'Crunchy Tacos, Burritos & Quesadillas',
    aliases: ['taco bell', 'tacobell', 'tacos', 'taco', 'burrito', 'quesadilla'],
    branches: [
      { name: 'Tacos & Mexican Grill Spot', address: 'Str. Pușkin 22, Chișinău', lat: 47.0225, lng: 28.8355 },
    ],
  },
  {
    canonicalName: 'Wood-Fired Pizza',
    category: 'Neapolitan Pizzeria',
    priceLevel: 2,
    vibe: 'Crispy Wood-Fired Crust & Fresh Mozzarella',
    aliases: ['pizza', 'piza', 'pizzeria', 'pizeria', 'wood fired pizza', 'neapolitan pizza'],
    branches: [
      { name: 'Ciao Cacao / Mi Piace Pizzeria', address: 'Str. Arborilor 21, Chișinău', lat: 46.9972, lng: 28.8510 },
      { name: 'Oliva Wood-Fired Pizza Centru', address: 'Bd. Ștefan cel Mare 132, Chișinău', lat: 47.0242, lng: 28.8330 },
    ],
  },
  {
    canonicalName: 'Shawarma & Kebab',
    category: 'Street Food & Grill',
    priceLevel: 1,
    vibe: 'Spiced Charcoal Wraps, Crispy Fries & Garlic Sauce',
    aliases: ['shawarma', 'shaorma', 'shaurma', 'shawerma', 'doner', 'kebab', 'kebap'],
    branches: [
      { name: 'Star Kebab Centru', address: 'Str. Ismail 84, Chișinău', lat: 47.0215, lng: 28.8445 },
      { name: 'Mister Kebab Centru', address: 'Bd. Ștefan cel Mare 128, Chișinău', lat: 47.0235, lng: 28.8332 },
    ],
  },
  {
    canonicalName: 'Smash Burgers & Fries',
    category: 'Craft Burger Joint',
    priceLevel: 2,
    vibe: 'Double Smash Patties, Melted Cheddar & Fries',
    aliases: ['burger', 'burgers', 'burgr', 'smash burger', 'smash burgers', 'cheeseburger'],
    branches: [
      { name: 'Torro Burgers Centru', address: 'Str. Alexandru cel Bun 98, Chișinău', lat: 47.0258, lng: 28.8342 },
      { name: "McDonald's Centru", address: 'Bd. Ștefan cel Mare 134, Chișinău', lat: 47.0243, lng: 28.8325 },
    ],
  },
  {
    canonicalName: 'Cineplex Cinema',
    category: 'Cinema & Movie Theater',
    priceLevel: 2,
    vibe: 'Big-Screen Blockbusters, Dolby Sound & Popcorn',
    aliases: ['cineplex', 'cineplexx', 'cinema', 'movie theater', 'loteanu', 'malldova cinema', 'imax'],
    branches: [
      { name: 'Cineplex Loteanu', address: 'Bd. Ștefan cel Mare 103, Chișinău', lat: 47.0252, lng: 28.8315 },
      { name: 'Cineplex MallDova', address: 'Str. Arborilor 21 (MallDova), Chișinău', lat: 46.9972, lng: 28.8510 },
    ],
  },
  {
    canonicalName: 'Plaza Bowling & Billiards',
    category: 'Fun & Distractions • Bowling',
    priceLevel: 2,
    vibe: '10-Pin Bowling Lanes, Pool Tables & Drinks',
    aliases: ['bowling', 'bouling', 'bowlin', 'plaza bowling', 'bowling night'],
    branches: [
      { name: 'Plaza Bowling MallDova', address: 'Str. Arborilor 21 (MallDova), Chișinău', lat: 46.9972, lng: 28.8510 },
    ],
  },
  {
    canonicalName: 'Billiard Club Classic',
    category: 'Fun & Distractions • Billiards',
    priceLevel: 2,
    vibe: '8-Ball Pool Tables, Snooker & Lounge Bar',
    aliases: ['billiards', 'billiard', 'biliard', 'pool table', '8 ball pool', 'snooker'],
    branches: [
      { name: 'Billiard Club Classic', address: 'Str. Armenească 35, Chișinău', lat: 47.0230, lng: 28.8370 },
    ],
  },
  {
    canonicalName: 'Karting Club Racing',
    category: 'Fun & Distractions • Karting',
    priceLevel: 3,
    vibe: 'High-Speed Go-Kart Racing Circuit & Lap Timing',
    aliases: ['karting', 'go kart', 'gokart', 'karting club', 'go-kart racing'],
    branches: [
      { name: 'Karting Club Moldova', address: 'Șos. Hîncești 210, Chișinău', lat: 46.9850, lng: 28.8120 },
    ],
  },
  {
    canonicalName: 'Laser Tag & VR Arena',
    category: 'Fun & Distractions • Arcade',
    priceLevel: 2,
    vibe: 'Tactical Laser Tag, VR Simulators & Arcade',
    aliases: ['laser tag', 'lasertag', 'vr club', 'arcade', 'cyber city'],
    branches: [
      { name: 'Laser Tag Arena', address: 'Bd. Mircea cel Bătrân 14, Chișinău', lat: 47.0460, lng: 28.8820 },
      { name: 'VR Club Centru', address: 'Str. Pușkin 32, Chișinău', lat: 47.0240, lng: 28.8350 },
    ],
  },
  {
    canonicalName: 'Escape Room Quest',
    category: 'Fun & Distractions • Escape Game',
    priceLevel: 3,
    vibe: '60-Minute Team Mystery & Puzzle Rooms',
    aliases: ['escape room', 'escaperoom', 'escape quest', 'quest room'],
    branches: [
      { name: 'Escaperoom Chișinău', address: 'Str. Pușkin 12, Chișinău', lat: 47.0210, lng: 28.8350 },
    ],
  },
];

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
        ? `Nearest: ${nearestBranch.address}`
        : `Nearest ${entry.canonicalName} (${cityLabel})`,
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
      category: 'Local Spot & Dining',
      price_level: 2,
      vibe: 'Group Dining & Hangout Spot',
      address: `Nearest ${cleanRaw} • ${cityLabel}`,
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
 * Searches SMART_PLACE_DIRECTORY with typo tolerance for autocomplete suggestions.
 */
export function searchSmartPlaceSuggestions(query = '', existingNames = []) {
  const norm = normalizePlaceToken(query);
  if (!norm || norm.length < 2) return [];

  const existingSet = new Set(existingNames.map((n) => normalizePlaceToken(n)));
  const results = [];

  for (const entry of SMART_PLACE_DIRECTORY) {
    if (existingSet.has(normalizePlaceToken(entry.canonicalName))) continue;

    const match = matchSmartPlaceEntry(query);
    if (match && match.entry.canonicalName === entry.canonicalName) {
      results.push({
        name: entry.canonicalName,
        category: 'food',
        subtitle: `${entry.vibe} • Routes to nearest location`,
        score: match.score + 10,
      });
      continue;
    }

    const canonNorm = normalizePlaceToken(entry.canonicalName);
    if (canonNorm.includes(norm) || entry.aliases.some((a) => normalizePlaceToken(a).includes(norm))) {
      results.push({
        name: entry.canonicalName,
        category: 'food',
        subtitle: `${entry.vibe} • Routes to nearest location`,
        score: 75,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}
