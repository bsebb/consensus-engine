/**
 * Persistent Account-Free Device & Room Participant Identity Utility
 *
 * Provides:
 * 1. `getPersistentDeviceId()` / `getDeviceId()` - Deterministic hardware/browser
 *    fingerprint (Canvas + WebGL + Audio/Screen/Intl/Hardware traits) paired with
 *    `localStorage.getItem('nyp_device_id')` and a 400-day first-party cookie `nyp_device_id`.
 *    Enables accurate unique device counts (`COUNT(DISTINCT "deviceId")`) and 14-day repeat
 *    retention (SM-5) across rooms without requiring user accounts.
 * 2. `getRoomParticipantId(pin)` / `setRoomParticipantId(pin, id)` - Scopes `participantId`
 *    per room (`Room A` vs `Room B`) so ballots never collide across rooms on the same device.
 */

const DEVICE_STORAGE_KEY = 'nyp_device_id';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400; // 400 days (browser maximum cap)

let cachedDeviceId = null;

function readDeviceCookie() {
  if (typeof document === 'undefined' || !document.cookie) return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${DEVICE_STORAGE_KEY}=`));
  if (!match) return null;
  try {
    const val = decodeURIComponent(match.split('=')[1] || '').trim();
    return val.length >= 8 ? val : null;
  } catch {
    return null;
  }
}

function writeDeviceCookie(deviceId) {
  if (typeof document === 'undefined' || !deviceId) return;
  try {
    const secureFlag =
      typeof window !== 'undefined' && window.location?.protocol === 'https:'
        ? '; Secure'
        : '';
    document.cookie = `${DEVICE_STORAGE_KEY}=${encodeURIComponent(deviceId)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secureFlag}`;
  } catch {
    // Ignore cookie write restrictions in sandboxed frames
  }
}

function readLocalStorage(key) {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const val = window.localStorage.getItem(key);
    return val && val.trim().length >= 8 ? val.trim() : null;
  } catch {
    return null;
  }
}

function writeLocalStorage(key, value) {
  if (typeof window === 'undefined' || !window.localStorage || !value) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore quota or private browsing storage errors
  }
}

/**
 * Dual-chunk Cyrb53-inspired 128-bit deterministic string hash -> 32-char hex string
 */
function hash128Hex(str) {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  let h3 = 0x9e3779b9 ^ str.length;
  let h4 = 0x85ebca6b ^ str.length;

  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);

  const toHex8 = (n) => (n >>> 0).toString(16).padStart(8, '0');
  return `${toHex8(h1)}${toHex8(h2)}${toHex8(h3)}${toHex8(h4)}`;
}

function getCanvasSignal() {
  if (typeof document === 'undefined') return 'no-dom';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 220;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-2d';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(100, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.font = '14px "Arial", sans-serif';
    ctx.fillText('NoYouPick-FP-2026', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.font = '16px "Georgia", serif';
    ctx.fillText('ConsensusEngine', 4, 36);
    ctx.strokeStyle = '#ff007f';
    ctx.beginPath();
    ctx.arc(50, 24, 18, 0, Math.PI * 1.5, true);
    ctx.stroke();
    return canvas.toDataURL();
  } catch {
    return 'canvas-blocked';
  }
}

function getWebGLSignal() {
  if (typeof document === 'undefined') return 'no-dom';
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
      : gl.getParameter(gl.VENDOR);
    const renderer = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    const version = gl.getParameter(gl.VERSION);
    const shading = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    return [vendor, renderer, version, shading, maxTex].join('~');
  } catch {
    return 'webgl-blocked';
  }
}

function getAudioContextSignal() {
  if (typeof window === 'undefined') return 'no-window';
  try {
    const AudioCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext || window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return 'no-audio-ctx';
    const sampleRate = AudioCtx.prototype?.sampleRate || '';
    const maxChannels = AudioCtx.prototype?.destination?.maxChannelCount || '';
    return `audio:${ typeof AudioCtx }:${sampleRate}:${maxChannels}`;
  } catch {
    return 'audio-blocked';
  }
}

function computeHardwareVisitorId() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const scr = typeof screen !== 'undefined' ? screen : {};
  const intlTz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      return '';
    }
  })();

  // Use orientation-invariant screen dimensions (min x max) so portrait/landscape produces the same ID
  const w = Number(scr.width) || 0;
  const h = Number(scr.height) || 0;
  const screenDims = `${Math.min(w, h)}x${Math.max(w, h)}x${scr.colorDepth || 24}`;
  const dpr = typeof window !== 'undefined' ? Number(window.devicePixelRatio || 1).toFixed(2) : '1.00';

  const signals = [
    nav.platform || '',
    nav.hardwareConcurrency || '',
    nav.deviceMemory || '',
    nav.maxTouchPoints ?? '',
    nav.language || '',
    Array.isArray(nav.languages) ? nav.languages.join(',') : '',
    intlTz,
    new Date().getTimezoneOffset(),
    screenDims,
    dpr,
    getWebGLSignal(),
    getCanvasSignal(),
    getAudioContextSignal(),
  ].join('|#|');

  return `nyp_${hash128Hex(signals)}`;
}

/**
 * Returns a persistent, account-free device identifier (`nyp_<32-hex>`).
 * 1. Checks in-memory cache
 * 2. Checks `localStorage.getItem('nyp_device_id')` and backup cookie `nyp_device_id`
 * 3. Computes deterministic hardware/browser visitorId if missing, and writes to both stores
 */
export function getPersistentDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;

  const fromStorage = readLocalStorage(DEVICE_STORAGE_KEY);
  const fromCookie = readDeviceCookie();
  const resolved = fromStorage || fromCookie || computeHardwareVisitorId();

  cachedDeviceId = resolved;
  if (fromStorage !== resolved) writeLocalStorage(DEVICE_STORAGE_KEY, resolved);
  if (fromCookie !== resolved) writeDeviceCookie(resolved);

  return resolved;
}

export const getDeviceId = getPersistentDeviceId;

export function generateRandomUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns a room-scoped `participantId` so that a user's ballot in Room A
 * never collides with their ballot in Room B (`@@unique([participantId, optionId])`).
 * Persists per room in `localStorage` and `sessionStorage` so page refreshes or
 * browser tab restorations within the same room reuse the exact same participant record.
 */
export function getRoomParticipantId(pin) {
  const cleanPin = String(pin || '').trim();
  if (!cleanPin) {
    let sessionDefault = null;
    try {
      sessionDefault = sessionStorage.getItem('consensus_participant_id');
    } catch {}
    if (!sessionDefault) {
      sessionDefault = generateRandomUuid();
      try {
        sessionStorage.setItem('consensus_participant_id', sessionDefault);
      } catch {}
    }
    return sessionDefault;
  }

  const roomKey = `nyp_participant_id_${cleanPin}`;
  const fromLocal = readLocalStorage(roomKey);
  if (fromLocal) return fromLocal;

  try {
    const fromSession = sessionStorage.getItem(roomKey);
    if (fromSession && fromSession.trim().length >= 8) {
      writeLocalStorage(roomKey, fromSession.trim());
      return fromSession.trim();
    }
  } catch {}

  const freshId = generateRandomUuid();
  writeLocalStorage(roomKey, freshId);
  try {
    sessionStorage.setItem(roomKey, freshId);
  } catch {}
  return freshId;
}

/**
 * Updates the stored room-scoped `participantId` when the backend reconciles
 * a returning device (`(roomId, deviceId)`) to its existing participant slot.
 */
export function setRoomParticipantId(pin, participantId) {
  const cleanPin = String(pin || '').trim();
  const cleanId = String(participantId || '').trim();
  if (!cleanPin || !cleanId) return;
  const roomKey = `nyp_participant_id_${cleanPin}`;
  writeLocalStorage(roomKey, cleanId);
  try {
    sessionStorage.setItem(roomKey, cleanId);
  } catch {}
}
