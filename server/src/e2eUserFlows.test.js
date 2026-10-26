const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { httpServer, io, ready } = require('../app');
const { prisma } = require('../db/helpers');
const { CATEGORIZED_FALLBACKS } = require('./data/curatedVenues');
const { detectGalleryTheme, CURATED_SLIDE_GALLERIES } = require('../../client/src/utils/venueGalleryCatalog.js');

const BANNED_PHOTO_DOMAINS = [
  '999.md',
  'simpalsmedia.com',
  'pinimg.com',
  'pinterest.com',
  'redd.it',
  'reddit.com',
  'mirax.md',
  'makler.md',
  'point.md',
  'stiri.md',
];
const BANNED_BEDROOM_PHOTO_ID = 'photo-1538688525198-9b88f6f53126';

/**
 * Lightweight native WebSocket client speaking Socket.IO v4 / Engine.IO v4 protocol.
 */
function createSocketClient(baseUrl) {
  const wsUrl = baseUrl.replace(/^http/, 'ws') + '/socket.io/?EIO=4&transport=websocket';
  const ws = new WebSocket(wsUrl);
  const listeners = new Map();
  const eventHistory = new Map();

  let connectedResolve;
  let connectedReject;
  const connectedPromise = new Promise((resolve, reject) => {
    connectedResolve = resolve;
    connectedReject = reject;
  });

  ws.addEventListener('message', (evt) => {
    const raw = String(evt.data || '');
    if (raw.startsWith('0')) {
      // Engine.IO open -> send Socket.IO namespace connect
      ws.send('40');
      return;
    }
    if (raw === '2') {
      // Engine.IO ping -> pong
      ws.send('3');
      return;
    }
    if (raw.startsWith('40')) {
      connectedResolve();
      return;
    }
    if (raw.startsWith('42')) {
      try {
        const [eventName, payload] = JSON.parse(raw.slice(2));
        if (!eventHistory.has(eventName)) eventHistory.set(eventName, []);
        eventHistory.get(eventName).push(payload);
        const handlers = listeners.get(eventName) || [];
        for (const fn of [...handlers]) {
          fn(payload);
        }
      } catch {
        // Ignore malformed frame
      }
    }
  });

  ws.addEventListener('error', (err) => {
    connectedReject(err);
  });

  return {
    async connect() {
      await connectedPromise;
      return this;
    },
    emit(eventName, payload) {
      ws.send(`42${JSON.stringify([eventName, payload])}`);
    },
    on(eventName, handler) {
      if (!listeners.has(eventName)) listeners.set(eventName, []);
      listeners.get(eventName).push(handler);
    },
    off(eventName, handler) {
      const arr = listeners.get(eventName);
      if (!arr) return;
      const idx = arr.indexOf(handler);
      if (idx !== -1) arr.splice(idx, 1);
    },
    waitFor(eventName, predicate = null, timeoutMs = 4000) {
      const past = eventHistory.get(eventName) || [];
      for (const item of past) {
        if (!predicate || predicate(item)) {
          return Promise.resolve(item);
        }
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.off(eventName, onEvent);
          reject(new Error(`Timed out waiting for socket event "${eventName}" after ${timeoutMs}ms`));
        }, timeoutMs);

        const onEvent = (data) => {
          if (!predicate || predicate(data)) {
            clearTimeout(timer);
            this.off(eventName, onEvent);
            resolve(data);
          }
        };
        this.on(eventName, onEvent);
      });
    },
    clearHistory(eventName) {
      if (eventName) eventHistory.delete(eventName);
      else eventHistory.clear();
    },
    close() {
      try {
        ws.close();
      } catch {}
    },
  };
}

let baseUrl = '';
let clientUtils = {};

