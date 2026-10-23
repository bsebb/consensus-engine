import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldDismissDrawer } from './drawerMotion.js';

test('deliberate downward pulls dismiss, even when released slowly', () => {
  assert.equal(shouldDismissDrawer({ distance: 110, velocity: 0 }), true);
});
test('a short flick dismisses but a tap or short slow drag snaps back', () => {
  assert.equal(shouldDismissDrawer({ distance: 45, velocity: 0.8 }), true);
  assert.equal(shouldDismissDrawer({ distance: 10, velocity: 1 }), false);
  assert.equal(shouldDismissDrawer({ distance: 45, velocity: 0 }), false);
});
test('cancellation and upward gestures never dismiss', () => {
  assert.equal(shouldDismissDrawer({ distance: 140, velocity: 1, cancelled: true }), false);
  assert.equal(shouldDismissDrawer({ distance: -100, velocity: -1 }), false);
});
