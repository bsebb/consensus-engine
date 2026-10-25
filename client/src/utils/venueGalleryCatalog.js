/**
 * Curated, sub-type-specific 4-photo galleries and descriptive slide captions.
 * Every activity, cuisine, and venue type has its own coherent 4-slide visual story
 * so a Paintball Club only shows paintball photos, a Bowling Alley only shows bowling lanes,
 * a Go-Kart circuit only shows kart racing, etc.
 */

export const VENUE_IMAGE_MAP = {
  // Fast Food, Chains & Street Food
  "mcdonald": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85",
  "kfc": "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=900&q=85",
  "burger king": "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=900&q=85",
  "torro": "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=85",
  "mister burger": "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=900&q=85",
  "star kebab": "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=85",
  "mister kebab": "https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=900&q=85",
  "twister": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=900&q=85",
  "subway": "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=900&q=85",
  "taco bell": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=900&q=85",
  "domino": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=85",
  "starbucks": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=85",

  // Top Chișinău & Regional Restaurants
  "osho": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=85",
  "pegas": "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=900&q=85",
  "mi piace": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=85",
  "andy's": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=85",
  "andys": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=85",
  "oliva": "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=85",
  "pizza mania": "https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=900&q=85",
  "ciao cacao": "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=900&q=85",
  "la plăcinte": "https://visit.chisinau.md/wp-content/uploads/2021/08/la-placinte2-1.jpg",
  "la placinte": "https://visit.chisinau.md/wp-content/uploads/2021/08/la-placinte2-1.jpg",
  "placinte": "https://visit.chisinau.md/wp-content/uploads/2021/08/la-placinte2-1.jpg",
  "la taifas": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=85",
  "vatra veche": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=85",
  "fuior": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=85",
  "popasul": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=85",
  "sakura": "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=85",
  "esushi": "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=85",
  "vasabi": "https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=900&q=85",
  "kira": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=85",
  "madam wong": "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=85",
  "park avenue": "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=900&q=85",
  "metaxa": "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=900&q=85",
  "jeraffe": "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=85",
  "asti": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=85",
  "caravan": "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=900&q=85",
  "gok-oguz": "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
  "trattoria della nonna": "https://img.restaurantguru.com/c7ae-Ristorante-Trattoria-della-Nonna-interior.jpg",
  "nonna": "https://img.restaurantguru.com/c7ae-Ristorante-Trattoria-della-Nonna-interior.jpg",
  "khinkali": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Tbilisi%2C_Khachapuri_and_khinkali%2C_Georgian_traditional_food%2C_Georgia.jpg/960px-Tbilisi%2C_Khachapuri_and_khinkali%2C_Georgian_traditional_food%2C_Georgia.jpg",
  "tbilisi": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/2019-07-17_Khachapuri_%28Adjaruli%29_served_at_Georgian_Restaurant_in_Kyiv.jpg/960px-2019-07-17_Khachapuri_%28Adjaruli%29_served_at_Georgian_Restaurant_in_Kyiv.jpg",

  // Cafes, Bakeries & Desserts
  "tucano": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85",
  "rozmarin": "https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&w=900&q=85",
  "crème de la crème": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=85",
  "creme de la creme": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=85",
  "sensi": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=85",
  "coffeemolka": "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=85",
  "propaganda": "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=900&q=85",
  "délice": "https://img.restaurantguru.com/w550/h367/r3f3-interior-Delice-2021-08.jpg",
  "delice": "https://img.restaurantguru.com/w550/h367/r3f3-interior-Delice-2021-08.jpg",
  "gioelia": "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=900&q=85",
  "dulcinella": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=85",
  "granier": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85",
  "panna cotta": "https://img.restaurantguru.com/c3db-Cafe-Panna-Cotta-interior-2.jpg",
  "pannicotta": "https://img.restaurantguru.com/c3db-Cafe-Panna-Cotta-interior-2.jpg",

  // Bars, Pubs & Nightlife
  "draft": "https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?auto=format&fit=crop&w=900&q=85",
  "taproom": "https://images.unsplash.com/photo-1575037614876-c38a4d44f5b8?auto=format&fit=crop&w=900&q=85",
  "kozlovna": "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=85",
  "smokehouse": "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=900&q=85",
  "marlène": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=85",
  "marlene": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=85",
  "covor": "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=900&q=85",
  "invino": "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=900&q=85",
  "carpe diem": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=85",
  "gastrobar": "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=900&q=85",
  "entourage": "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=900&q=85",
  "jack's": "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&w=900&q=85",
  "jacks": "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&w=900&q=85",

  // Fun, Entertainment & Activities (each mapped to an authentic photo of that exact activity!)
  "paintball": "https://images.pexels.com/photos/1839816/pexels-photo-1839816.jpeg?auto=compress&cs=tinysrgb&w=900",
  "plaza bowling": "https://images.pexels.com/photos/7429504/pexels-photo-7429504.jpeg?auto=compress&cs=tinysrgb&w=900",
  "bowling": "https://images.pexels.com/photos/7429504/pexels-photo-7429504.jpeg?auto=compress&cs=tinysrgb&w=900",
  "billiard": "https://images.pexels.com/photos/4109685/pexels-photo-4109685.jpeg?auto=compress&cs=tinysrgb&w=900",
  "karting": "https://images.pexels.com/photos/14182138/pexels-photo-14182138.jpeg?auto=compress&cs=tinysrgb&w=900",
  "laser tag": "https://images.pexels.com/photos/3869074/pexels-photo-3869074.jpeg?auto=compress&cs=tinysrgb&w=900",
  "cyber city": "https://images.pexels.com/photos/9072388/pexels-photo-9072388.jpeg?auto=compress&cs=tinysrgb&w=900",
  "vr club": "https://images.pexels.com/photos/7047331/pexels-photo-7047331.jpeg?auto=compress&cs=tinysrgb&w=900",
  "escaperoom": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/Escape_Room_by_Midgaard_Event.jpg/960px-Escape_Room_by_Midgaard_Event.jpg",
  "escape": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/Escape_Room_by_Midgaard_Event.jpg/960px-Escape_Room_by_Midgaard_Event.jpg",
  "board game": "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=900&q=85",
  "rollers": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Oaks_Park_Roller_Skating_Rink%2C_2018_-_1.jpg/960px-Oaks_Park_Roller_Skating_Rink%2C_2018_-_1.jpg",
  "jump arena": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/Recoil_Trampoline_Park%2C_Valdosta.jpg/960px-Recoil_Trampoline_Park%2C_Valdosta.jpg",
  "trampoline": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/Recoil_Trampoline_Park%2C_Valdosta.jpg/960px-Recoil_Trampoline_Park%2C_Valdosta.jpg",
  "bouldering": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/The_Cliffs_at_DUMBO.jpg/960px-The_Cliffs_at_DUMBO.jpg",
  "climbing": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/The_Cliffs_at_DUMBO.jpg/960px-The_Cliffs_at_DUMBO.jpg",
  "aqua terra": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Indoor_pool_and_showers_of_the_spa_at_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos.jpg/960px-Indoor_pool_and_showers_of_the_spa_at_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos.jpg",
  "aquaterra": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Indoor_pool_and_showers_of_the_spa_at_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos.jpg/960px-Indoor_pool_and_showers_of_the_spa_at_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos.jpg",
  "squash": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/80/Jupitersports_squash_court_constructed.jpg/960px-Jupitersports_squash_court_constructed.jpg",
  "padbol": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/Court_de_padel_de_Horgues_%28Hautes-Pyr%C3%A9n%C3%A9es%29_1.jpg/960px-Court_de_padel_de_Horgues_%28Hautes-Pyr%C3%A9n%C3%A9es%29_1.jpg",
  "padel": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/Court_de_padel_de_Horgues_%28Hautes-Pyr%C3%A9n%C3%A9es%29_1.jpg/960px-Court_de_padel_de_Horgues_%28Hautes-Pyr%C3%A9n%C3%A9es%29_1.jpg",
  "ice arena": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/Ice_Rink_at_Dubai_Mall%2C_Dubai_%28Ank_Kumar%29_02.jpg/960px-Ice_Rink_at_Dubai_Mall%2C_Dubai_%28Ank_Kumar%29_02.jpg",
  "patinoar": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/Ice_Rink_at_Dubai_Mall%2C_Dubai_%28Ank_Kumar%29_02.jpg/960px-Ice_Rink_at_Dubai_Mall%2C_Dubai_%28Ank_Kumar%29_02.jpg",
  "archery": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/WA_target_shot_with_a_compound_bow_%28Devizes_Bowmen%29.jpg/960px-WA_target_shot_with_a_compound_bow_%28Devizes_Bowmen%29.jpg",
  "robin hood": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/WA_target_shot_with_a_compound_bow_%28Devizes_Bowmen%29.jpg/960px-WA_target_shot_with_a_compound_bow_%28Devizes_Bowmen%29.jpg",
  "table tennis": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/Table_Tennis_05.jpg/960px-Table_Tennis_05.jpg",
  "top spin": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/Table_Tennis_05.jpg/960px-Table_Tennis_05.jpg",
  "darts": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Dartboard%2C_Black_Bull%2C_Wetherby_%287th_November_2023%29.jpg/960px-Dartboard%2C_Black_Bull%2C_Wetherby_%287th_November_2023%29.jpg",

  // Cinemas
  "cineplex loteanu": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=85",
  "cineplex malldova": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=85",
  "cineplex": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=85",
  "loteanu": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=85",
  "auto cinema": "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=900&q=85",
  "autocinema": "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=900&q=85",
  "private cinema": "https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=900&q=85",
  "aer liber": "https://images.unsplash.com/photo-1574267432553-4b4628081c31?auto=format&fit=crop&w=900&q=85",
  "movie hall": "https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=900&q=85",

  // Regional Verified Venues
  "alindor": "https://img.restaurantguru.com/w550/h367/re5f-Alindor-Pizza-exterior.jpg",
  "alin d'or": "https://img.restaurantguru.com/w550/h367/re5f-Alindor-Pizza-exterior.jpg",
  "struguraș": "https://www.struguras.md/imagini/foto/full/77728_sala_ospatarie_1.jpg",
  "struguras": "https://www.struguras.md/imagini/foto/full/77728_sala_ospatarie_1.jpg",
  "lacul verde": "https://honeypot0.s3.amazonaws.com/1701624490479-gallery-VGHT7346.webp",
  "hanul pescar": "https://www.visualbrand.ro/wp-content/uploads/2026/01/hanul-pescarilor1.jpg",
  "azasu": "https://qmzxbjlpwqkagcyhcglm.supabase.co/storage/v1/object/public/place-photos/places/google-1778416720729-i713zi6pcod.webp",
  "greko fresh": "https://grekofresh.md/wp-content/uploads/2020/10/restraraunt-photo-02-500x330.jpg",
  "grekofresh": "https://grekofresh.md/wp-content/uploads/2020/10/restraraunt-photo-02-500x330.jpg",
  "the box": "https://img.restaurantguru.com/cda1-Restaurant-CHIBOX-photo.jpg",
  "chibox": "https://img.restaurantguru.com/cda1-Restaurant-CHIBOX-photo.jpg",
};

