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

/** Persistent private, cryptographically random device capability. Never broadcast it. */
export function getPersistentDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;
  const stored = readLocalStorage(DEVICE_STORAGE_KEY) || readDeviceCookie();
  // Legacy hardware hashes were predictable; rotate them on upgrade.
  const resolved = stored && /^v2_[0-9a-f-]{36}$/i.test(stored)
    ? stored : `v2_${generateRandomUuid()}`;
  cachedDeviceId = resolved;
  writeLocalStorage(DEVICE_STORAGE_KEY, resolved);
  writeDeviceCookie(resolved);
  return resolved;
}

export const getDeviceId = getPersistentDeviceId;

export function generateRandomUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
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
