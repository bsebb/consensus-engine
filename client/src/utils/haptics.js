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

let persistentHapticLabel = null;
let persistentHapticInput = null;

function ensurePersistentHapticSwitch() {
  if (typeof document === 'undefined' || !document.body) return null;
  if (persistentHapticLabel && persistentHapticInput) return persistentHapticLabel;

  const id = 'ios-global-haptic-switch';
  let input = document.getElementById(id);
  if (!input) {
    input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.setAttribute('switch', '');
    input.setAttribute('aria-hidden', 'true');
    input.tabIndex = -1;
    Object.assign(input.style, {
      position: 'fixed',
      bottom: '0px',
      right: '0px',
      width: '1px',
      height: '1px',
      opacity: '0.001',
      pointerEvents: 'none',
      zIndex: '-1',
    });
    document.body.appendChild(input);
  }

  let label = document.getElementById('ios-global-haptic-label');
  if (!label) {
    label = document.createElement('label');
    label.id = 'ios-global-haptic-label';
    label.htmlFor = id;
    label.setAttribute('aria-hidden', 'true');
    Object.assign(label.style, {
      position: 'fixed',
      bottom: '0px',
      right: '0px',
      width: '1px',
      height: '1px',
      opacity: '0.001',
      pointerEvents: 'none',
      zIndex: '-1',
    });
    document.body.appendChild(label);
  }

  persistentHapticInput = input;
  persistentHapticLabel = label;
  return label;
}

function fireIOSSwitch() {
  if (typeof document === 'undefined' || !document.body) return;
  try {
    const label = ensurePersistentHapticSwitch();
    if (label) {
      label.click();
    }
  } catch {}
}

/**
 * Attaches a transparent iOS native switch overlay to an element.
 * On iOS Safari/WebKit, physical user taps on an <input type="checkbox" switch>
 * trigger UIKit's UIImpactFeedbackGenerator / Taptic Engine in hardware.
 * The switch overlay captures the physical finger press while letting click
 * events bubble naturally to the parent element.
 */
export function hapticTrigger(el) {
  if (!el || typeof window === 'undefined' || typeof document === 'undefined') return;

  // Verify iOS / iPadOS WebKit platform
  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  if (!isIOS) return;
  if (el.querySelector?.('[data-haptic-trigger]')) return;

  const n = document.createElement('input');
  n.type = 'checkbox';
  n.setAttribute('switch', '');
  n.setAttribute('data-haptic-trigger', '');
  n.setAttribute('aria-hidden', 'true');
  n.tabIndex = -1;

  Object.assign(n.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    margin: '0',
    opacity: '0.0001',
    borderRadius: 'inherit',
    touchAction: 'manipulation',
    cursor: 'pointer',
    zIndex: '2',
  });
  n.style.setProperty('-webkit-tap-highlight-color', 'transparent');

  if (getComputedStyle(el).position === 'static') {
    el.style.position = 'relative';
  }

  let startY = 0;
  let didDrag = false;

  n.addEventListener(
    'pointerdown',
    (e) => {
      startY = e.clientY;
      didDrag = false;
    },
    { passive: true }
  );

  n.addEventListener(
    'pointermove',
    (e) => {
      if (Math.abs(e.clientY - startY) > 10) {
        didDrag = true;
        n.checked = false;
      }
    },
    { passive: true }
  );

  n.addEventListener(
    'pointerup',
    () => {
      if (didDrag) {
        n.checked = false;
      }
      didDrag = false;
    },
    { passive: true }
  );

  n.addEventListener(
    'pointercancel',
    () => {
      didDrag = false;
      n.checked = false;
    },
    { passive: true }
  );

  el.insertAdjacentElement('beforeend', n);
}

let isGlobalHapticsInitialized = false;

/**
 * Automatically initializes global iOS WebKit switch triggers across all interactive elements.
 * Native iOS Safari triggers UIKit UIImpactFeedbackGenerator / Taptic Engine when a physical
 * touch lands on an <input type="checkbox" switch>.
 */
export function initGlobalIosHaptics() {
  if (isGlobalHapticsInitialized || typeof window === 'undefined' || typeof document === 'undefined') return;
  isGlobalHapticsInitialized = true;

  // Unlock audio on first user touch anywhere
  window.addEventListener('pointerdown', unlockIosAudioSession, { once: true, passive: true });
  window.addEventListener('touchstart', unlockIosAudioSession, { once: true, passive: true });

  // Initialize persistent global switch
  ensurePersistentHapticSwitch();

  const selector = 'button, [role="button"], .category-tile, .spring-toggle, [data-haptic]';

  const attach = (root = document) => {
    try {
      if (!isHapticsEnabled()) return;
      if (root.nodeType === 1 && root.matches?.(selector)) {
        hapticTrigger(root);
      }
      const nodes = root.querySelectorAll?.(selector);
      if (nodes && nodes.length > 0) {
        for (let i = 0; i < nodes.length; i++) {
          hapticTrigger(nodes[i]);
        }
      }
    } catch {}
  };

  // 1. Initial pass
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => attach(document), { once: true });
  } else {
    attach(document);
  }

  // 2. React component lifecycle mutation observer
  if (typeof MutationObserver !== 'undefined' && document.body) {
    const observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const mutation = mutations[i];
        for (let j = 0; j < mutation.addedNodes.length; j++) {
          const node = mutation.addedNodes[j];
          if (node.nodeType === 1) {
            attach(node);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // 3. Capture-phase pointerdown listener as zero-latency immediate fallback
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (!isHapticsEnabled()) return;
      const target = e.target?.closest?.(selector);
      if (target) {
        hapticTrigger(target);
      }
    },
    { capture: true, passive: true }
  );
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
