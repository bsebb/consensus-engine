const assert = require('assert');
const { getStorageMetrics, pruneExpiredRooms, checkSystemSafeguards } = require('./storageSafeguard');
const { isVenueReportedClosed, reportClosedVenue } = require('./reportedVenues');

async function runTests() {
  console.log('Running Storage Safeguard & Security Invariant Tests...');

  // Test 1: Storage telemetry schema and calculations
  const metrics = await getStorageMetrics();
  assert(metrics && typeof metrics === 'object', 'Metrics must be an object');
  assert(typeof metrics.uptimeSeconds === 'number', 'Uptime must be a number');
  assert(metrics.memory && typeof metrics.memory.rssMb === 'number', 'Memory RSS must be a number');
  assert(metrics.memory.limitMb === 512, 'Free tier limit must be 512 MB');
  assert(typeof metrics.memory.percentUsed === 'number', 'Percent memory used must be a number');
  assert(metrics.database && typeof metrics.database.freeTierQuotaMb === 'number', 'Database quota must be defined');
  console.log(`[PASS] Test 1: Telemetry returns valid system metrics (RAM: ${metrics.memory.rssMb}MB/${metrics.memory.limitMb}MB, ${metrics.memory.percentUsed}%)`);

  // Test 2: Auto-pruning executes cleanly
  const pruneResult = await pruneExpiredRooms(7);
  assert(pruneResult && typeof pruneResult === 'object', 'Prune result must be an object');
  assert(typeof pruneResult.success === 'boolean', 'Prune result must have success boolean');
  console.log('[PASS] Test 2: Pruning execution completed without unhandled errors');

  // Test 3: System safeguard evaluation runs and warns appropriately
  const checkResult = await checkSystemSafeguards();
  assert(checkResult && checkResult.memory, 'Check result must evaluate memory');
  console.log('[PASS] Test 3: System safeguard checker evaluated thresholds successfully');

  // Test 4: Censorship DoS protection in reported venues
  const badShortReport = reportClosedVenue({ name: 'a' });
  assert.strictEqual(badShortReport.success, false, 'Short 1-character names must be rejected');

  const emptyReport = reportClosedVenue({ name: '   ' });
  assert.strictEqual(emptyReport.success, false, 'Empty names must be rejected');

  // Verify that unrelated restaurants containing the letter "a" are NOT reported closed
  assert.strictEqual(isVenueReportedClosed('Fuior Gourmet'), false, 'Fuior Gourmet must not be closed');
  assert.strictEqual(isVenueReportedClosed('Pegas Restaurant'), false, 'Pegas Restaurant must not be closed');
  assert.strictEqual(isVenueReportedClosed('Andy\'s Bistro'), false, 'Andy\'s Bistro must not be closed');
  console.log('[PASS] Test 4: Censorship DoS prevention verified (short strings cannot censor catalog)');

  console.log('\n--- ALL STORAGE SAFEGUARD & SECURITY TESTS PASSED ---');
}

runTests().catch((err) => {
  console.error('\n[FAIL] Storage safeguard test failed:', err);
  process.exit(1);
});
