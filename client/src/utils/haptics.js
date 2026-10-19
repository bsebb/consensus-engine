/**
 * Universal Haptics and Natural Acoustic Feedback Engine
 * Combines hardware vibration (Android/Chrome) and native WebKit Taptic Engine (iOS)
 * with organic, physical acoustic UI transients (low-frequency mechanical clicks, wooden taps, and warm bell harmonics).
 * Works offline, requires zero external audio assets, and respects user preference toggle.
 */

let audioCtx = null;
let silentAudioEl = null;
let persistentSwitchLabel = null;
let persistentSwitchInput = null;

function unlockIosAudioSession() {
  if (typeof window === 'undefined') return;
  try {
    if (!silentAudioEl) {
      silentAudioEl = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
      silentAudioEl.volume = 0.001;
      silentAudioEl.setAttribute('playsinline', 'true');
    }
    silentAudioEl.play().catch(() => {});
  } catch {}
}

/**
 * Native iOS Taptic Engine trigger via persistent off-screen WebKit switch input label.
 * WebKit routes label.click() directly to UIKit UIImpactFeedbackGenerator on iOS 17.4+.
 */
function getPersistentSwitchElements() {
  if (typeof document === 'undefined') return null;
  if (!persistentSwitchLabel || !persistentSwitchLabel.isConnected) {
    try {
      const container = document.createElement('div');
      container.setAttribute('aria-hidden', 'true');
      container.style.cssText = 'position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0.01;overflow:hidden;pointer-events:auto;z-index:99999;';
      const label = document.createElement('label');
      label.style.cssText = 'display:block;width:100%;height:100%;cursor:pointer;pointer-events:auto;';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.style.cssText = 'opacity:0.01;width:100%;height:100%;cursor:pointer;pointer-events:auto;';
      label.appendChild(input);
      container.appendChild(label);
      const parent = document.body || document.documentElement;
      if (parent) {
        parent.appendChild(container);
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
    if (els?.label) {
      els.label.click();
    }
  } catch {}
}

export function initAudioContext() {
  if (typeof window === 'undefined') return null;
  try {
    unlockIosAudioSession();
  } catch {}
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch {}
  return audioCtx;
}

function getAudioContext() {
  if (!audioCtx) {
    return initAudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Automatically unlock AudioContext on any user interaction
if (typeof window !== 'undefined') {
  const unlock = () => {
    initAudioContext();
    unlockIosAudioSession();
  };
  ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, unlock, { passive: true });
  });
}

function isHapticsEnabled() {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('consensus_haptics_enabled') !== 'false';
}

/**
 * Organic mechanical micro-click
 * Simulates a high-end physical rotary wheel tick or camera shutter click.
 */
export function playSelectionTick() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.005);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.007);
  } catch {}
}

/**
 * Tactile acoustic tap
 * Subtle, pleasant physical button tap.
 */
export function playTapTick() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.006);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.008);
  } catch {}
}

/**
 * Warm physical card slide flick for Like swipe
 * Soft felt friction slide, 16ms decay.
 */
export function playSwipeRightSound() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, now);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, now);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.016);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.02);
  } catch {}
}

/**
 * Soft felt thumb flick for Pass swipe
 * Warm, non-intrusive muted thud.
 */
export function playSwipeLeftSound() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.009);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.012);
  } catch {}
}

/**
 * Muted wooden double-knock for Veto action
 * Organic acoustic wood knock.
 */
export function playVetoSound() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    [0, 0.038].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const start = now + offset;

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, start);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 80 : 64, start);

      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.01);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.012);
    });
  } catch {}
}

/**
 * Warm harmonic pair for Superlike / Favorite (587Hz & 880Hz pure sines)
 */
export function playSuperlikeSound() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    [587, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.035;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.15);
    });
  } catch {}
}

/**
 * Natural acoustic Rhodes / celesta bell chord for Consensus Winner reveal
 * C5 + E5 + G5 + C6 pure sines with soft 15ms acoustic attack and gentle 380ms decay.
 */
export function playMatchChime() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.09, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {}
}

let lastHapticTime = 0;
let lastHapticType = '';

/**
 * Universal haptic trigger combining vibration, native iOS Taptic switch, and physical acoustic feedback
 * @param {'tap'|'selection'|'light'|'like'|'pass'|'veto'|'superlike'|'match'} type
 */
export function triggerHaptic(type = 'tap') {
  if (!isHapticsEnabled()) return;

  const now = Date.now();
  if (type === lastHapticType && now - lastHapticTime < 35) {
    return;
  }
  lastHapticTime = now;
  lastHapticType = type;

  // 1. Native iOS Taptic Engine trigger
  try {
    unlockIosAudioSession();
    triggerIosTaptic();
    if (type === 'like' || type === 'superlike') {
      setTimeout(triggerIosTaptic, 90);
    } else if (type === 'veto') {
      setTimeout(triggerIosTaptic, 80);
      setTimeout(triggerIosTaptic, 160);
    } else if (type === 'match') {
      setTimeout(triggerIosTaptic, 70);
      setTimeout(triggerIosTaptic, 150);
      setTimeout(triggerIosTaptic, 240);
    }
  } catch {}

  // 2. Hardware vibration for Android / supported mobile devices
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (type === 'selection' || type === 'light') navigator.vibrate(8);
      else if (type === 'tap') navigator.vibrate(12);
      else if (type === 'like') navigator.vibrate([15, 25, 20]);
      else if (type === 'pass') navigator.vibrate(18);
      else if (type === 'veto') navigator.vibrate([30, 25, 30]);
      else if (type === 'superlike') navigator.vibrate([20, 30, 40]);
      else if (type === 'match') navigator.vibrate([40, 45, 60, 45, 100]);
    } catch {}
  }

  // 3. Natural physical acoustic UI feedback
  if (type === 'selection') playSelectionTick();
  else if (type === 'tap' || type === 'light') playTapTick();
  else if (type === 'like') playSwipeRightSound();
  else if (type === 'pass') playSwipeLeftSound();
  else if (type === 'veto') playVetoSound();
  else if (type === 'superlike') playSuperlikeSound();
  else if (type === 'match') playMatchChime();
}
