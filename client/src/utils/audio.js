/**
 * Universal Natural Acoustic Audio Feedback Engine
 * Organic, physical acoustic UI transients:
 * warm mechanical clicks, low-frequency wooden taps, felt slides, and harmonic bell chimes.
 * Operates offline, zero external sound assets, low memory footprint.
 */

let audioCtx = null;
let iosAudioUnlocked = false;

export function unlockIosAudioSession() {
  if (typeof window === 'undefined' || iosAudioUnlocked) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    // Play a 1-sample silent buffer via Web Audio API (zero network/CSP overhead)
    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    if (source.start) {
      source.start(0);
    }
    iosAudioUnlocked = true;
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

export function getAudioContext() {
  if (!audioCtx) {
    return initAudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Unlock Web Audio context on first user pointer/touch/key event
if (typeof window !== 'undefined') {
  const unlock = () => {
    initAudioContext();
    unlockIosAudioSession();
  };
  ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, unlock, { passive: true, once: true });
  });
}

function isAudioEnabled() {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('consensus_haptics_enabled') !== 'false';
}

/**
 * Warm mechanical rotary micro-detent click
 * Sweeps downward from 260Hz to 130Hz over 6ms with warm 480Hz lowpass filter.
 */
export function playSelectionTick() {
  const ctx = getAudioContext();
  if (!ctx || !isAudioEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(480, now);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + 0.006);

    gain.gain.setValueAtTime(0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.006);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.008);
  } catch {}
}

/**
 * Natural tactile acoustic tap
 * Soft wooden button detent with smooth 180Hz to 95Hz decay over 8ms.
 */
export function playTapTick() {
  const ctx = getAudioContext();
  if (!ctx || !isAudioEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(185, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.008);

    gain.gain.setValueAtTime(0.075, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.007);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.009);
  } catch {}
}

/**
 * Warm felt card flick for Like swipe
 * Soft friction slide with warm 200Hz to 320Hz frequency lift.
 */
export function playSwipeRightSound() {
  const ctx = getAudioContext();
  if (!ctx || !isAudioEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.016);

    gain.gain.setValueAtTime(0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.022);
  } catch {}
}

/**
 * Soft muted card slide for Pass swipe
 * Low-frequency 110Hz to 68Hz warm felt damping.
 */
export function playSwipeLeftSound() {
  const ctx = getAudioContext();
  if (!ctx || !isAudioEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(68, now + 0.011);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.011);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.014);
  } catch {}
}

/**
 * Organic wooden double-detent for Veto action
 * Two staggered acoustic impacts (80Hz and 62Hz).
 */
export function playVetoSound() {
  const ctx = getAudioContext();
  if (!ctx || !isAudioEnabled()) return;
  try {
    const now = ctx.currentTime;
    [0, 0.036].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const start = now + offset;

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, start);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 82 : 62, start);

      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.011);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.014);
    });
  } catch {}
}

/**
 * Warm harmonic pair for Superlike (587Hz D5 & 880Hz A5 pure sines)
 */
export function playSuperlikeSound() {
  const ctx = getAudioContext();
  if (!ctx || !isAudioEnabled()) return;
  try {
    const now = ctx.currentTime;
    [587.33, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.032;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.075, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.14);
    });
  } catch {}
}

/**
 * Natural acoustic Rhodes / celesta chord for Winner reveal
 * C5 + E5 + G5 + C6 pure sines with soft 14ms attack and gentle decay.
 */
export function playMatchChime() {
  const ctx = getAudioContext();
  if (!ctx || !isAudioEnabled()) return;
  try {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.055;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.085, start + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.36);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.38);
    });
  } catch {}
}

/**
 * Synthesized tactile mechanical tick for theme toggle switch
 * Dual-stage transient: crisp metal contact snap ramping down to 420Hz,
 * paired with a warm damped 140Hz cushion resonance.
 */
export function playThemeToggleSound(toDark = true) {
  const ctx = getAudioContext();
  if (!ctx || !isAudioEnabled()) return;
  try {
    const now = ctx.currentTime;

    // 1. Crisp mechanical latch transient
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(toDark ? 1650 : 2100, now);
    filter.Q.setValueAtTime(2.8, now);

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(toDark ? 680 : 820, now);
    osc1.frequency.exponentialRampToValueAtTime(180, now + 0.010);

    gain1.gain.setValueAtTime(0.09, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.010);

    osc1.connect(filter);
    filter.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.012);

    // 2. Low-frequency body resonance (felt cushion)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(toDark ? 140 : 160, now);
    osc2.frequency.exponentialRampToValueAtTime(80, now + 0.014);

    gain2.gain.setValueAtTime(0.06, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.014);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now);
    osc2.stop(now + 0.016);
  } catch {}
}

/**
 * Organic ascending bubble pop for participant entry & reaction bubbles
 * Quick 320Hz to 680Hz sweep with warm soft envelope (18ms).
 */
export function playBubblePop() {
  const ctx = getAudioContext();
  if (!ctx || !isAudioEnabled()) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(540, now);
    filter.Q.setValueAtTime(2.2, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.018);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.024);
  } catch {}
}

/**
 * Uplifting sparkle ping for sending a reaction
 * Staggered bell pair at 880Hz (A5) and 1320Hz (E6).
 */
export function playReactionSend() {
  const ctx = getAudioContext();
  if (!ctx || !isAudioEnabled()) return;
  try {
    const now = ctx.currentTime;
    [880, 1318.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.024;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.07, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.13);
    });
  } catch {}
}

/**
 * Rich celebratory party victory chord for consensus reveal
 * Voiced harmonic cascade: C4, G4, C5, E5, G5, C6 with gentle acoustic envelope.
 */
export function playVictoryChord() {
  const ctx = getAudioContext();
  if (!ctx || !isAudioEnabled()) return;
  try {
    const now = ctx.currentTime;
    const chord = [261.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const start = now + idx * 0.038;

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, start);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.065, start + 0.016);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.52);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.55);
    });
  } catch {}
}
