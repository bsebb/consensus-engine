import { apiUrl } from './api.js';

const STORAGE_KEY = 'consensus_reported_venues';

export function normalizeVenueKey(name = '') {
  let clean = String(name || '').toLowerCase().trim();
  clean = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  clean = clean.replace(/['’"`\-_.,/\\()&!]/g, '');
  clean = clean.replace(/\b(restaurant|restaurante|pizzeria|pizza|cafe|café|bar|pub|bistro|grill|terrace|terasa|lounge|club|la)\b/gi, '');
  return clean.replace(/\s+/g, '').trim();
}

export function getReportedVenuesList() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isVenueClosedClient(name = '') {
  if (!name) return false;
  const key = normalizeVenueKey(name);
  if (!key) return false;
  const list = getReportedVenuesList();
  return list.some((item) => item.key === key || normalizeVenueKey(item.name) === key);
}

export function markVenueClosedClient(venue) {
  if (!venue || !venue.name) return;
  const key = normalizeVenueKey(venue.name);
  const list = getReportedVenuesList();
  if (!list.some((item) => item.key === key)) {
    list.push({
      key,
      name: venue.name,
      address: venue.address || '',
      reportedAt: new Date().toISOString(),
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }

  // Fire-and-forget sync to server endpoints
  try {
    const payload = JSON.stringify({
      name: venue.name,
      address: venue.address,
      lat: venue.lat,
      lng: venue.lng,
      reason: 'permanently_closed',
    });

    fetch(apiUrl('/api/v1/venues/report-closed'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }).catch(() => {});

  } catch {}
}

export function filterOutReportedVenues(venues = []) {
  if (!Array.isArray(venues)) return [];
  const reported = getReportedVenuesList();
  if (reported.length === 0) return venues;
  const keys = new Set(reported.map((r) => r.key));
  return venues.filter((v) => {
    if (!v || !v.name) return true;
    return !keys.has(normalizeVenueKey(v.name));
  });
}