test.before(async () => {
  await ready;
  await new Promise((resolve) => {
    if (httpServer.listening) {
      resolve();
    } else {
      httpServer.listen(0, '127.0.0.1', resolve);
    }
  });
  const addr = httpServer.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;

  const clientUtilsDir = path.resolve(__dirname, '../../client/src/utils');
  const [venueImagesMod, smartResolverMod, autocompleteMod, roomParserMod] = await Promise.all([
    import(pathToFileURL(path.join(clientUtilsDir, 'venueImages.js')).href),
    import(pathToFileURL(path.join(clientUtilsDir, 'smartPlaceResolver.js')).href),
    import(pathToFileURL(path.join(clientUtilsDir, 'customAutocompleteDatabase.js')).href),
    import(pathToFileURL(path.join(clientUtilsDir, 'roomOptionsParser.js')).href),
  ]);

  clientUtils = {
    ...venueImagesMod,
    ...smartResolverMod,
    ...autocompleteMod,
    ...roomParserMod,
  };
});

test.after(async () => {
  await new Promise(resolve => io.close(resolve));
  try {
    if (prisma && prisma.$disconnect) {
      await prisma.$disconnect();
    }
  } catch {}
});

test('Flow 1: Discovery Room Creation, Category Pools & Activity Gallery Verification', async (t) => {
  const categories = ['restaurants', 'cafes', 'bars', 'cinema', 'desserts', 'activities'];

  await t.test('GET /api/v1/places returns deduplicated, rich venues with valid coordinates, price labels, and verified photos for all 6 categories', async () => {
    for (const category of categories) {
      const res = await fetch(
        `${baseUrl}/api/v1/places?category=${encodeURIComponent(category)}&lat=47.0225&lng=28.8340&radius=5000&is_exact_gps=true&limit=30`
      );
      assert.equal(res.status, 200, `Expected HTTP 200 for category=${category}`);
      const body = await res.json();
      assert.equal(body.success, true, `Expected success=true for category=${category}`);
      assert.ok(Array.isArray(body.places), `Expected places array for category=${category}`);
      assert.ok(body.places.length >= 6, `Expected at least 6 places for category=${category}, got ${body.places.length}`);

      const seenNames = new Set();
      for (const venue of body.places) {
        const normName = String(venue.name || '').toLowerCase().trim();
        assert.ok(normName.length > 0, `Venue name must be non-empty in ${category}`);
        assert.ok(!seenNames.has(normName), `Duplicate venue "${venue.name}" found in category=${category}`);
        seenNames.add(normName);

        assert.equal(typeof venue.lat, 'number', `Venue "${venue.name}" must have numeric lat`);
        assert.equal(typeof venue.lng, 'number', `Venue "${venue.name}" must have numeric lng`);
        assert.ok(venue.lat >= 46.8 && venue.lat <= 47.3, `Venue "${venue.name}" lat out of Chișinău bounds: ${venue.lat}`);
        assert.ok(venue.lng >= 28.6 && venue.lng <= 29.1, `Venue "${venue.name}" lng out of Chișinău bounds: ${venue.lng}`);

        assert.ok(venue.priceLevel >= 1 && venue.priceLevel <= 4, `Venue "${venue.name}" priceLevel must be 1..4`);
        assert.ok(typeof venue.priceLabel === 'string' && venue.priceLabel.includes('$'), `Venue "${venue.name}" must have formatted priceLabel`);

        assert.ok(
          typeof venue.photo_url === 'string' && venue.photo_url.startsWith('https://'),
          `Venue "${venue.name}" in ${category} must have a verified https photo_url, got: ${venue.photo_url}`
        );
        assert.ok(
          !venue.photo_url.includes(BANNED_BEDROOM_PHOTO_ID),
          `Venue "${venue.name}" must never use banned bedroom photo ID`
        );
        for (const domain of BANNED_PHOTO_DOMAINS) {
          assert.ok(
            !venue.photo_url.toLowerCase().includes(domain),
            `Venue "${venue.name}" photo_url contains untrusted domain ${domain}: ${venue.photo_url}`
          );
        }
      }
    }
  });

  await t.test('POST /api/v1/rooms creates Discovery rooms across all 6 categories with hydrated options', async () => {
    for (const category of categories) {
      const hostId = `host-${category}-${Date.now()}`;
      const res = await fetch(`${baseUrl}/api/v1/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: hostId,
          device_id: `dev-${category}`,
          mode: 'DISCOVERY',
          theme: category,
          latitude: 47.0225,
          longitude: 28.8340,
          radius: 5000,
          is_exact_gps: true,
        }),
      });
      assert.equal(res.status, 201, `Expected 201 Created for room category=${category}`);
      const room = await res.json();
      assert.match(room.pin, /^\d{4}$/, 'Room PIN must be 4 digits');
      assert.equal(room.mode, 'DISCOVERY');
      assert.ok(room.host_token, 'Room creation must return signed host_token');
      assert.ok(Array.isArray(room.options) && room.options.length >= 6, `Expected >= 6 options for ${category}, got ${room.options?.length}`);

      const parsedDeck = clientUtils.buildCandidatePool({
        mode: 'DISCOVERY',
        topic: category,
        realOptions: room.options,
        category,
        userGps: { lat: 47.0225, lng: 28.8340 },
      });
      assert.ok(parsedDeck.length >= 6, `Parsed candidate pool for ${category} should have >= 6 venues`);
      for (const card of parsedDeck) {
        assert.equal(typeof card.lat, 'number', `Parsed card "${card.name}" must have numeric lat`);
        assert.equal(typeof card.lng, 'number', `Parsed card "${card.name}" must have numeric lng`);
        assert.ok(card.photo_url && card.photo_url.startsWith('https://'), `Parsed card "${card.name}" must have photo_url`);
        assert.ok(
          !/^parc(ul)?\s+/i.test(card.name),
          `Public park "${card.name}" must never leak into ${category} room options`
        );
      }
    }
  });

  await t.test('All 20 Fun & Distractions activities resolve verified /api/v1/venue-photos and 4 distinct sub-type-matching slides in getVenuePhotoGallery', async () => {
    const activitiesList = CATEGORIZED_FALLBACKS.activities;
    assert.equal(activitiesList.length, 20, 'Expected 20 curated activities in CATEGORIZED_FALLBACKS.activities');

    const expectedThemesByActivity = {
      'Paintball Club Legion': 'paintball',
      'Plaza Bowling MallDova': 'bowling',
      'Karting Club Moldova': 'karting',
      'VR Club Virtual Reality': 'vr',
      'Cyber City Esports Lounge': 'esports',
      'Escaperoom Chișinău': 'escape',
      'Escape The Room Quest': 'escape',
      'Jump Arena Trampoline Park': 'trampoline',
      'Bouldering Climbing Gym': 'climbing',
      'Aqua Terra Wellness Center': 'spa',
      'Ice Arena Patinoar': 'iceskating',
      'Archery Club Robin Hood': 'archery',
      'Table Tennis Top Spin': 'tabletennis',
      'Rollers Rollerdrome': 'rollers',
      'Darts Club Chișinău': 'darts',
      'Padbol Club Arena': 'squash',
      'Squash Club Chișinău': 'squash',
      'Laser Tag Arena': 'lasertag',
      'Billiard Club Classic': 'billiards',
      'Board Game Lounge': 'boardgames',
    };

    for (const act of activitiesList) {
      // 1. Verify /api/v1/venue-photos endpoint
      const res = await fetch(
        `${baseUrl}/api/v1/venue-photos?name=${encodeURIComponent(act.name)}&category=${encodeURIComponent(act.category)}`
      );
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.photos) && data.photos.length >= 1, `Expected verified photo from /api/v1/venue-photos for "${act.name}"`);
      const apiPhotoUrl = data.photos[0];
      assert.ok(apiPhotoUrl.startsWith('https://'), `Photo URL for "${act.name}" must be https`);
      assert.ok(!apiPhotoUrl.includes(BANNED_BEDROOM_PHOTO_ID), `"${act.name}" must not use banned bedroom photo`);
      for (const domain of BANNED_PHOTO_DOMAINS) {
        assert.ok(!apiPhotoUrl.toLowerCase().includes(domain), `"${act.name}" photo URL contains banned domain ${domain}`);
      }

      // 2. Verify sub-type gallery theme detection
      const detectedTheme = detectGalleryTheme(act.name, act.category);
      const expectedTheme = expectedThemesByActivity[act.name];
      assert.equal(
        detectedTheme,
        expectedTheme,
        `Activity "${act.name}" (${act.category}) resolved to theme "${detectedTheme}", expected "${expectedTheme}"`
      );
      assert.notEqual(detectedTheme, 'restaurants', `Activity "${act.name}" must never fall back to generic restaurants gallery`);

      // 3. Verify 4 distinct, verified, sub-type-matching slides in getVenuePhotoGallery
      const slides = clientUtils.getVenuePhotoGallery(act.name, act.category, apiPhotoUrl);
      assert.equal(slides.length, 4, `Expected 4 gallery slides for "${act.name}", got ${slides.length}`);

      const uniqueUrls = new Set(slides.map((s) => s.url));
      assert.equal(uniqueUrls.size, 4, `Expected 4 distinct photo URLs for "${act.name}", got ${uniqueUrls.size}: ${JSON.stringify(slides.map((s) => s.url))}`);

      const allowedThemeUrls = new Set((CURATED_SLIDE_GALLERIES[expectedTheme] || []).map((s) => s.url));
      allowedThemeUrls.add(apiPhotoUrl);

      for (const slide of slides) {
        assert.ok(slide.url.startsWith('https://'), `Slide URL for "${act.name}" must be https`);
        assert.ok(!slide.url.includes(BANNED_BEDROOM_PHOTO_ID), `Slide for "${act.name}" contains banned bedroom photo`);
        for (const domain of BANNED_PHOTO_DOMAINS) {
          assert.ok(!slide.url.toLowerCase().includes(domain), `Slide for "${act.name}" contains banned domain ${domain}`);
        }
        assert.ok(
          allowedThemeUrls.has(slide.url),
          `Slide URL ${slide.url} for "${act.name}" does not belong to sub-type gallery "${expectedTheme}"`
        );
      }
    }
  });
});

test('Flow 2: Smart Search, Typo-Tolerant Autocomplete & Real-Time Lobby Suggestions (Discovery & Custom)', async (t) => {
  await t.test('Typo-tolerant smart search and nearest-branch GPS routing resolve all 8 required queries accurately', async () => {
    const centerGps = { lat: 47.0245, lng: 28.8322, label: 'Centru, Chișinău' };
    const botanicaGps = { lat: 46.9972, lng: 28.8510, label: 'Botanica, Chișinău' };
    const riscaniGps = { lat: 47.0425, lng: 28.8605, label: 'Rîșcani, Chișinău' };

    const expectedQueries = [
      { query: 'mcdonlds', expectedCanonical: "McDonald's" },
      { query: 'andys piza', expectedCanonical: "Andy's Pizza" },
      { query: 'la placinti', expectedCanonical: 'La Plăcinte' },
      { query: 'bouling', expectedCanonical: 'Plaza Bowling & Billiards' },
      { query: 'paintbal', expectedCanonical: 'Paintball Club Legion' },
      { query: 'kfc', expectedCanonical: 'KFC' },
      { query: 'starbuks', expectedCanonical: 'Starbucks' },
      { query: 'tukano', expectedCanonical: 'Tucano Coffee' },
    ];

    for (const { query, expectedCanonical } of expectedQueries) {
      // 1. Test autocomplete suggestions
      const suggestions = clientUtils.searchCustomPlaceSuggestions(query, 'Where should we go?', [], {
        mode: 'DISCOVERY',
        category: query === 'bouling' || query === 'paintbal' ? 'activities' : 'restaurants',
      });
      assert.ok(Array.isArray(suggestions) && suggestions.length > 0, `Expected autocomplete suggestions for "${query}"`);
      assert.equal(
        suggestions[0].name,
        expectedCanonical,
        `Top autocomplete suggestion for "${query}" should be "${expectedCanonical}", got "${suggestions[0]?.name}"`
      );

      // 2. Test smart place query resolver with Centru GPS
      const resolvedCentru = clientUtils.resolveSmartPlaceQuery(query, 'Where should we go?', centerGps);
      assert.ok(resolvedCentru, `Expected resolveSmartPlaceQuery to resolve "${query}"`);
      assert.equal(resolvedCentru.canonicalName, expectedCanonical);
      assert.equal(resolvedCentru.isRoutablePlace, true);
      assert.equal(typeof resolvedCentru.lat, 'number');
      assert.equal(typeof resolvedCentru.lng, 'number');
      assert.equal(typeof resolvedCentru.distance_km, 'number');
      assert.ok(resolvedCentru.distance_km > 0 && resolvedCentru.distance_km < 15);
      assert.ok(resolvedCentru.googleMapsUrl.includes('https://www.google.com/maps/dir/'));
    }

    // Verify nearest-branch GPS routing switches dynamically based on user location for multi-branch chains
    const mcCentru = clientUtils.resolveSmartPlaceQuery('mcdonlds', 'restaurants', centerGps);
    const mcBotanica = clientUtils.resolveSmartPlaceQuery('mcdonlds', 'restaurants', botanicaGps);
    const mcRiscani = clientUtils.resolveSmartPlaceQuery('mcdonlds', 'restaurants', riscaniGps);

    assert.match(mcCentru.matchedBranchName, /Centru/i, `Expected Centru branch for Centru GPS, got ${mcCentru.matchedBranchName}`);
    assert.match(mcBotanica.matchedBranchName, /MallDova|Botanica/i, `Expected MallDova/Botanica branch for Botanica GPS, got ${mcBotanica.matchedBranchName}`);
    assert.match(mcRiscani.matchedBranchName, /Rîșcani/i, `Expected Rîșcani branch for Rîșcani GPS, got ${mcRiscani.matchedBranchName}`);
    assert.notEqual(mcCentru.lat, mcBotanica.lat, 'Nearest branch coordinates must adapt to user GPS');
  });

  await t.test('Socket.io add_custom_suggestion & remove_custom_suggestion work in both DISCOVERY and CUSTOM rooms and parseRoomOptions places group-added venues at the front of the deck', async () => {
    for (const roomMode of ['DISCOVERY', 'CUSTOM']) {
      const hostId = `host-${roomMode.toLowerCase()}-${Date.now()}`;
      const guestId = `guest-${roomMode.toLowerCase()}-${Date.now()}`;

      const createRes = await fetch(`${baseUrl}/api/v1/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: hostId,
          device_id: `dev-host-${roomMode}`,
          mode: roomMode,
          theme: roomMode === 'DISCOVERY' ? 'restaurants' : 'Where should we eat tonight?',
          latitude: 47.0245,
          longitude: 28.8322,
          radius: 5000,
          is_exact_gps: true,
        }),
      });
      assert.equal(createRes.status, 201);
      const room = await createRes.json();
      const { pin, host_token } = room;

      const hostSocket = await createSocketClient(baseUrl).connect();
      const guestSocket = await createSocketClient(baseUrl).connect();

      try {
        hostSocket.emit('join_lobby', {
          pin,
          participant_id: hostId,
          device_id: `dev-host-${roomMode}`,
          user_name: 'HostAlex',
          host_token,
          mode: roomMode,
        });
        await hostSocket.waitFor('lobby_state', (d) => d.pin === pin);

        guestSocket.emit('join_lobby', {
          pin,
          participant_id: guestId,
          device_id: `dev-guest-${roomMode}`,
          user_name: 'GuestMaria',
          mode: roomMode,
        });
        await guestSocket.waitFor('lobby_state', (d) => d.pin === pin);

        // Guest adds a suggestion using add_custom_suggestion (works in both DISCOVERY and CUSTOM modes!)
        hostSocket.clearHistory('suggestions_updated');
        guestSocket.emit('add_custom_suggestion', {
          pin,
          participant_id: guestId,
          suggestion: "McDonald's",
          user_name: 'GuestMaria',
        });

        const afterGuestAdd = await hostSocket.waitFor(
          'suggestions_updated',
          (d) => d.pin === pin && d.added === "McDonald's"
        );
        assert.ok(afterGuestAdd.suggestions.includes("McDonald's"));
        assert.equal(afterGuestAdd.addedBy, 'GuestMaria');

        // Host adds a second suggestion using add_suggestion
        hostSocket.clearHistory('suggestions_updated');
        hostSocket.emit('add_suggestion', {
          pin,
          participant_id: hostId,
          host_token,
          suggestion: 'Tucano Coffee',
          user_name: 'HostAlex',
        });

        const afterHostAdd = await guestSocket.waitFor(
          'suggestions_updated',
          (d) => d.pin === pin && d.added === 'Tucano Coffee'
        );
        assert.deepEqual(afterHostAdd.suggestions, ["McDonald's", 'Tucano Coffee']);

        // Verify parseRoomOptions puts group-added venues at the front of the deck with isCustom: true and addedBy
        const parsedDeck = clientUtils.parseRoomOptions({
          mode: roomMode,
          topic: room.topic,
          groupPool: afterHostAdd.suggestion_entries || afterHostAdd.suggestions,
          realOptions: room.options || [],
          category: 'restaurants',
          userGps: { lat: 47.0245, lng: 28.8322 },
        });

        assert.ok(parsedDeck.length >= 2, `Expected at least 2 options in parsedDeck for ${roomMode}`);
        const frontNames = parsedDeck.slice(0, 2).map((c) => c.name);
        assert.ok(
          frontNames.includes("McDonald's") && frontNames.includes('Tucano Coffee'),
          `Group-added venues must be at the front of the deck in ${roomMode} mode, got: ${JSON.stringify(frontNames)}`
        );
        for (const frontCard of parsedDeck.slice(0, 2)) {
          assert.equal(frontCard.isCustom, true, `Front group-added card "${frontCard.name}" must have isCustom: true`);
          assert.equal(frontCard.isGroupAdded, true, `Front group-added card "${frontCard.name}" must have isGroupAdded: true`);
          assert.ok(
            frontCard.addedBy === 'GuestMaria' || frontCard.addedBy === 'HostAlex',
            `Front group-added card "${frontCard.name}" must preserve addedBy, got "${frontCard.addedBy}"`
          );
        }

        // Verify Guest CANNOT remove a suggestion (Host-only guard)
        guestSocket.clearHistory('room_error');
        guestSocket.emit('remove_custom_suggestion', {
          pin,
          participant_id: guestId,
          suggestion: "McDonald's",
        });
        const guestRemoveErr = await guestSocket.waitFor('room_error');
        assert.match(guestRemoveErr.message, /Only the room host can remove options/i);

        // Verify Host CAN remove a suggestion via remove_custom_suggestion
        hostSocket.clearHistory('suggestions_updated');
        hostSocket.emit('remove_custom_suggestion', {
          pin,
          participant_id: hostId,
          host_token,
          suggestion: "McDonald's",
        });
        const afterHostRemove = await guestSocket.waitFor(
          'suggestions_updated',
          (d) => d.pin === pin && d.removed === "McDonald's"
        );
        assert.deepEqual(afterHostRemove.suggestions, ['Tucano Coffee']);
      } finally {
        hostSocket.close();
        guestSocket.close();
      }
    }
  });
});

