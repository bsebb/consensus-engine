/**
 * Universal Haptics and Acoustic Feedback Engine
 * Combines navigator.vibrate (Android) with low-latency Web Audio API synthesis (iOS Safari, Mac, Desktop).
 * Works offline, requires zero external audio assets, and respects user preference toggle.
 */

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Automatically unlock AudioContext on first user interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true, once: true });
  window.addEventListener('keydown', unlockAudio, { passive: true, once: true });
}

function isHapticsEnabled() {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('consensus_haptics_enabled') !== 'false';
}

/**
 * 1200Hz 8ms crisp acoustic micro-tick for subtle tap feedback
 */
export function playTapTick() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.015);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.016);
  } catch {}
}

/**
 * Warm ascending two-tone chime for Like swipe (520Hz -> 780Hz)
 */
export function playSwipeRightSound() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.11);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  } catch {}
}

/**
 * Soft damped pop for Pass swipe (240Hz -> 130Hz)
 */
export function playSwipeLeftSound() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.09);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch {}
}

/**
 * Muted low thud for Veto action (160Hz -> 55Hz)
 */
export function playVetoSound() {
  const ctx = getAudioContext();
  if (!ctx || !isHapticsEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.14);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
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
