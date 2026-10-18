/**
 * Universal Haptics and Acoustic Feedback Engine
 * Combines navigator.vibrate (Android) with low-latency Web Audio API synthesis (iOS Safari, Mac, Desktop).
 * Works offline, requires zero external audio assets, and respects user preference toggle.
 */

let audioCtx = null;

export function initAudioContext() {
  if (typeof window === 'undefined') return null;
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
    if (audioCtx) {
      const buffer = audioCtx.createBuffer(1, 1, 22050);
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start(0);
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
 * 950Hz crisp acoustic micro-tick for subtle tap feedback
 */
export function playTapTick() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.02);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.022);
  } catch {}
}

/**
 * Warm ascending two-tone chime for Like swipe (480Hz -> 760Hz)
 */
export function playSwipeRightSound() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.12);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  } catch {}
}

/**
 * Soft damped pop for Pass swipe (260Hz -> 130Hz)
 */
export function playSwipeLeftSound() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.10);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.105);
  } catch {}
}

/**
 * Muted low thud for Veto action (180Hz -> 50Hz)
 */
export function playVetoSound() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  } catch {}
}

/**
 * Bright harmonic triad for Superlike / Favorite
 */
export function playSuperlikeSound() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    const notes = [440, 660, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.04;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.13);
    });
  } catch {}
}

/**
 * Euphoric multi-note fanfare for Consensus Winner reveal
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
      const start = now + idx * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.36);
    });
  } catch {}
}

/**
 * Universal haptic trigger combining vibration and synthesized acoustic feedback
 * @param {'tap'|'like'|'pass'|'veto'|'superlike'|'match'} type
 */
export function triggerHaptic(type = 'tap') {
  if (!isHapticsEnabled()) return;

  // 1. Hardware vibration for Android / supported mobile devices
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (type === 'tap') navigator.vibrate(12);
      else if (type === 'like') navigator.vibrate([15, 30, 20]);
      else if (type === 'pass') navigator.vibrate(22);
      else if (type === 'veto') navigator.vibrate([35, 30, 35]);
      else if (type === 'superlike') navigator.vibrate([25, 35, 45]);
      else if (type === 'match') navigator.vibrate([45, 50, 70, 50, 110]);
    } catch {}
  }

  // 2. Synthesized acoustic feedback for iOS Safari, macOS, and Desktop
  if (type === 'tap') playTapTick();
  else if (type === 'like') playSwipeRightSound();
  else if (type === 'pass') playSwipeLeftSound();
  else if (type === 'veto') playVetoSound();
  else if (type === 'superlike') playSuperlikeSound();
  else if (type === 'match') playMatchChime();
}