export const CURATED_SLIDE_GALLERIES = {
  // === SPECIFIC ACTIVITY GALLERIES (18 distinct sub-types!) ===
  paintball: [
    { url: "https://images.pexels.com/photos/1839816/pexels-photo-1839816.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Woodsball Tactical Field", detail: "Forest obstacles, fortified bunkers & team objectives" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c7/Paintball_player_-_1.JPG/960px-Paintball_player_-_1.JPG", label: "Full Protective Gear & Markers", detail: "Thermal masks, chest armor & semi-auto paintball markers" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/Paintball_player_-_2.JPG/960px-Paintball_player_-_2.JPG", label: "Bunker Cover & Team Push", detail: "Capture-the-flag & elimination rounds with referees" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Arena_3x3_paintball.jpg/960px-Arena_3x3_paintball.jpg", label: "Speedball & Arena Zones", detail: "Inflatable speedball barriers & staging base camp" },
  ],
  bowling: [
    { url: "https://images.pexels.com/photos/7429504/pexels-photo-7429504.jpeg?auto=compress&cs=tinysrgb&w=900", label: "10-Pin Bowling Lanes", detail: "Polished lanes, automatic scoring & group couches" },
    { url: "https://images.pexels.com/photos/344034/pexels-photo-344034.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Pro Bowling Balls & Rack", detail: "Full range of ball weights & shoe rentals included" },
    { url: "https://images.pexels.com/photos/4192/sport-alley-ball-game.jpg?auto=compress&cs=tinysrgb&w=900", label: "Pinsetter & Strike Action", detail: "Fast pin resets, bumper options & cosmic lighting" },
    { url: "https://images.pexels.com/photos/7429668/pexels-photo-7429668.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Lane Seating & Drinks", detail: "Table service for snacks, pizza & cold drinks between frames" },
  ],
  karting: [
    { url: "https://images.pexels.com/photos/14182138/pexels-photo-14182138.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Go-Kart Racing Circuit", detail: "High-grip asphalt hairpins, chicanes & overtaking straights" },
    { url: "https://images.pexels.com/photos/14215544/pexels-photo-14215544.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Sodi Racing Karts & Helmets", detail: "270cc four-stroke karts, full-face helmets & neck braces" },
    { url: "https://images.pexels.com/photos/14199529/pexels-photo-14199529.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Head-to-Head Track Battles", detail: "10-minute timed heats with live millisecond lap telemetry" },
    { url: "https://images.pexels.com/photos/14194440/pexels-photo-14194440.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Pit Lane & Podium Results", detail: "Printed lap time sheets & spectator viewing deck" },
  ],
  billiards: [
    { url: "https://images.pexels.com/photos/4109685/pexels-photo-4109685.jpeg?auto=compress&cs=tinysrgb&w=900", label: "8-Ball & 9-Ball Pool Tables", detail: "Tournament-grade felt, pro cues & overhead table lamps" },
    { url: "https://images.pexels.com/photos/6032656/pexels-photo-6032656.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Spacious Billiard Hall", detail: "Well-spaced American pool & Russian pyramid tables" },
    { url: "https://images.pexels.com/photos/13638986/pexels-photo-13638986.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Rack & Break Setup", detail: "Aramith billiard balls, chalk & bridge sticks ready" },
    { url: "https://images.pexels.com/photos/261043/pexels-photo-261043.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Precision Shots & Lounge", detail: "Relaxed club atmosphere with bar drinks & table service" },
  ],
  escape: [
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/Escape_Room_by_Midgaard_Event.jpg/960px-Escape_Room_by_Midgaard_Event.jpg", label: "Immersive Mystery Room", detail: "60-minute themed storyline with hidden compartments" },
    { url: "https://images.pexels.com/photos/7319068/pexels-photo-7319068.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Ciphers, Locks & Clues", detail: "Crack cryptic codes, padlocks & mechanical puzzles together" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/Escape_Room_-_%22The_Expedition%22_%28Escape_Quest_Bethesda%29.jpg/960px-Escape_Room_-_%22The_Expedition%22_%28Escape_Quest_Bethesda%29.jpg", label: "Multi-Room Quest Set", detail: "Interactive props, sound effects & live game-master hints" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Escape_Quest_-_The_Black_Widow_1.jpg/960px-Escape_Quest_-_The_Black_Widow_1.jpg", label: "Atmospheric Puzzle Chamber", detail: "Designed for teams of 2 to 6 players" },
  ],
  lasertag: [
    { url: "https://images.pexels.com/photos/3869074/pexels-photo-3869074.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Tactical Laser Tag Arena", detail: "Blacklight labyrinth, fog effects & glowing barriers" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Laser_X_Laser_Tag_Toy_Gun_with_Chest_Receiver.jpg/960px-Laser_X_Laser_Tag_Toy_Gun_with_Chest_Receiver.jpg", label: "Phaser Blasters & Sensor Vests", detail: "Haptic vest sensors with real-time team scoreboards" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Fort_Bliss_laser_tag_120705-A-WO769-016.jpg/960px-Fort_Bliss_laser_tag_120705-A-WO769-016.jpg", label: "Team Arena Skirmish", detail: "Base capture, domination & free-for-all match modes" },
    { url: "https://images.pexels.com/photos/417458/pexels-photo-417458.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Neon Lighting & Sound", detail: "High-energy soundtrack & post-game accuracy stats" },
  ],
  vr: [
    { url: "https://images.pexels.com/photos/7047331/pexels-photo-7047331.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Multiplayer VR Arena", detail: "Full-room wireless VR headsets & motion tracking" },
    { url: "https://images.pexels.com/photos/6498298/pexels-photo-6498298.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Co-Op Virtual Worlds", detail: "Team zombie survival, rhythm games & racing sims" },
    { url: "https://images.pexels.com/photos/9069002/pexels-photo-9069002.jpeg?auto=compress&cs=tinysrgb&w=900", label: "6DoF Headsets & Haptics", detail: "High-refresh optics & DualSense motion controllers" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/RTX_2015_-_VR_gaming_%2820259099029%29.jpg/960px-RTX_2015_-_VR_gaming_%2820259099029%29.jpg", label: "Lounge & Spectator Screens", detail: "Watch friends' live POV feeds on big-screen TVs" },
  ],
  esports: [
    { url: "https://images.pexels.com/photos/9072388/pexels-photo-9072388.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Esports PC Battle Stations", detail: "240Hz monitors, RTX graphics & mechanical keyboards" },
    { url: "https://images.pexels.com/photos/9072394/pexels-photo-9072394.jpeg?auto=compress&cs=tinysrgb&w=900", label: "5v5 Squad Bootcamps", detail: "Side-by-side team desks for CS2, Dota 2, Valorant & LoL" },
    { url: "https://images.pexels.com/photos/7915507/pexels-photo-7915507.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Pro Headsets & Gaming Chairs", detail: "Low-latency fiber internet & ergonomic seating" },
    { url: "https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=900", label: "PS5 Lounge & Energy Bar", detail: "Console couches for EA FC / FIFA, Mortal Kombat & cold drinks" },
  ],
  boardgames: [
    { url: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=900&q=85", label: "Tabletop Game Library", detail: "100+ strategy, party & card games ready to play" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bf/Castles_of_Burgundy_%28Board_Game%29.jpg/960px-Castles_of_Burgundy_%28Board_Game%29.jpg", label: "Strategy & Eurogames", detail: "Catan, Ticket to Ride, Carcassonne & Codenames" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Board_game_pieces.jpg/960px-Board_game_pieces.jpg", label: "Dice, Meeples & Cards", detail: "Game hosts available to explain rules in 5 minutes" },
    { url: "https://images.pexels.com/photos/776654/pexels-photo-776654.jpeg?auto=compress&cs=tinysrgb&w=900", label: "Cozy Group Game Tables", detail: "Spacious tables with craft tea, coffee & snacks" },
  ],
  trampoline: [
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/Recoil_Trampoline_Park%2C_Valdosta.jpg/960px-Recoil_Trampoline_Park%2C_Valdosta.jpg", label: "Wall-to-Wall Trampoline Arena", detail: "Interconnected jump courts, angled walls & tumble tracks" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cc/Hometrampoline.jpg/960px-Hometrampoline.jpg", label: "Main Jump Zone & Obstacles", detail: "Ninja warrior course, wipeout beam & slam-dunk hoops" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/62/Dian_Nissen_jumping_at_a_trampoline_park.jpg/960px-Dian_Nissen_jumping_at_a_trampoline_park.jpg", label: "High-Fly Freestyle Court", detail: "Soft foam landing pits & high-bounce pro beds" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/2021_Trampoline_WAGC%2C_Baku.jpg/960px-2021_Trampoline_WAGC%2C_Baku.jpg", label: "Acrobatic & Dodgeball Zones", detail: "Grip socks, lockers & viewing lounge included" },
  ],
  climbing: [
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/The_Cliffs_at_DUMBO.jpg/960px-The_Cliffs_at_DUMBO.jpg", label: "Bouldering & Climbing Walls", detail: "Color-coded routes from beginner V0 to overhanging V8" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/ff/Man_climbing_in_bouldering_gym.jpg/960px-Man_climbing_in_bouldering_gym.jpg", label: "Overhangs & Technical Problems", detail: "Freshly set weekly boulder problems & volumes" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/74/Indoor_Climbing_Wall_Bouldering_Mats.jpg/960px-Indoor_Climbing_Wall_Bouldering_Mats.jpg", label: "Thick Crash Mats & Safety", detail: "Full-floor padded mats, climbing shoe & chalk rentals" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/ClimbingHolds_20211103_145113.jpg/960px-ClimbingHolds_20211103_145113.jpg", label: "Crimps, Jugs & Slopers", detail: "Warm-up hangboards, training area & chill zone" },
  ],
  spa: [
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Indoor_pool_and_showers_of_the_spa_at_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos.jpg/960px-Indoor_pool_and_showers_of_the_spa_at_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos.jpg", label: "Heated Indoor Pool & Spa", detail: "Crystal-clear thermal water, hydro-massage jets & loungers" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/Indoor_pool_and_shower_of_spa_at_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos_front_view.jpg/960px-Indoor_pool_and_shower_of_spa_at_Amantaka_luxury_Resort_%26_Hotel_in_Luang_Prabang_Laos_front_view.jpg", label: "Relaxation Deck & Daybeds", detail: "Finnish sauna, Turkish hammam & salt relaxation room" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Indoor_swimming_pool_in_Kavala.jpg/960px-Indoor_swimming_pool_in_Kavala.jpg", label: "Lap Lanes & Aqua Zone", detail: "Spacious swimming lanes & wellness facilities" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/GocheGanas_Wellness_centre_reception_and_pool_area.jpg/960px-GocheGanas_Wellness_centre_reception_and_pool_area.jpg", label: "Wellness Lounge & Fresh Bar", detail: "Herbal teas, smoothies, robes & towel service" },
  ],
  squash: [
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/80/Jupitersports_squash_court_constructed.jpg/960px-Jupitersports_squash_court_constructed.jpg", label: "Pro Glass-Back Squash Courts", detail: "Regulation hardwood floors, bright LED lighting & glass walls" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/74/Squash_court.JPG/960px-Squash_court.JPG", label: "Fast-Paced Singles & Doubles", detail: "Racquet & ball rentals available at the front desk" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/Court_de_padel_de_Horgues_%28Hautes-Pyr%C3%A9n%C3%A9es%29_1.jpg/960px-Court_de_padel_de_Horgues_%28Hautes-Pyr%C3%A9n%C3%A9es%29_1.jpg", label: "Padel & Padbol Turf Courts", detail: "Enclosed glass-and-mesh courts for 2v2 rallies" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Padel_tennis_court_by_S%C3%B6rn%C3%A4isten_Rantapromenadi_in_Hanasaari%2C_Helsinki%2C_Finland%2C_2020.jpg/960px-Padel_tennis_court_by_S%C3%B6rn%C3%A4isten_Rantapromenadi_in_Hanasaari%2C_Helsinki%2C_Finland%2C_2020.jpg", label: "Clubhouse & Changing Rooms", detail: "Showers, lockers & sports refreshments" },
  ],
  iceskating: [
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/Ice_Rink_at_Dubai_Mall%2C_Dubai_%28Ank_Kumar%29_02.jpg/960px-Ice_Rink_at_Dubai_Mall%2C_Dubai_%28Ank_Kumar%29_02.jpg", label: "Indoor Ice Skating Arena", detail: "Freshly resurfaced Olympic-grade ice & lively music" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/43/Ice_Rink_at_Dubai_Mall%2C_Dubai_%28Ank_Kumar%29_01.jpg/960px-Ice_Rink_at_Dubai_Mall%2C_Dubai_%28Ank_Kumar%29_01.jpg", label: "Public Skate Sessions", detail: "Figure & hockey skate rentals in all sizes" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/Elektrostal._Indoor_practice_ice_rink_named_after_A.Ionov._img-09.jpg/960px-Elektrostal._Indoor_practice_ice_rink_named_after_A.Ionov._img-09.jpg", label: "Smooth Gliding & Rinkside", detail: "Beginner skate aids, lockers & heated spectator seats" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Red_Arrow_Park_ice_rink_1292.jpg/960px-Red_Arrow_Park_ice_rink_1292.jpg", label: "Evening Skate & Hot Drinks", detail: "Warm cocoa, coffee & snacks by the rink" },
  ],
  archery: [
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/WA_target_shot_with_a_compound_bow_%28Devizes_Bowmen%29.jpg/960px-WA_target_shot_with_a_compound_bow_%28Devizes_Bowmen%29.jpg", label: "Olympic Target Archery", detail: "10-ring target faces, recurve & compound bows" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Scioto_Grove_-_Archery_Range_Target_1.jpg/960px-Scioto_Grove_-_Archery_Range_Target_1.jpg", label: "Multi-Distance Shooting Lanes", detail: "10m, 18m & 30m shooting lines with safety netting" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/Scioto_Grove_-_Archery_Range_1.jpg/960px-Scioto_Grove_-_Archery_Range_1.jpg", label: "Bows, Quivers & Armguards", detail: "Full equipment rental & 10-minute instructor briefing" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Karl_Little_Archery_Range_Western_Wayne_County_Conservation_Association_Plymouth_Michigan.JPG/960px-Karl_Little_Archery_Range_Western_Wayne_County_Conservation_Association_Plymouth_Michigan.JPG", label: "Friendly Group Tournaments", detail: "Scorecards, balloon-pop challenges & bullseye contests" },
  ],
  tabletennis: [
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/Table_Tennis_05.jpg/960px-Table_Tennis_05.jpg", label: "Tournament Ping-Pong Tables", detail: "ITTF-grade tables, pro nets & anti-glare sports flooring" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Table_Tennis_11.jpg/960px-Table_Tennis_11.jpg", label: "Singles & Doubles Rallies", detail: "Spacious court surrounds for fast-paced spin shots" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3d/Table_Tennis_racquet_and_ball_on_table_-_top_view.jpg/960px-Table_Tennis_racquet_and_ball_on_table_-_top_view.jpg", label: "Paddles & 3-Star Balls", detail: "Butterfly & Stiga racquets included with table rental" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/11/Table_tennis_table.jpg/960px-Table_tennis_table.jpg", label: "Club Lounge & Scoreboards", detail: "Flip scoreboards, locker rooms & cold drinks" },
  ],
  rollers: [
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Oaks_Park_Roller_Skating_Rink%2C_2018_-_1.jpg/960px-Oaks_Park_Roller_Skating_Rink%2C_2018_-_1.jpg", label: "Indoor Rollerdrome Rink", detail: "Smooth polished floor, neon disco lights & DJ music" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8b/Gay_Skate_Oaks_Park_Roller_Skating_Rink_3.jpg/960px-Gay_Skate_Oaks_Park_Roller_Skating_Rink_3.jpg", label: "Group Skate & Music Vibes", detail: "Open floor sessions for beginners & freestyle skaters" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a3/Impala_Marawa_Quad_Skates_Comparison.jpg/960px-Impala_Marawa_Quad_Skates_Comparison.jpg", label: "Quad & Inline Skate Rentals", detail: "Clean rental skates, wrist guards & helmets available" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/Gay_Skate_Oaks_Park_Roller_Skating_Rink_2.jpg/960px-Gay_Skate_Oaks_Park_Roller_Skating_Rink_2.jpg", label: "Rinkside Booths & Snack Bar", detail: "Soft drinks, snacks & chill seating around the track" },
  ],
  darts: [
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Dartboard%2C_Black_Bull%2C_Wetherby_%287th_November_2023%29.jpg/960px-Dartboard%2C_Black_Bull%2C_Wetherby_%287th_November_2023%29.jpg", label: "Bristle Dartboards & Oche", detail: "Regulation sisal boards, illuminated surrounds & laser oche" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6b/Tikkataulu.JPG/960px-Tikkataulu.JPG", label: "Steel-Tip Darts & 501 Matches", detail: "Play 501, Cricket & Around-the-Clock with friends" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/2025-04-03_Premier_League_Darts_Berlin_2025_by_Sandro_Halank%E2%80%93168.jpg/960px-2025-04-03_Premier_League_Darts_Berlin_2025_by_Sandro_Halank%E2%80%93168.jpg", label: "Tournament Lanes & Scoring", detail: "Chalkboards & digital tablets for effortless scorekeeping" },
    { url: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=85", label: "Club Bar & Craft Pints", detail: "Cold draft beers, cocktails & sharing platters between throws" },
  ],

  // === CINEMA GALLERIES ===
  cinema: [
    { url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=85", label: "Big-Screen Auditorium", detail: "Laser projection, Dolby Atmos sound & stadium seats" },
    { url: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=85", label: "VIP Recliner Seating", detail: "Spacious plush seats with unobstructed views" },
    { url: "https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=900&q=85", label: "Popcorn & Snack Bar", detail: "Freshly popped caramel & butter popcorn, nachos & drinks" },
    { url: "https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=900&q=85", label: "Cinema Foyer & Lounge", detail: "Pre-movie hangout area & ticket lobby" },
  ],
  autocinema: [
    { url: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=900&q=85", label: "Open-Air & Drive-In Screen", detail: "Giant outdoor LED screen under the stars with FM audio" },
    { url: "https://images.unsplash.com/photo-1574267432553-4b4628081c31?auto=format&fit=crop&w=900&q=85", label: "Evening Screening Atmosphere", detail: "Watch from your car or outdoor lounge chairs" },
    { url: "https://images.unsplash.com/photo-1585647347483-22b66260dfff?auto=format&fit=crop&w=900&q=85", label: "Hot Popcorn & Street Snacks", detail: "Caramel popcorn, nachos, burgers & warm drinks" },
    { url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=85", label: "Late-Night Blockbusters", detail: "Nightly double features & cult movie screenings" },
  ],

  // === FOOD, CAFE & NIGHTLIFE GALLERIES ===
  burgers: [
    { url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85", label: "Signature Smash Burgers", detail: "Double seared beef patties, melted cheddar & toasted brioche" },
    { url: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=85", label: "Crispy Fries & Combos", detail: "Golden fries, house dipping sauces & cold shakes" },
    { url: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=900&q=85", label: "Fresh Off The Grill", detail: "Flame-grilled burgers & crispy chicken sandwiches" },
    { url: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=900&q=85", label: "Loaded Double Cheeseburgers", detail: "Caramelized onions, pickles & smoky house sauce" },
  ],
  chicken: [
    { url: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=900&q=85", label: "Crispy Chicken Buckets", detail: "Golden 11-herb spiced tenders, wings & sharing buckets" },
    { url: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=900&q=85", label: "Hot Wings & Crispy Strips", detail: "Extra-crunchy coating with garlic & smoky BBQ dips" },
    { url: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=900&q=85", label: "Toasted Twister Wraps", detail: "Crispy chicken strips, fresh lettuce & pepper mayo in warm tortilla" },
    { url: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=85", label: "Zinger Burgers & Fries", detail: "Spicy crispy fillet sandwiches & seasoned fries" },
  ],
  pizza: [
    { url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=85", label: "Wood-Fired Neapolitan Pizza", detail: "Blistered crust, San Marzano tomatoes & fresh mozzarella" },
    { url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=85", label: "Freshly Sliced Sharing Pies", detail: "Quattro formaggi, diavola, prosciutto & fresh basil" },
    { url: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=900&q=85", label: "Artisanal Brick-Oven Crust", detail: "24-hour fermented dough baked at 450°C" },
    { url: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=85", label: "Homemade Pasta & Antipasti", detail: "Creamy carbonara, tagliatelle & Caesar salads" },
  ],
  kebab: [
    { url: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=85", label: "Charcoal Shawarma & Kebab", detail: "Spiced rotisserie meat wrapped in toasted flatbread" },
    { url: "https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=900&q=85", label: "Loaded Kebab Platter", detail: "Golden fries, pickled veggies & signature garlic sauce" },
    { url: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=900&q=85", label: "Grilled Wraps & Boxes", detail: "Generous portions made fresh to order" },
    { url: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=900&q=85", label: "Street-Food Classics", detail: "Fast counter service for day or late-night cravings" },
  ],
  sushi: [
    { url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=85", label: "Signature Sushi Platter", detail: "Fresh salmon nigiri, Philadelphia & dragon rolls" },
    { url: "https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=85", label: "Sashimi & Maki Boats", detail: "Chef-curated sharing sets for the whole table" },
    { url: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=900&q=85", label: "Tempura & Specialty Rolls", detail: "Crispy prawn tempura, unagi & spicy tuna rolls" },
    { url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=85", label: "Steaming Ramen & Wok Bowls", detail: "Rich tonkotsu broth, gyoza dumplings & udon noodles" },
  ],
  steak: [
    { url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=85", label: "Dry-Aged Steaks & Grill", detail: "Charcoal-seared ribeye, tenderloin & herb butter" },
    { url: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=900&q=85", label: "Wood-Fired Meat Platters", detail: "House sausages, smoked ribs & grilled vegetables" },
    { url: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=900&q=85", label: "Slow-Smoked BBQ Ribs", detail: "Tender brisket, glazed ribs & steakhouse sides" },
    { url: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=900&q=85", label: "Steakhouse Dining Room", detail: "Spacious booths, open grill & reserve wine pairings" },
  ],
  traditional: [
    { url: "https://visit.chisinau.md/wp-content/uploads/2021/08/la-placinte2-1.jpg", label: "Traditional Moldovan Plăcinte", detail: "Golden oven-baked pies with sheep cheese, potato & sour cherry" },
    { url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=85", label: "Hearty Local Specialties", detail: "Sarmale, mămăligă, chicken zeamă & sour cream" },
    { url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=85", label: "Charcoal Grill & Mititei", detail: "Grilled mititei, pork neck & chilled house wine" },
    { url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=85", label: "Warm Rustic Hospitality", detail: "Authentic woven motifs & welcoming group tables" },
  ],
  georgian: [
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/2019-07-17_Khachapuri_%28Adjaruli%29_served_at_Georgian_Restaurant_in_Kyiv.jpg/960px-2019-07-17_Khachapuri_%28Adjaruli%29_served_at_Georgian_Restaurant_in_Kyiv.jpg", label: "Oven-Baked Adjarian Khachapuri", detail: "Cheese-filled bread boat topped with egg yolk & butter" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/Khinkali%2C_Restaurant_Aragvi.jpg/960px-Khinkali%2C_Restaurant_Aragvi.jpg", label: "Hand-Pleated Juicy Khinkali", detail: "Spiced meat & herb soup dumplings made to order" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Tbilisi%2C_Khachapuri_and_khinkali%2C_Georgian_traditional_food%2C_Georgia.jpg/960px-Tbilisi%2C_Khachapuri_and_khinkali%2C_Georgian_traditional_food%2C_Georgia.jpg", label: "Georgian Supra Feast", detail: "Mtsvadi skewers, pkhali, walnut badrijani & Saperavi wine" },
    { url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/Old_Tbilisi%2C_Georgian_khachapuri%2C_Georgia.jpg/960px-Old_Tbilisi%2C_Georgian_khachapuri%2C_Georgia.jpg", label: "Hot Imeretian Cheese Bread", detail: "Baked fresh in a traditional clay tone oven" },
  ],
  cafes: [
    { url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85", label: "Specialty Espresso & Brews", detail: "Single-origin flat whites, V60 pour-over & iced lattes" },
    { url: "https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&w=900&q=85", label: "All-Day Brunch & Toast", detail: "Eggs Benedict, avocado sourdough & fluffy pancakes" },
    { url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85", label: "Fresh Croissants & Pastries", detail: "Flaky butter croissants & artisan cheesecakes" },
    { url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=85", label: "Cozy Cafe & Terrace", detail: "Warm natural light, greenery & relaxed seating" },
  ],
  desserts: [
    { url: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=900&q=85", label: "Artisanal Gelato & Sorbet", detail: "Freshly churned pistachio, hazelnut & berry scoops" },
    { url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=85", label: "Patisserie & Layer Cakes", detail: "Handcrafted éclairs, macarons & chocolate tortes" },
    { url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=85", label: "Dessert Parlor Seating", detail: "Elegant tearoom tables & sweet showcase counter" },
    { url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85", label: "Warm Brioche & Coffee", detail: "Paired with cappuccino & specialty loose-leaf teas" },
  ],
  bars: [
    { url: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=85", label: "Craft Cocktails & Taproom", detail: "Signature mixology, local draft IPAs & cold pints" },
    { url: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=900&q=85", label: "House Mixology & Spirits", detail: "Handcrafted cocktails, negronis & artisanal garnishes" },
    { url: "https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?auto=format&fit=crop&w=900&q=85", label: "Pub Grill & Bar Bites", detail: "Loaded nachos, smoked wings & burger sliders" },
    { url: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=900&q=85", label: "Evening Lounge & Patio", detail: "Ambient lighting, DJ sets & lively group tables" },
  ],
  wine: [
    { url: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=900&q=85", label: "Boutique Wine Cellar", detail: "200+ Moldovan & reserve vintages curated by sommeliers" },
    { url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=85", label: "Wine Flights & Tasting", detail: "By-the-glass pours of Fetească Neagră, Rară Neagră & Viorica" },
    { url: "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=900&q=85", label: "Cheese & Charcuterie Boards", detail: "Aged cheeses, prosciutto, walnuts & crusty baguette" },
    { url: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=900&q=85", label: "Intimate Wine Bar Atmosphere", detail: "Candlelit tables & relaxed evening conversation" },
  ],
  restaurants: [
    { url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=85", label: "Main Dining Room", detail: "Inviting tables, warm lighting & attentive service" },
    { url: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=85", label: "Chef's Signature Dishes", detail: "Freshly plated mains, salads & seasonal ingredients" },
    { url: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=900&q=85", label: "Terrace & Booth Seating", detail: "Comfortable seating for groups & conversations" },
    { url: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=900&q=85", label: "Drinks & Dessert Menu", detail: "House cocktails, local wines & sweet finishes" },
  ],
};

export const DISTINCT_RESTAURANT_POOL = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1525610553991-2bede1a236e2?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?auto=format&fit=crop&w=900&q=85",
];

/**
 * Maps any venue name + category to its exact specific gallery theme.
 */
export function detectGalleryTheme(name = '', category = '', smartMatch = null) {
  const effectiveName = smartMatch ? smartMatch.entry.canonicalName : name;
  const effectiveCat = smartMatch ? `${smartMatch.entry.category} ${category}` : category;
  const combined = `${name} ${effectiveName} ${effectiveCat}`.toLowerCase();

  // 1. Specific Activities & Entertainment (checked first so they never fall into food/generic buckets)
  if (/\b(paintball|airsoft|woodsball|legion)\b/.test(combined)) return 'paintball';
  if (/\b(bowling|bouling|bowlin)\b/.test(combined)) return 'bowling';
  if (/\b(karting|go-kart|gokart|go kart)\b/.test(combined)) return 'karting';
  if (/\b(billiard|biliard|snooker|8-ball|pool table|pool club)\b/.test(combined)) return 'billiards';
  if (/\b(escape|escaperoom|quest room|mystery room)\b/.test(combined)) return 'escape';
  if (/\b(laser tag|lasertag|laser arena)\b/.test(combined)) return 'lasertag';
  if (/\b(vr club|virtual reality|vr arena|vr headset)\b/.test(combined)) return 'vr';
  if (/\b(cyber city|esport|e-sport|pc gaming|lan party|internet cafe|gaming lounge|counter-strike|fifa|playstation|xbox)\b/.test(combined)) return 'esports';
  if (/\b(board game|boardgame|tabletop|catan|chess|mafia|poker|card night)\b/.test(combined)) return 'boardgames';
  if (/\b(jump arena|trampoline|trambulina|jumping park)\b/.test(combined)) return 'trampoline';
  if (/\b(bouldering|climbing|rock climbing|escalada)\b/.test(combined)) return 'climbing';
  if (/\b(aqua terra|aquaterra|wellness|thermal|spa|sauna|swimming pool|bazin)\b/.test(combined)) return 'spa';
  if (/\b(squash|padel|padbol|tennis court|badminton)\b/.test(combined)) return 'squash';
  if (/\b(ice arena|patinoar|ice skating|ice rink)\b/.test(combined)) return 'iceskating';
  if (/\b(archery|robin hood|tir cu arcul|bow and arrow)\b/.test(combined)) return 'archery';
  if (/\b(table tennis|ping pong|ping-pong|top spin)\b/.test(combined)) return 'tabletennis';
  if (/\b(rollers|rollerdrome|roller skating|skatepark)\b/.test(combined)) return 'rollers';
  if (/\b(darts|dartboard)\b/.test(combined)) return 'darts';

  // 2. Cinemas
  if (/\b(auto cinema|autocinema|aer liber|open-air cinema|drive-in)\b/.test(combined)) return 'autocinema';
  if (/\b(cinema|cineplex|movie|film|loteanu|imax)\b/.test(combined)) return 'cinema';

  // 3. Specific Food, Cafe & Bar Sub-Types
  if (/\b(mcdonald|burger|torro|whopper|smash|chibox|the box)\b/.test(combined)) return 'burgers';
  if (/\b(kfc|kentucky|crispy chicken|wings|zinger)\b/.test(combined)) return 'chicken';
  if (/\b(pizza|pizzeria|andy|oliva|mi piace|nonna|trattoria|italian|pasta|domino|ciao cacao|alindor|alin d'or|dolce vita)\b/.test(combined)) return 'pizza';
  if (/\b(kebab|shawarma|shaorma|shaurma|twister|gyros|greko|taco|subway)\b/.test(combined)) return 'kebab';
  if (/\b(sushi|esushi|vasabi|sakura|ramen|asian|wok|wong|japanese|kira|davidan)\b/.test(combined)) return 'sushi';
  if (/\b(khinkali|khachapuri|tbilisi|georgian|azasu|caravan)\b/.test(combined)) return 'georgian';
  if (/\b(osho|pegas|steak|ribeye|smokehouse|bbq|grill|meat)\b/.test(combined)) return 'steak';
  if (/\b(placinte|plăcinte|taifas|vatra|fuior|moldovan|strugur|popasul|gok-oguz|lacul verde|hanul)\b/.test(combined)) return 'traditional';
  if (/\b(gelato|gioelia|dulcinella|dessert|ice cream|patisserie|cake|waffle|donut|macaron)\b/.test(combined)) return 'desserts';
  if (/\b(tucano|starbucks|coffee|cafe|café|rozmarin|creme|crème|sensi|delice|délice|granier|brunch|bakery|panna cotta|pannicotta|bonjour)\b/.test(combined)) return 'cafes';
  if (/\b(invino|carpe diem|vartely|purcari|wine bar|winery|enoteca)\b/.test(combined)) return 'wine';
  if (/\b(bar|pub|draft|taproom|kozlovna|marlene|marlène|covor|beer|cocktail|lounge|entourage|jack's|jacks|boozer|eli pili)\b/.test(combined)) return 'bars';

  // Fallback for generic activity category
  if (/\b(fun|distraction|activities|entertainment)\b/.test(combined)) return 'bowling';
  return 'restaurants';
}
