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

/**
 * Triggers iOS Safari / WebKit native switch haptic pulse.
 * In iOS 17.4+ and iOS 18+, WebKit triggers UIKit's UIImpactFeedbackGenerator / Taptic Engine
 * when a user interaction toggles a native switch element via its label.
 */
function fireIOSSwitch() {
  if (typeof document === 'undefined' || !document.body) return;
  try {
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText =
      'position:fixed;top:-1000px;left:-1000px;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;opacity:0.001;pointer-events:auto;';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.style.cssText = 'pointer-events:auto;';
    label.appendChild(input);
    document.body.appendChild(label);
    label.click();
    document.body.removeChild(label);
  } catch {}
}

function triggerIosTaptic() {
  fireIOSSwitch();
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
