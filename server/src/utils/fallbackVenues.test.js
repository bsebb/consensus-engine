const assert = require('assert');
const { resolveRegionalFallback, calculateDistance } = require('./fallbackVenues');
const { discoverDiscoveryVenues, buildOptionRecords } = require('../services/venueDiscoveryService');

async function runTests() {
  console.log('Running Fallback Venues & Spatial Discovery Tests...');

  // Test 1: Chișinău restaurant search returns at least 30 venues
  const chisinauPlaces = await resolveRegionalFallback('restaurant', 47.0225, 28.8340, true, 30, 5000);
  assert.strictEqual(chisinauPlaces.length, 30, `Expected exactly 30 venues for Chișinău search, got ${chisinauPlaces.length}`);
  console.log('[PASS] Test 1: Chișinău restaurant search returns 30 venues');

  // Test 2: ZERO venues from Strășeni in Chișinău search
  const straseniInChisinau = chisinauPlaces.filter((p) => {
    const addr = (p.address || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    const loc = (p.locality || '').toLowerCase();
    return addr.includes('strășeni') || addr.includes('straseni') || name.includes('straseni') || loc === 'strășeni';
  });
  assert.strictEqual(straseniInChisinau.length, 0, `Expected 0 Strășeni venues in Chișinău search, found: ${straseniInChisinau.map(v => v.name).join(', ')}`);
  console.log('[PASS] Test 2: Zero Strășeni venues leaked into Chișinău search');

  // Test 3: All Chișinău venues are within acceptable metropolitan bounds (<= 12km)
  for (const place of chisinauPlaces) {
    assert(place.distance_meters <= 12000, `Venue ${place.name} is too far: ${place.distance_meters}m`);
    assert(typeof place.name === 'string' && place.name.length > 0, `Venue has invalid name: ${place.name}`);
    assert(typeof place.lat === 'number' && typeof place.lng === 'number', `Venue ${place.name} missing coords`);
    assert(place.priceLevel >= 1 && place.priceLevel <= 4, `Venue ${place.name} invalid priceLevel: ${place.priceLevel}`);
  }
  console.log('[PASS] Test 3: All Chișinău venues within spatial bounds and have valid schema');

  // Test 4: Strășeni search returns Strășeni venues and 0 Chișinău venues
  const straseniPlaces = await resolveRegionalFallback('restaurant', 47.1420, 28.6130, true, 4, 5000);
  assert(straseniPlaces.length >= 3, `Expected at least 3 venues in Strășeni, got ${straseniPlaces.length}`);
  const chisInStraseni = straseniPlaces.filter(p => (p.locality || '').toLowerCase() === 'chișinău');
  assert.strictEqual(chisInStraseni.length, 0, `Expected 0 Chișinău venues in Strășeni search, got ${chisInStraseni.length}`);
  console.log('[PASS] Test 4: Strășeni local search returns local venues only');

  // Test 5: Options builder formats composite googlePlaceId correctly
  const mockPlaces = [
    {
      name: 'Test Venue',
      fsq_id: 'test_123',
      category: 'Bistro',
      priceLevel: 2,
      lat: 47.02,
      lng: 28.83,
      distance_km: 0.5,
      address: 'Str. Test 10, Chișinău',
      photo_url: 'https://images.example.com/photo.jpg',
    }
  ];
  const optionRecords = buildOptionRecords(mockPlaces, 'room_abc');
  assert.strictEqual(optionRecords.length, 1);
  assert.strictEqual(optionRecords[0].name, 'Test Venue');
  assert.strictEqual(optionRecords[0].roomId, 'room_abc');
  assert.strictEqual(optionRecords[0].priceLevel, 2);
  assert(optionRecords[0].googlePlaceId.startsWith('test_123|0.5|Str. Test 10, Chișinău|Bistro|47.02,28.83|'));
  console.log('[PASS] Test 5: Option records composite ID formatted accurately');

  // Test 6: Chișinău restaurant search supports up to 50 venues
  const largePool = await resolveRegionalFallback('restaurant', 47.0225, 28.8340, true, 50, 5000);
  assert(largePool.length >= 45, `Expected at least 45 venues for 50-target search, got ${largePool.length}`);
  const activityPlaces = await resolveRegionalFallback('activities', 47.0225, 28.8340, true, 15, 5000);
  assert(activityPlaces.length >= 10, `Expected at least 10 activities, got ${activityPlaces.length}`);
  console.log(`[PASS] Test 6: Chișinău pool scales up to 50 venues (${largePool.length} venues returned) and activities (${activityPlaces.length})`);

  console.log('\n--- ALL FALLBACK & DISCOVERY TESTS PASSED SUCCESSFULLY ---');
}

runTests().catch((err) => {
  console.error('\n[FAIL] Test error:', err);
  process.exit(1);
});
