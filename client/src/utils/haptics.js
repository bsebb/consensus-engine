/**
 * Universal Haptics and Acoustic Feedback Engine
 * Bridges Android/Chrome hardware vibration, iOS WebKit Taptic Engine,
 * and warm acoustic synthetic transients.
 */

import {
  initAudioContext,
  getAudioContext,
  unlockIosAudioSession,
  playSelectionTick,
  playTapTick,
  playSwipeRightSound,
  playSwipeLeftSound,
  playVetoSound,
  playSuperlikeSound,
  playMatchChime,
  playThemeToggleSound,
  playBubblePop,
  playReactionSend,
  playVictoryChord,
} from './audio';

export {
  initAudioContext,
  getAudioContext,
  unlockIosAudioSession,
  playSelectionTick,
  playTapTick,
  playSwipeRightSound,
  playSwipeLeftSound,
  playVetoSound,
  playSuperlikeSound,
  playMatchChime,
  playThemeToggleSound,
  playBubblePop,
  playReactionSend,
  playVictoryChord,
};

let persistentSwitchLabel = null;
let persistentSwitchInput = null;

/**
 * Persistent off-screen WebKit switch input element.
 * WebKit routes input.click() directly to UIKit UIImpactFeedbackGenerator on iOS 17.4+.
 */
function getPersistentSwitchElements() {
  if (typeof document === 'undefined') return null;
  if (!persistentSwitchInput || !persistentSwitchInput.isConnected) {
    try {
      const container = document.createElement('div');
      container.setAttribute('aria-hidden', 'true');
      container.style.cssText =
        'position:fixed;bottom:-20px;right:-20px;width:1px;height:1px;opacity:0.001;pointer-events:none;overflow:hidden;z-index:-1;';
      const label = document.createElement('label');
      label.style.cssText = 'pointer-events:auto;cursor:pointer;display:inline-block;';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.style.cssText = 'pointer-events:auto;cursor:pointer;';
      label.appendChild(input);
      container.appendChild(label);
      const root = document.body || document.documentElement;
      if (root) {
        root.appendChild(container);
        persistentSwitchLabel = label;
        persistentSwitchInput = input;
      }
    } catch {}
  }
  return { label: persistentSwitchLabel, input: persistentSwitchInput };
}

function triggerIosTaptic() {
  if (typeof document === 'undefined') return;
  try {
    const els = getPersistentSwitchElements();
    if (els?.input) {
      els.input.click();
    } else if (els?.label) {
      els.label.click();
    }
  } catch {}
}

function isHapticsEnabled() {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('consensus_haptics_enabled') !== 'false';
}

let lastHapticTime = 0;
let lastHapticType = '';

/**
 * Universal haptic trigger combining vibration, native iOS Taptic switch, and physical acoustic feedback
 * @param {'tap'|'selection'|'toggle'|'light'|'like'|'pass'|'veto'|'superlike'|'match'} type
 * @param {object} [opts]
 */
export function triggerHaptic(type = 'tap', opts = {}) {
  if (!isHapticsEnabled()) return;

  const now = Date.now();
  if (type === lastHapticType && now - lastHapticTime < 35) {
    return;
  }
  lastHapticTime = now;
  lastHapticType = type;

  // 1. Native iOS Taptic Engine trigger via WebKit Switch
  try {
    unlockIosAudioSession();
    triggerIosTaptic();
    if (type === 'like' || type === 'superlike' || type === 'reaction') {
      setTimeout(triggerIosTaptic, 85);
    } else if (type === 'veto') {
      setTimeout(triggerIosTaptic, 75);
      setTimeout(triggerIosTaptic, 150);
    } else if (type === 'match' || type === 'victory') {
      setTimeout(triggerIosTaptic, 65);
      setTimeout(triggerIosTaptic, 140);
      setTimeout(triggerIosTaptic, 220);
    }
  } catch {}

  // 2. Hardware vibration for Android / supported mobile devices
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (type === 'selection' || type === 'light' || type === 'pop') {
        navigator.vibrate(8);
      } else if (type === 'toggle') {
        navigator.vibrate(10);
      } else if (type === 'tap' || type === 'reaction') {
        navigator.vibrate(12);
      } else if (type === 'like') {
        navigator.vibrate([12, 35, 16]); // Snappy double-click
      } else if (type === 'pass') {
        navigator.vibrate(14); // Subtle tactile buzz
      } else if (type === 'veto') {
        navigator.vibrate([18, 25, 18, 25, 22]); // Firm triple detent
      } else if (type === 'superlike') {
        navigator.vibrate([14, 28, 24]); // Harmonic upward double detent
      } else if (type === 'match' || type === 'victory') {
        navigator.vibrate([25, 35, 35, 35, 55]); // Celebratory cadence
      }
    } catch {}
  }

  // 3. Natural physical acoustic UI feedback
  if (type === 'toggle') playThemeToggleSound(opts?.toDark);
  else if (type === 'selection') playSelectionTick();
  else if (type === 'tap' || type === 'light') playTapTick();
  else if (type === 'like') playSwipeRightSound();
  else if (type === 'pass') playSwipeLeftSound();
  else if (type === 'veto') playVetoSound();
  else if (type === 'superlike') playSuperlikeSound();
  else if (type === 'match') playMatchChime();
  else if (type === 'pop') playBubblePop();
  else if (type === 'reaction') playReactionSend();
  else if (type === 'victory') playVictoryChord();
}
