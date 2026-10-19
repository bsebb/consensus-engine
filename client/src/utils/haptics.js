/**
 * Universal Haptics and Natural Acoustic Feedback Engine
 * Combines hardware vibration (Android/Chrome) and native WebKit Taptic Engine (iOS)
 * with organic, physical acoustic UI transients (low-frequency mechanical clicks, wooden taps, and warm bell harmonics).
 * Works offline, requires zero external audio assets, and respects user preference toggle.
 */

let audioCtx = null;
let silentAudioEl = null;
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
 * Native iOS Taptic Engine trigger via persistent off-screen WebKit switch input.
 * Avoids display:none which disables WebKit accessibility/taptic pipeline.
 */
function getPersistentSwitchInput() {
  if (typeof document === 'undefined') return null;
  if (!persistentSwitchInput || !persistentSwitchInput.isConnected) {
    try {
      const container = document.createElement('div');
      container.setAttribute('aria-hidden', 'true');
      container.style.cssText = 'position:fixed;top:-200px;left:-200px;width:2px;height:2px;opacity:0.001;pointer-events:none;overflow:hidden;z-index:-999;';
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      label.appendChild(input);
      container.appendChild(label);
      const parent = document.body || document.documentElement;
      if (parent) {
        parent.appendChild(container);
        persistentSwitchInput = input;
      }
    } catch {}
  }
  return persistentSwitchInput;
}

function triggerIosTaptic() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  try {
    const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (!isTouch) return;
    const input = getPersistentSwitchInput();
    if (input) {
      input.checked = !input.checked;
      input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  } catch {}
}

export function initAudioContext() {
  if (typeof window === 'undefined') return null;
  unlockIosAudioSession();
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
 * Organic mechanical micro-click (140Hz -> 50Hz in 9ms)
 * Simulates a high-end physical rotary wheel tick or camera shutter click.
 */
export function playSelectionTick() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.009);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.009);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.011);
  } catch {}
}

/**
 * Tactile acoustic tap (180Hz -> 80Hz in 12ms)
 * Subdued, pleasant bubble pop for button presses.
 */
export function playTapTick() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.012);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.014);
  } catch {}
}

/**
 * Warm physical card slide flick for Like swipe
 * Dual-tone soft wooden slide (220Hz / 170Hz), 30ms decay.
 */
export function playSwipeRightSound() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(170, now + 0.03);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  } catch {}
}

/**
 * Soft felt thumb flick for Pass swipe (105Hz -> 55Hz, 16ms)
 * Warm, non-intrusive muted thud.
 */
export function playSwipeLeftSound() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(105, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.016);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.02);
  } catch {}
}

/**
 * Muted wooden double-knock for Veto action (75Hz & 58Hz knocks)
 * Organic acoustic wood knock instead of harsh electronic buzzers.
 */
export function playVetoSound() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    [0, 0.045].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + offset;
      const freq = idx === 0 ? 75 : 58;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(35, start + 0.018);

      gain.gain.setValueAtTime(0.16, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.02);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.022);
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
