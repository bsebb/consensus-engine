const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const REPORTED_FILE = path.join(DATA_DIR, 'reported_closed.json');

function normalizeVenueKey(name = '') {
  let clean = String(name || '').toLowerCase().trim();
  clean = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  clean = clean.replace(/['’"`\-_.,/\\()&!]/g, '');
  clean = clean.replace(/\b(restaurant|restaurante|pizzeria|pizza|cafe|café|bar|pub|bistro|grill|terrace|terasa|lounge|club|la)\b/gi, '');
  return clean.replace(/\s+/g, '').trim();
}

// In-memory set of closed venue keys for 0ms filtering
const closedVenueKeys = new Set();
// Historical list of permanently defunct venues that must never appear
const DEFAULT_DEFUNCT = [
  'casamare',
  'casadaca',
  'smokehouse',
  'barbar',
  'propaganda',
  'hostariaamarcord',
  'theyorkpub',
  'morimoto',
  'ava1727',
  'havanamama',
  'patriaodeon',
  'patriariscan',
  'patriariscani',
  'patriarascani',
  'patriamuscova',
  'patriamoscova',
  'gaudeamus',
  'flacara',
];

DEFAULT_DEFUNCT.forEach((k) => closedVenueKeys.add(k));

function loadReportedFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(REPORTED_FILE)) {
      const raw = fs.readFileSync(REPORTED_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item && item.key) closedVenueKeys.add(item.key);
          if (item && item.name) closedVenueKeys.add(normalizeVenueKey(item.name));
        });
      }
    }
  } catch (err) {
    console.warn('[ReportedVenues] Could not load reported_closed.json:', err.message);
  }
}

loadReportedFile();

function persistReport(reportItem) {
  try {
    let existing = [];
    if (fs.existsSync(REPORTED_FILE)) {
      existing = JSON.parse(fs.readFileSync(REPORTED_FILE, 'utf8'));
    }
    existing.push(reportItem);
    fs.writeFileSync(REPORTED_FILE, JSON.stringify(existing, null, 2), 'utf8');
  } catch (err) {
    console.warn('[ReportedVenues] Could not persist reported venue:', err.message);
  }
}

function reportClosedVenue({ name = '', address = '', lat = null, lng = null, reason = 'permanently_closed' }) {
  if (typeof name !== 'string' || name.trim().length < 3) {
    return { success: false, error: 'Venue name must be at least 3 characters' };
  }
  const normKey = normalizeVenueKey(name);
  if (!normKey || normKey.length < 3) {
    return { success: false, error: 'Invalid venue identifier' };
  }

  closedVenueKeys.add(normKey);

  const reportItem = {
    key: normKey,
    name: String(name).trim().slice(0, 100),
    address: String(address || '').trim().slice(0, 150),
    lat: lat != null && !isNaN(Number(lat)) ? Number(lat) : null,
    lng: lng != null && !isNaN(Number(lng)) ? Number(lng) : null,
    reason: String(reason || 'permanently_closed').slice(0, 50),
    reportedAt: new Date().toISOString(),
  };

  persistReport(reportItem);
  return { success: true, venue: name, key: normKey };
}

function isVenueReportedClosed(name = '', lat = null, lng = null) {
  const normKey = normalizeVenueKey(name);
  if (!normKey || normKey.length < 3) return false;
  if (closedVenueKeys.has(normKey)) return true;

  // Exact prefix match only allowed for verified long keys (>= 7 chars)
  for (const defunct of closedVenueKeys) {
    if (defunct.length >= 7 && normKey.startsWith(defunct)) {
      return true;
    }
  }
  return false;
}

function filterReportedVenues(venues = []) {
  if (!Array.isArray(venues)) return [];
  return venues.filter((v) => {
    const venueName = v.name || v.displayName || '';
    return !isVenueReportedClosed(venueName, v.lat, v.lng);
  });
}

function getReportedVenuesCount() {
  return closedVenueKeys.size;
}

module.exports = {
  reportClosedVenue,
  isVenueReportedClosed,
  filterReportedVenues,
  getReportedVenuesCount,
  normalizeVenueKey,
};