test('Flow 3: Multi-User Real-Time Voting & Schulze Condorcet Consensus', async (t) => {
  await t.test('Host + Guest real-time Socket.io voting resolves Schulze Condorcet winner, pairwise breakdown, and match score', async () => {
    const hostId = `host-vote-${Date.now()}`;
    const guestId = `guest-vote-${Date.now()}`;

    const createRes = await fetch(`${baseUrl}/api/v1/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host_id: hostId,
        device_id: 'dev-host-vote',
        mode: 'DISCOVERY',
        theme: 'restaurants',
        latitude: 47.0225,
        longitude: 28.8340,
        radius: 5000,
        is_exact_gps: true,
      }),
    });
    assert.equal(createRes.status, 201);
    const room = await createRes.json();
    const { pin, host_token } = room;
    const candidateOptions = room.options.slice(0, 4).map((o) => ({
      id: o.id,
      name: o.name,
      price_level: o.priceLevel || 2,
      category: 'Restaurant',
    }));
    assert.equal(candidateOptions.length, 4);

    const hostSocket = await createSocketClient(baseUrl).connect();
    const guestSocket = await createSocketClient(baseUrl).connect();

    try {
      hostSocket.emit('join_lobby', {
        pin,
        participant_id: hostId,
        device_id: 'dev-host-vote',
        user_name: 'HostAlex',
        host_token,
      });
      await hostSocket.waitFor('lobby_state', (d) => d.pin === pin);

      guestSocket.emit('join_lobby', {
        pin,
        participant_id: guestId,
        device_id: 'dev-guest-vote',
        user_name: 'GuestElena',
      });
      await guestSocket.waitFor('lobby_state', (d) => d.pin === pin && d.participants.length === 2);

      // Host starts voting using start_voting
      hostSocket.emit('start_voting', {
        pin,
        host_id: hostId,
        host_token,
        options: candidateOptions,
        topic: 'Dinner Tonight',
        mode: 'DISCOVERY',
      });

      const votingStarted = await guestSocket.waitFor('voting_started', (d) => d.pin === pin);
      assert.equal(votingStarted.options.length, 4);
      assert.equal(votingStarted.total_participants, 2);

      const [optA, optB, optC, optD] = candidateOptions;

      // Host submits ballot: Superlikes optB (2), Likes optA (1), Passes optC (-1), Passes optD (-1)
      hostSocket.emit('submit_Votes', {
        pin,
        participant_id: hostId,
        device_id: 'dev-host-vote',
        rankings: [
          { option_id: optA.id, score: 1 },
          { option_id: optB.id, score: 2 },
          { option_id: optC.id, score: -1 },
          { option_id: optD.id, score: -1 },
        ],
      });

      const progress1 = await guestSocket.waitFor('vote_progress', (d) => d.voted_participants === 1);
      assert.equal(progress1.total_participants, 2);

      // Guest also persists votes via REST POST /api/v1/rooms/:pin/votes and submits real-time ballot
      const restVoteRes = await fetch(`${baseUrl}/api/v1/rooms/${pin}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: guestId,
          device_id: 'dev-guest-vote',
          rankings: [
            { option_id: optA.id, score: -1 },
            { option_id: optB.id, score: 1 },
            { option_id: optC.id, score: 2 },
            { option_id: optD.id, score: -1 },
          ],
        }),
      });
      assert.equal(restVoteRes.status, 200);

      guestSocket.emit('submit_ballot', {
        pin,
        participant_id: guestId,
        device_id: 'dev-guest-vote',
        rankings: [
          { option_id: optA.id, score: -1 },
          { option_id: optB.id, score: 1 },
          { option_id: optC.id, score: 2 },
          { option_id: optD.id, score: -1 },
        ],
      });

      // Both consensus_reached and winner_announced should fire with optB as the Condorcet winner
      // (optB beats optA 2-0, ties optC 1-1 in pairwise but has 2 approvals vs 1 approval and higher total score 3 vs 1)
      const [consensusHost, winnerGuest] = await Promise.all([
        hostSocket.waitFor('consensus_reached', (d) => d.pin === pin),
        guestSocket.waitFor('winner_announced', (d) => d.pin === pin),
      ]);

      assert.equal(consensusHost.winningOptionId, optB.id);
      assert.equal(consensusHost.winner.name, optB.name);
      assert.equal(consensusHost.total_voted, 2);
      assert.equal(consensusHost.approval_count, 2);
      assert.ok(consensusHost.matchScore >= 90, `Expected high matchScore for unanimous approval, got ${consensusHost.matchScore}`);
      assert.ok(Array.isArray(consensusHost.pairwise) && consensusHost.pairwise.length === 3);
      assert.equal(winnerGuest.winningOptionId, optB.id);
    } finally {
      hostSocket.close();
      guestSocket.close();
    }
  });

  await t.test('Veto (-100) elimination and 3-voter Condorcet tie-break handling over live sockets', async () => {
    const hostId = `host-tie-${Date.now()}`;
    const guest1Id = `guest1-tie-${Date.now()}`;
    const guest2Id = `guest2-tie-${Date.now()}`;

    const createRes = await fetch(`${baseUrl}/api/v1/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host_id: hostId,
        device_id: 'dev-host-tie',
        mode: 'CUSTOM',
        theme: 'What activity tonight?',
      }),
    });
    assert.equal(createRes.status, 201);
    const { pin, host_token } = await createRes.json();

    const options = [
      { id: `${pin}:opt-vetoed`, name: 'Vetoed Spot', category: 'Activity' },
      { id: `${pin}:opt-bowling`, name: 'Plaza Bowling MallDova', category: 'Bowling & Billiards' },
      { id: `${pin}:opt-karting`, name: 'Karting Club Moldova', category: 'Go-Kart Racing Track' },
    ];

    const sHost = await createSocketClient(baseUrl).connect();
    const sGuest1 = await createSocketClient(baseUrl).connect();
    const sGuest2 = await createSocketClient(baseUrl).connect();

    try {
      sHost.emit('join_lobby', { pin, participant_id: hostId, device_id: 'dev-host-tie', user_name: 'Host', host_token });
      await sHost.waitFor('lobby_state', (d) => d.pin === pin);

      sGuest1.emit('join_lobby', { pin, participant_id: guest1Id, device_id: 'dev-guest1-tie', user_name: 'Guest1' });
      await sGuest1.waitFor('lobby_state', (d) => d.pin === pin && d.participants.length >= 2);

      sGuest2.emit('join_lobby', { pin, participant_id: guest2Id, device_id: 'dev-guest2-tie', user_name: 'Guest2' });
      await sGuest2.waitFor('lobby_state', (d) => d.pin === pin && d.participants.length === 3);

      sHost.emit('host_start_voting', {
        pin,
        host_id: hostId,
        host_token,
        options,
        mode: 'CUSTOM',
        topic: 'What activity tonight?',
      });
      await sGuest2.waitFor('voting_started', (d) => d.pin === pin);

      // 2 of 3 voters superlike `${pin}:opt-vetoed`, but Guest2 vetoes it (-100).
      // Between `${pin}:opt-bowling` and `${pin}:opt-karting`, `${pin}:opt-bowling` wins 2-1.
      sHost.emit('submit_ballot', {
        pin,
        participant_id: hostId,
        rankings: [
          { option_id: `${pin}:opt-vetoed`, score: 2 },
          { option_id: `${pin}:opt-bowling`, score: 1 },
          { option_id: `${pin}:opt-karting`, score: -1 },
        ],
      });

      sGuest1.emit('submit_ballot', {
        pin,
        participant_id: guest1Id,
        rankings: [
          { option_id: `${pin}:opt-vetoed`, score: 2 },
          { option_id: `${pin}:opt-bowling`, score: -1 },
          { option_id: `${pin}:opt-karting`, score: 1 },
        ],
      });

      sGuest2.emit('submit_ballot', {
        pin,
        participant_id: guest2Id,
        rankings: [
          { option_id: `${pin}:opt-vetoed`, score: -100 }, // Hard veto eliminates opt-vetoed!
          { option_id: `${pin}:opt-bowling`, score: 2 },
          { option_id: `${pin}:opt-karting`, score: 1 },
        ],
      });

      const consensus = await sHost.waitFor('consensus_reached', (d) => d.pin === pin);
      assert.equal(
        consensus.winningOptionId,
        `${pin}:opt-bowling`,
        `Hard veto (-100) must eliminate opt-vetoed and elect Condorcet winner opt-bowling, got ${consensus.winningOptionId}`
      );
      assert.equal(consensus.winner.name, 'Plaza Bowling MallDova');
      assert.equal(consensus.total_voted, 3);
    } finally {
      sHost.close();
      sGuest1.close();
      sGuest2.close();
    }
  });
});
