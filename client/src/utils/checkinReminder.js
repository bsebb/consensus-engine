const PENDING_CHECKIN_KEY = 'consensus_pending_checkin';

export function hasUserRatedSession(pin, winnerName) {
  if (typeof localStorage === 'undefined') return null;
  try {
    const feedbacks = JSON.parse(localStorage.getItem('consensus_feedbacks') || '[]');
    if (!Array.isArray(feedbacks)) return null;
    const cleanWinner = String(winnerName || '').toLowerCase().trim();
    return (
      feedbacks.find(
        (fb) =>
          (pin && fb.pin && String(fb.pin) === String(pin)) ||
          (cleanWinner &&
            String(fb.winner_name || fb.option_name || '').toLowerCase().trim() === cleanWinner)
      ) || null
    );
  } catch {
    return null;
  }
}

export function recordLocalFeedback({
  pin,
  winnerName,
  optionId,
  participantId,
  deviceId,
  satisfactionScore = 5,
  priceAccuracyScore = 5,
  comment = '',
}) {
  if (typeof localStorage === 'undefined') return;
  try {
    const stored = JSON.parse(localStorage.getItem('consensus_feedbacks') || '[]');
    const list = Array.isArray(stored) ? stored : [];
    const cleanWinner = String(winnerName || 'Consensus Pick').trim();
    const filtered = list.filter(
      (fb) =>
        !(
          (pin && fb.pin && String(fb.pin) === String(pin)) ||
          String(fb.winner_name || fb.option_name || '').toLowerCase().trim() === cleanWinner.toLowerCase()
        )
    );
    filtered.unshift({
      participant_id: participantId || 'anon_user',
      device_id: deviceId || undefined,
      option_id: optionId || `winner_${pin || 'local'}`,
      option_name: cleanWinner,
      winner_name: cleanWinner,
      satisfaction_score: Number(satisfactionScore) || 5,
      price_accuracy_score: Number(priceAccuracyScore) || Number(satisfactionScore) || 5,
      comment: String(comment || '').trim(),
      pin: pin ? String(pin) : undefined,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem('consensus_feedbacks', JSON.stringify(filtered.slice(0, 50)));

    const pending = getPendingCheckin();
    if (
      pending &&
      ((pin && String(pending.pin) === String(pin)) ||
        String(pending.winnerName || '').toLowerCase().trim() === cleanWinner.toLowerCase())
    ) {
      localStorage.removeItem(PENDING_CHECKIN_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function savePendingCheckin({ pin, winnerName, optionId, delayMinutes = 90 }) {
  if (typeof localStorage === 'undefined' || !winnerName) return null;
  if (hasUserRatedSession(pin, winnerName)) return null;
  try {
    const existing = getPendingCheckin();
    if (existing && existing.pin === pin && existing.reminderRequested) {
      return existing;
    }
    const payload = {
      pin: String(pin || ''),
      winnerName: String(winnerName).trim(),
      optionId: optionId || `winner_${pin || 'local'}`,
      createdAt: Date.now(),
      dueAt: Date.now() + delayMinutes * 60 * 1000,
      reminderRequested: false,
      notified: false,
    };
    localStorage.setItem(PENDING_CHECKIN_KEY, JSON.stringify(payload));
    return payload;
  } catch {
    return null;
  }
}

export function getPendingCheckin() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PENDING_CHECKIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.winnerName) return null;
    if (hasUserRatedSession(parsed.pin, parsed.winnerName)) {
      localStorage.removeItem(PENDING_CHECKIN_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function schedulePostVisitReminder({ pin, winnerName, optionId, delayMinutes = 90 }) {
  const payload = {
    pin: String(pin || ''),
    winnerName: String(winnerName || 'your group pick').trim(),
    optionId: optionId || `winner_${pin || 'local'}`,
    createdAt: Date.now(),
    dueAt: Date.now() + delayMinutes * 60 * 1000,
    reminderRequested: true,
    notified: false,
  };
  try {
    localStorage.setItem(PENDING_CHECKIN_KEY, JSON.stringify(payload));
  } catch {}

  let permissionGranted = false;
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      permissionGranted = true;
    } else if (Notification.permission !== 'denied') {
      try {
        const res = await Notification.requestPermission();
        permissionGranted = res === 'granted';
      } catch {}
    }
  }

  if (
    permissionGranted &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    navigator.serviceWorker.controller
  ) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_CHECKIN_REMINDER',
        pin: payload.pin,
        winnerName: payload.winnerName,
        delayMs: delayMinutes * 60 * 1000,
      });
    } catch {}
  }

  return { scheduled: true, permissionGranted, payload };
}
