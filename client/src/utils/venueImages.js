/**
 * Curated high-resolution culinary & venue photography.
 * Maps known Chișinău venues and dining categories to authentic food & ambient interior visuals.
 */

const VENUE_IMAGE_MAP = {
  // Known Chișinău Hotspots
  "osho": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80", // Steak & modern grill
  "park avenue": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80", // Ambient park terrace
  "mi piace": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80", // Italian pasta & wine
  "andy's": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80", // Wood-fired pizza
  "andys": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
  "draft": "https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?auto=format&fit=crop&w=800&q=80", // Pizza & craft draft
  "pizza mania": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80", // Crispy thin crust
  "pegas": "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=800&q=80", // Gourmet steakhouse
  "sakura": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80", // Premium sushi & rolls
  "jack's": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80", // Artisan smash burger
  "jacks": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  "sensi": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80", // Specialty coffee & brunch
  "metaxa": "https://images.unsplash.com/photo-1544124499-58912cbddaad?auto=format&fit=crop&w=800&q=80", // Mediterranean grill
  "jeraffe": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80", // Fine dining bistro
  "asti": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80", // Wine & tapas bar
  "vatra veche": "https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=800&q=80", // Moldovan traditional cuisine
  "crème de la crème": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80", // French patisserie
  "creme de la creme": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
  "propaganda": "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=800&q=80", // Cozy vintage café
  "kozlovna": "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80", // Czech tavern
  "la taifas": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80", // Moldovan feasts
};

const CATEGORY_IMAGE_MAP = {
  pizza: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
  burgers: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  sushi: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80",
  asian: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80",
  italian: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
  pasta: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80",
  cafes: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
  coffee: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
  tea: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80",
  "bars & pubs": "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80",
  bar: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80",
  pub: "https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?auto=format&fit=crop&w=800&q=80",
  cinema: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80",
  movies: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80",
  desserts: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
  bakery: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80",
  activities: "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=800&q=80",
  restaurants: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
  dining: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
};

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80";

/**
 * Returns a relevant visual photo URL for a given venue name and category.
 */
export function getVenueImage(name = '', category = '') {
  const normName = name.toLowerCase().trim();
  for (const [key, url] of Object.entries(VENUE_IMAGE_MAP)) {
    if (normName.includes(key)) {
      return url;
    }
  }

  const normCat = category.toLowerCase().trim();
  for (const [key, url] of Object.entries(CATEGORY_IMAGE_MAP)) {
    if (normCat.includes(key) || normName.includes(key)) {
      return url;
    }
  }

  return DEFAULT_IMAGE;
}

/**
 * Returns a human-friendly cuisine/vibe subtitle.
 */
export function getVenueVibe(name = '', category = '') {
  const norm = (name + ' ' + category).toLowerCase();
  if (norm.includes('pizza')) return 'Neapolitan & Roman Crusts';
  if (norm.includes('burger')) return 'Artisan Smash Burgers';
  if (norm.includes('sushi') || norm.includes('sakura')) return 'Fresh Sushi & Japanese Rolls';
  if (norm.includes('steak') || norm.includes('osho') || norm.includes('pegas')) return 'Dry-Aged Steaks & Prime Cuts';
  if (norm.includes('coffee') || norm.includes('sensi') || norm.includes('cafe')) return 'Specialty Espresso & Brunch';
  if (norm.includes('wine') || norm.includes('asti') || norm.includes('bistro')) return 'Selected Wines & Small Plates';
  if (norm.includes('bar') || norm.includes('pub') || norm.includes('draft') || norm.includes('beer')) return 'Craft Beer & Cocktails';
  if (norm.includes('vatra') || norm.includes('taifas')) return 'Authentic Moldovan Feasts';
  if (norm.includes('patisserie') || norm.includes('dessert') || norm.includes('creme')) return 'Handcrafted Pastries & Gelato';
  return 'Casual Dining & Ambience';
}
