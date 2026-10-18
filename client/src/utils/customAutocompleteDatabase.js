/**
 * Comprehensive multi-domain autocomplete database for custom group consensus.
 * Covers Gaming, Sports & Active, Movies & TV, Food & Dining, and Social Activities.
 */

export const CATEGORY_META = {
  gaming: { id: 'gaming', label: 'Gaming', icon: 'Gamepad2', color: 'text-violet-400 bg-violet-500/15 border-violet-500/25' },
  sports: { id: 'sports', label: 'Sports', icon: 'Trophy', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25' },
  movies: { id: 'movies', label: 'Movies & TV', icon: 'Film', color: 'text-amber-400 bg-amber-500/15 border-amber-500/25' },
  food: { id: 'food', label: 'Food & Dining', icon: 'Utensils', color: 'text-rose-400 bg-rose-500/15 border-rose-500/25' },
  activities: { id: 'activities', label: 'Activities', icon: 'Compass', color: 'text-sky-400 bg-sky-500/15 border-sky-500/25' },
};

export const AUTOCOMPLETE_DATABASE = [
  // --- GAMING (Current 2026 Landscape) ---
  { name: 'Grand Theft Auto VI', category: 'gaming', subtitle: 'Action Adventure & Crime • Rockstar Games', keywords: ['gta 6', 'gta vi', 'rockstar', 'vice city', 'gta'] },
  { name: 'Counter-Strike 2', category: 'gaming', subtitle: 'Tactical FPS • Valve', keywords: ['cs2', 'csgo', 'cs:go', 'shooter', 'pc'] },
  { name: 'Deadlock', category: 'gaming', subtitle: 'Hero Tactical MOBA • Valve', keywords: ['deadlock', 'valve', 'hero shooter', 'moba'] },
  { name: 'Marvel Rivals', category: 'gaming', subtitle: '6v6 Team Hero Shooter • NetEase & Marvel', keywords: ['marvel', 'rivals', 'hero shooter', 'superhero'] },
  { name: 'Valorant', category: 'gaming', subtitle: 'Hero Tactical Shooter • Riot Games', keywords: ['val', 'fps', 'riot'] },
  { name: 'Minecraft', category: 'gaming', subtitle: 'Sandbox Survival & Creative • Mojang', keywords: ['mc', 'craft', 'survival', 'blocks'] },
  { name: 'Path of Exile 2', category: 'gaming', subtitle: 'Action RPG • Grinding Gear Games', keywords: ['poe', 'poe2', 'poe 2', 'path of exile 2', 'arpg', 'action rpg', 'steam'] },
  { name: 'Monster Hunter Wilds', category: 'gaming', subtitle: 'Action Hunting RPG • Capcom', keywords: ['monster hunter', 'wilds', 'capcom', 'mh wilds'] },
  { name: 'Balatro', category: 'gaming', subtitle: 'Roguelike Deckbuilder & Poker • LocalThunk', keywords: ['balatro', 'poker', 'roguelike', 'cards', 'joker'] },
  { name: 'Slay the Spire 2', category: 'gaming', subtitle: 'Roguelike Deckbuilder • Mega Crit', keywords: ['slay the spire', 'sts2', 'slay the spire 2', 'deckbuilder'] },
  { name: 'Helldivers 2', category: 'gaming', subtitle: 'Co-op Sci-Fi Shooter • Arrowhead', keywords: ['helldivers', 'democracy', 'bugs', 'co-op'] },
  { name: 'Black Myth: Wukong', category: 'gaming', subtitle: 'Action RPG • Game Science', keywords: ['wukong', 'black myth', 'monkey king', 'souls'] },
  { name: 'Warhammer 40,000: Space Marine 2', category: 'gaming', subtitle: 'Third-Person Action Shooter • Saber', keywords: ['space marine 2', 'warhammer', '40k', 'co-op'] },
  { name: 'Elden Ring: Shadow of the Erdtree', category: 'gaming', subtitle: 'Dark Fantasy Action RPG • FromSoftware', keywords: ['souls', 'fromsoft', 'rpg', 'erdtree', 'elden ring'] },
  { name: 'Fortnite', category: 'gaming', subtitle: 'Battle Royale & Creative • Epic Games', keywords: ['fn', 'battle royale', 'epic'] },
  { name: 'Rocket League', category: 'gaming', subtitle: 'Vehicular Soccer • Psyonix', keywords: ['rl', 'car soccer', 'football'] },
  { name: 'League of Legends', category: 'gaming', subtitle: 'Competitive MOBA • Riot Games', keywords: ['lol', 'league', 'moba', 'riot'] },
  { name: 'EA Sports FC 26', category: 'gaming', subtitle: 'Football Simulation • EA Sports', keywords: ['fifa', 'ea fc', 'fc 26', 'fc 25', 'soccer'] },
  { name: 'Ghost of Yōtei', category: 'gaming', subtitle: 'Open-World Samurai Action • Sucker Punch', keywords: ['ghost of yotei', 'ghost of tsushima', 'samurai'] },
  { name: 'Clair Obscur: Expedition 33', category: 'gaming', subtitle: 'Turn-Based Reactive RPG • Sandfall', keywords: ['expedition 33', 'clair obscur', 'rpg'] },
  { name: 'Lethal Company', category: 'gaming', subtitle: 'Co-op Survival Horror • Zeekerss', keywords: ['lethal', 'scrap', 'horror', 'coop'] },
  { name: 'Phasmophobia', category: 'gaming', subtitle: 'Ghost Hunting Co-op • Kinetic', keywords: ['phasmo', 'ghost', 'horror', 'coop'] },
  { name: 'Rust', category: 'gaming', subtitle: 'Multiplayer Survival • Facepunch', keywords: ['pvp', 'survival', 'base'] },
  { name: 'Dota 2', category: 'gaming', subtitle: 'Strategy MOBA • Valve', keywords: ['dota', 'moba', 'valve'] },
  { name: 'Baldurs Gate 3', category: 'gaming', subtitle: 'Turn-Based Co-op RPG • Larian', keywords: ['bg3', 'dnd', 'rpg'] },
  { name: 'Tekken 8', category: 'gaming', subtitle: '3D Fighting Game • Bandai Namco', keywords: ['tekken', 'fighting', 'bracket'] },
  { name: 'Call of Duty: Warzone', category: 'gaming', subtitle: 'Battle Royale FPS • Activision', keywords: ['cod', 'warzone', 'modern warfare'] },
  { name: 'Cyberpunk 2077', category: 'gaming', subtitle: 'Open-World Sci-Fi RPG • CD Projekt', keywords: ['cyberpunk', 'cp2077', 'night city', 'rpg'] },
  { name: 'Hades II', category: 'gaming', subtitle: 'Roguelike Action Dungeon Crawler • Supergiant', keywords: ['hades', 'hades 2', 'roguelike'] },
  { name: 'Poker / Texas Holdem', category: 'gaming', subtitle: 'Card Game • Chips & Bluffs', keywords: ['poker', 'cards', 'holdem'] },
  { name: 'Catan', category: 'gaming', subtitle: 'Settlers Strategy Board Game', keywords: ['board game', 'settlers', 'tabletop'] },
  { name: 'Chess / Blitz Match', category: 'gaming', subtitle: 'Strategy Board Game', keywords: ['chess', 'board game', 'blitz'] },

  // --- SPORTS & FITNESS ---
  { name: 'Freestyle Wrestling / Grappling', category: 'sports', subtitle: 'Combat Sport • Mat Sparring & Takedowns', keywords: ['wrestling', 'grapple', 'freestyle', 'mat', 'takedown', 'combat'] },
  { name: 'Pro Wrestling / WWE Watch Party', category: 'sports', subtitle: 'Sports Entertainment • Live Pay-Per-View Viewing', keywords: ['wrestling', 'wwe', 'aew', 'pro wrestling', 'watch party'] },
  { name: 'Boxing / Sparring Session', category: 'sports', subtitle: 'Combat Sport • Gloves, Heavy Bag & Footwork', keywords: ['boxing', 'box', 'sparring', 'gloves', 'punching'] },
  { name: 'BJJ / Brazilian Jiu-Jitsu Open Mat', category: 'sports', subtitle: 'Combat Sport • Submissions & Rolls', keywords: ['bjj', 'jiu-jitsu', 'grappling', 'wrestling', 'rolls'] },
  { name: 'MMA / Mixed Martial Arts Training', category: 'sports', subtitle: 'Combat Sport • Striking & Cage Work', keywords: ['mma', 'martial arts', 'fighting', 'combat', 'ufc'] },
  { name: 'Football / Soccer Match', category: 'sports', subtitle: 'Pitch Match • 5v5 or 7v7', keywords: ['football', 'soccer', 'match', 'pitch', 'turf'] },
  { name: 'Padel Tennis', category: 'sports', subtitle: 'Double Racquet Sport in Glass Court', keywords: ['padel', 'tennis', 'racket', 'court'] },
  { name: 'Basketball 3v3 / Pickup', category: 'sports', subtitle: 'Half-Court / Full-Court Hoops', keywords: ['basketball', 'hoops', 'streetball', '3v3'] },
  { name: 'Tennis Match', category: 'sports', subtitle: 'Singles / Doubles Clay or Hard Court', keywords: ['tennis', 'racket', 'singles', 'doubles'] },
  { name: 'Bouldering / Rock Climbing', category: 'sports', subtitle: 'Indoor Climbing Gym & Problems', keywords: ['bouldering', 'climbing', 'rock climbing', 'gym'] },
  { name: 'Table Tennis / Ping Pong', category: 'sports', subtitle: 'Fast-Paced Racket Match', keywords: ['ping pong', 'table tennis', 'paddle'] },
  { name: 'Go-Kart Racing', category: 'sports', subtitle: 'Outdoor / Indoor Karting Circuit', keywords: ['karting', 'go-kart', 'racing', 'track'] },
  { name: 'Volleyball Match', category: 'sports', subtitle: 'Indoor / Beach Volleyball Game', keywords: ['volleyball', 'beach volley', 'net'] },
  { name: 'Bowling Night', category: 'sports', subtitle: '10-Pin Bowling Lanes & Friendly Match', keywords: ['bowling', 'lanes', 'strikes'] },
  { name: 'Billiards & 8-Ball Pool', category: 'sports', subtitle: 'Cue Sports & Tournament', keywords: ['pool', 'billiards', 'snooker', 'cue'] },
  { name: 'Gym Workout & Lifting', category: 'sports', subtitle: 'Weight Training & Group Pump', keywords: ['gym', 'lifting', 'weights', 'workout'] },
  { name: 'Running / 5k Jog', category: 'sports', subtitle: 'Park Route or Track Run', keywords: ['running', 'jogging', '5k', 'cardio'] },
  { name: 'Cycling & Bike Ride', category: 'sports', subtitle: 'City Cruise or Trail Route', keywords: ['cycling', 'bike', 'biking', 'bicycle'] },
  { name: 'Swimming Session', category: 'sports', subtitle: 'Indoor Pool Laps & Wellness', keywords: ['swimming', 'pool', 'laps'] },
  { name: 'Badminton Match', category: 'sports', subtitle: 'Fast Indoor Shuttlecock Game', keywords: ['badminton', 'shuttlecock', 'racket'] },
  { name: 'Golf / Topgolf Driving Range', category: 'sports', subtitle: 'Driving Range or Mini Golf', keywords: ['golf', 'topgolf', 'driving range', 'mini golf'] },
  { name: 'Paintball / Airsoft Battle', category: 'sports', subtitle: 'Tactical Team Elimination', keywords: ['paintball', 'airsoft', 'tactical'] },
  { name: 'Yoga / Pilates Class', category: 'sports', subtitle: 'Flexibility & Core Session', keywords: ['yoga', 'pilates', 'stretch'] },

  // --- MOVIES & TV (Active 2026 Blockbusters & Classics) ---
  { name: 'The Odyssey', category: 'movies', subtitle: 'Epic Historical Sci-Fi • Christopher Nolan', keywords: ['nolan', 'odyssey', 'matt damon', 'epic', 'cinema'] },
  { name: 'Spider-Man: Brand New Day', category: 'movies', subtitle: 'Superhero Multiverse Spectacle • Marvel & Sony', keywords: ['spiderman', 'brand new day', 'marvel', 'peter parker', 'cinema'] },
  { name: 'Project Hail Mary', category: 'movies', subtitle: 'Deep Space Survival Odyssey • Ryan Gosling', keywords: ['project hail mary', 'space', 'sci-fi', 'ryan gosling', 'andy weir'] },
  { name: 'Avatar: Fire and Ash', category: 'movies', subtitle: 'Sci-Fi Epic Blockbuster • James Cameron', keywords: ['avatar', 'avatar 3', 'fire and ash', 'pandora', 'cameron'] },
  { name: 'Superman', category: 'movies', subtitle: 'Superhero Sci-Fi Action • James Gunn', keywords: ['superman', 'dc', 'james gunn', 'man of steel', 'cinema'] },
  { name: 'A Minecraft Movie', category: 'movies', subtitle: 'Live-Action Adventure Comedy • Warner Bros', keywords: ['minecraft', 'minecraft movie', 'jack black', 'steve'] },
  { name: 'F1: The Movie', category: 'movies', subtitle: 'High-Speed Racing Drama • Brad Pitt', keywords: ['f1', 'formula 1', 'racing', 'brad pitt', 'speed'] },
  { name: 'Dune: Part Two', category: 'movies', subtitle: 'Epic Sci-Fi Blockbuster • Denis Villeneuve', keywords: ['dune', 'sci-fi', 'arrakis', 'paul atreides'] },
  { name: 'Oppenheimer', category: 'movies', subtitle: 'Historical Biopic Drama • Christopher Nolan', keywords: ['nolan', 'history', 'drama', 'oscar'] },
  { name: 'Interstellar', category: 'movies', subtitle: 'Deep Space Odyssey • Christopher Nolan', keywords: ['nolan', 'space', 'sci-fi'] },
  { name: 'Inception', category: 'movies', subtitle: 'Mind-Bending Sci-Fi • Christopher Nolan', keywords: ['nolan', 'sci-fi', 'thriller'] },
  { name: 'The Dark Knight', category: 'movies', subtitle: 'Superhero Crime Masterpiece • Batman & Joker', keywords: ['batman', 'joker', 'nolan', 'dc'] },
  { name: 'Arcane Season 2', category: 'movies', subtitle: 'Animated League of Legends Masterpiece', keywords: ['anime', 'netflix', 'riot', 'jinx', 'arcane'] },
  { name: 'The Bear', category: 'movies', subtitle: 'High-Stress Kitchen Comedy Drama', keywords: ['series', 'kitchen', 'drama', 'fx'] },
  { name: 'Severance', category: 'movies', subtitle: 'Sci-Fi Workplace Psychological Thriller', keywords: ['series', 'apple tv', 'sci-fi', 'thriller'] },
  { name: 'Horror Movie Night', category: 'movies', subtitle: 'Lights Off Group Scares & Popcorn', keywords: ['horror', 'scary', 'spooky'] },
  { name: 'Comedy Movie Marathon', category: 'movies', subtitle: 'Laugh-Out-Loud Group Binge', keywords: ['comedy', 'funny', 'laugh'] },

  // --- FOOD & DINING / TAKEOUT ---
  { name: 'Wood-Fired Pizza', category: 'food', subtitle: 'Artisan Neapolitan & Crispy Crust', keywords: ['pizza', 'italian', 'takeout', 'slices'] },
  { name: 'Sushi & Sashimi Platter', category: 'food', subtitle: 'Fresh Rolls, Nigiri & Edamame', keywords: ['sushi', 'japanese', 'rolls', 'salmon'] },
  { name: 'Smash Burgers & Loaded Fries', category: 'food', subtitle: 'Crispy Patties, Melted Cheddar & Sauce', keywords: ['burger', 'burgers', 'fries', 'fast food'] },
  { name: 'Shawarma & Doner Kebabs', category: 'food', subtitle: 'Spiced Meat Wraps & Garlic Sauce', keywords: ['shawarma', 'kebab', 'doner', 'wrap'] },
  { name: 'Tacos & Birria Quesadillas', category: 'food', subtitle: 'Street Tacos, Salsa & Guacamole', keywords: ['tacos', 'mexican', 'birria', 'nachos'] },
  { name: 'Ramen & Crispy Gyoza', category: 'food', subtitle: 'Rich Tonkotsu Broth & Handmade Noodles', keywords: ['ramen', 'noodles', 'japanese', 'gyoza'] },
  { name: 'BBQ & Smoked Ribs', category: 'food', subtitle: 'Pulled Pork, Brisket & Slaw', keywords: ['bbq', 'ribs', 'meat', 'smokehouse'] },
  { name: 'Traditional Plăcinte & Local Wine', category: 'food', subtitle: 'Warm Cheese, Potato & Cherry Moldovan Pies', keywords: ['placinte', 'moldovan', 'wine', 'traditional'] },
  { name: 'Pasta & Italian Classics', category: 'food', subtitle: 'Carbonara, Bolognese & Fresh Garlic Bread', keywords: ['pasta', 'italian', 'carbonara'] },
  { name: 'Thai Green Curry & Pad Thai', category: 'food', subtitle: 'Aromatic Spices, Peanut Sauce & Rice', keywords: ['thai', 'curry', 'pad thai', 'asian'] },
  { name: 'Dim Sum & Steamed Dumplings', category: 'food', subtitle: 'Bao Buns, Shumai & Potstickers', keywords: ['dumplings', 'dim sum', 'chinese', 'bao'] },
  { name: 'Weekend Brunch & Pancakes', category: 'food', subtitle: 'Fluffy Pancakes, Eggs Benedict & Coffee', keywords: ['brunch', 'breakfast', 'pancakes', 'coffee'] },
  { name: 'Artisan Gelato & Waffles', category: 'food', subtitle: 'Sweet Dessert Run & Espresso', keywords: ['dessert', 'ice cream', 'gelato', 'waffles'] },
  { name: 'Bubble Tea / Boba Run', category: 'food', subtitle: 'Milk Tea, Tapioca Pearls & Fruit Teas', keywords: ['boba', 'bubble tea', 'tea'] },

  // --- ACTIVITIES & SOCIAL ---
  { name: 'Escape Room Adventure', category: 'activities', subtitle: '60-Minute Mystery & Puzzle Solving', keywords: ['escape room', 'puzzle', 'mystery'] },
  { name: 'Karaoke Lounge & Private Room', category: 'activities', subtitle: 'Sing-Along Classics & Microphones', keywords: ['karaoke', 'singing', 'music'] },
  { name: 'Board Game Cafe Hangout', category: 'activities', subtitle: 'Tabletop Games, Snacks & Coffee', keywords: ['board games', 'cafe', 'tabletop'] },
  { name: 'Arcade & VR Experience', category: 'activities', subtitle: 'Retro Cabinets, Air Hockey & VR Simulators', keywords: ['arcade', 'vr', 'virtual reality', 'games'] },
  { name: 'Comedy Club / Standup Night', category: 'activities', subtitle: 'Live Standup Comedians & Drinks', keywords: ['comedy', 'standup', 'show'] },
  { name: 'Pub Quiz & Trivia Night', category: 'activities', subtitle: 'Team Brainstorming & Bar Food', keywords: ['trivia', 'pub quiz', 'quiz'] },
  { name: 'Botanical Garden / Park Walk', category: 'activities', subtitle: 'Outdoor Stroll & Fresh Air', keywords: ['park', 'walk', 'nature', 'picnic'] },
  { name: 'Picnic & Outdoor Games', category: 'activities', subtitle: 'Blankets, Snacks, Frisbee & Sunshine', keywords: ['picnic', 'outdoor', 'frisbee'] },
  { name: 'IMAX Cinema Screening', category: 'activities', subtitle: 'Big Screen Laser Projection & Surround Sound', keywords: ['cinema', 'imax', 'movie theater'] },
  { name: 'Thermal Spa & Sauna Day', category: 'activities', subtitle: 'Steam Rooms, Hot Pools & Relaxation', keywords: ['spa', 'sauna', 'pool', 'relax'] },
  { name: 'Sunset Scenic Roadtrip', category: 'activities', subtitle: 'Evening Drive, Playlists & Viewpoints', keywords: ['drive', 'roadtrip', 'sunset'] },
  { name: 'Cocktail Bar / Speakeasy', category: 'activities', subtitle: 'Craft Cocktails & Low-Key Vibes', keywords: ['bar', 'cocktails', 'drinks', 'nightlife'] },
  { name: 'Camping & Campfire Night', category: 'activities', subtitle: 'Tents, Roasted Marshmallows & Stargazing', keywords: ['camping', 'campfire', 'outdoors'] },
];

/**
 * Fast search and ranking algorithm for custom poll autocomplete.
 */
export function searchCustomSuggestions(query = '', topic = '', existingNames = []) {
  const q = String(query || '').toLowerCase().trim();
  const existingSet = new Set(existingNames.map((n) => String(n || '').toLowerCase().trim()));

  // If query is empty, return popular curated picks prioritized by room topic
  if (!q) {
    let preferredCategory = null;
    const t = String(topic || '').toLowerCase();
    if (/\b(gam(e|es|ing|ers?)|play(ing|in|s|ed)?|steam)\b/i.test(t)) preferredCategory = 'gaming';
    else if (/\b(sport|sports|football|soccer|basketball|padel|tennis)\b/i.test(t)) preferredCategory = 'sports';
    else if (/\b(movi(e|es)?|films?|cinema|watch)\b/i.test(t)) preferredCategory = 'movies';
    else if (/\b(food|eat|dinner|lunch|pizza|sushi)\b/i.test(t)) preferredCategory = 'food';
    else if (/\b(activit(y|ies)|fun|do)\b/i.test(t)) preferredCategory = 'activities';

    return AUTOCOMPLETE_DATABASE
      .filter((item) => !existingSet.has(item.name.toLowerCase()))
      .sort((a, b) => {
        if (preferredCategory) {
          if (a.category === preferredCategory && b.category !== preferredCategory) return -1;
          if (b.category === preferredCategory && a.category !== preferredCategory) return 1;
        }
        return 0;
      })
      .slice(0, 7);
  }

  // Scoring function: exact prefix -> word prefix -> keyword prefix -> substring
  const scored = [];
  for (const item of AUTOCOMPLETE_DATABASE) {
    if (existingSet.has(item.name.toLowerCase())) continue;

    const nameLower = item.name.toLowerCase();
    let score = 0;

    if (nameLower === q) {
      score = 100;
    } else if (nameLower.startsWith(q)) {
      score = 85;
    } else {
      const words = nameLower.split(/[\s/\\-]+/);
      if (words.some((w) => w.startsWith(q))) {
        score = 70;
      } else if (item.keywords && item.keywords.some((k) => k === q || k.startsWith(q))) {
        score = 55;
      } else if (nameLower.includes(q)) {
        score = 35;
      } else if (item.keywords && item.keywords.some((k) => k.includes(q))) {
        score = 25;
      } else if (item.subtitle.toLowerCase().includes(q)) {
        score = 15;
      }
    }

    if (score > 0) {
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 8).map((s) => s.item);
}
