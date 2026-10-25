/**
 * Universal Geolocation, Reverse Geocoder & Hexagonal Grid Anchor Resolver.
 * Works in any city, town, or neighborhood without clamping to a single city.
 */
import { formatRegionalDistance } from './regionFormat';

/**
 * Haversine distance in kilometers between two coordinates.
 */
export function calculateDistanceKm(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const nLat1 = Number(lat1);
  const nLng1 = Number(lng1);
  const nLat2 = Number(lat2);
  const nLng2 = Number(lng2);
  if (isNaN(nLat1) || isNaN(nLng1) || isNaN(nLat2) || isNaN(nLng2)) return null;

  const R = 6371; // km
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLng = ((nLng2 - nLng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(0.1, Number((R * c).toFixed(1)));
}

// Known prominent urban centers for instant 0ms autocomplete and accurate centroid anchoring
export const POPULAR_LOCATIONS = [
  { title: 'Chișinău', subtitle: 'Moldova', label: 'Chișinău, Moldova', lat: 47.0245, lng: 28.8322, type: 'city' },
  { title: 'Bălți', subtitle: 'Moldova', label: 'Bălți, Moldova', lat: 47.7617, lng: 27.9289, type: 'city' },
  { title: 'Strășeni', subtitle: 'Moldova', label: 'Strășeni, Moldova', lat: 47.1414, lng: 28.6108, type: 'city' },
  { title: 'Orhei', subtitle: 'Moldova', label: 'Orhei, Moldova', lat: 47.3853, lng: 28.8242, type: 'city' },
  { title: 'New York', subtitle: 'New York, USA', label: 'New York, NY, USA', lat: 40.7128, lng: -74.0060, type: 'city' },
  { title: 'Jersey City', subtitle: 'New Jersey, USA', label: 'Jersey City, NJ, USA', lat: 40.7178, lng: -74.0431, type: 'city' },
  { title: 'London', subtitle: 'United Kingdom', label: 'London, UK', lat: 51.5074, lng: -0.1278, type: 'city' },
  { title: 'Paris', subtitle: 'France', label: 'Paris, France', lat: 48.8566, lng: 2.3522, type: 'city' },
  { title: 'Berlin', subtitle: 'Germany', label: 'Berlin, Germany', lat: 52.5200, lng: 13.4050, type: 'city' },
  { title: 'Madrid', subtitle: 'Spain', label: 'Madrid, Spain', lat: 40.4168, lng: -3.7038, type: 'city' },
  { title: 'Bucharest', subtitle: 'Romania', label: 'Bucharest, Romania', lat: 44.4268, lng: 26.1025, type: 'city' },
];

/**
 * Reverse-geocodes (lat, lng) into a concise human-readable city label
 * using OpenStreetMap Nominatim, never mangling clean cities into raw sector names.
 */
export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=14&accept-language=en,ro`,
      {
        headers: { Accept: 'application/json', 'User-Agent': 'ConsensusEngine/2.0' },
        signal: AbortSignal.timeout ? AbortSignal.timeout(3500) : undefined,
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.address || {};
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      '';
    const state = addr.state || addr.county || '';
    const country = addr.country || '';

    // If city is found, prefer the clean city name (e.g. "Chișinău, Moldova" or "Jersey City, NJ")
    if (city) {
      if (country && country.toLowerCase() === 'moldova') {
        return `${city}, Moldova`;
      }
      if (state && country) {
        return `${city}, ${state}`;
      }
      return country ? `${city}, ${country}` : city;
    }

    const area = addr.suburb || addr.city_district || addr.quarter || addr.road || '';
    return area ? `${area}${country ? `, ${country}` : ''}` : (data?.name || null);
  } catch {
    return null;
  }
}

/**
 * Forward-geocodes a city, town, or neighborhood with Uber-style primary/secondary text
 * and instant matching on common metropolitan hubs.
 */
export async function searchLocationByQuery(query) {
  const clean = String(query || '').trim().toLowerCase();
  if (clean.length < 2) return [];

  // Instant local hub matches (e.g. "balti", "chisinau", "straseni", "jersey", "new york")
  const localMatches = POPULAR_LOCATIONS.filter((loc) => {
    const t = loc.title.toLowerCase();
    const s = loc.subtitle.toLowerCase();
    const l = loc.label.toLowerCase();
    return t.includes(clean) || s.includes(clean) || l.includes(clean) ||
      (clean.includes('jersey') && t.includes('jersey')) ||
      (clean.includes('balti') && t.includes('bălți'));
  });

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(clean)}&limit=6&addressdetails=1&accept-language=en,ro`,
      {
        headers: { Accept: 'application/json', 'User-Agent': 'ConsensusEngine/2.0' },
        signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
      }
    );
    if (!res.ok) return localMatches;
    const results = await res.json();
    if (!Array.isArray(results)) return localMatches;

    const mapped = results
      .filter((r) => r.lat != null && r.lon != null && r.type !== 'sea' && r.type !== 'ocean')
      .map((r) => {
        const addr = r.address || {};
        const city = addr.city || addr.town || addr.village || addr.municipality || '';
        const state = addr.state || addr.county || '';
        const country = addr.country || '';

        let mainText = r.name || city || r.display_name?.split(',')[0];
        // Clean sector suffixes (e.g. "Buiucani Sector" -> "Buiucani")
        mainText = mainText.replace(/\s+Sector$/i, '');

        let subText = [city && city !== mainText ? city : '', state && state !== mainText ? state : '', country].filter(Boolean).join(', ');
        if (!subText) {
          subText = r.display_name?.split(',').slice(1, 4).join(', ').trim() || '';
        }

        const label = subText ? `${mainText}, ${subText.split(',')[0]}` : mainText;

        // If the entity is a whole state like "New Jersey", anchor slightly toward urban northeast corridor
        let targetLat = parseFloat(r.lat);
        let targetLng = parseFloat(r.lon);
        if (clean.includes('jersey') && (r.name === 'New Jersey' || r.type === 'administrative')) {
          targetLat = 40.7282;
          targetLng = -74.0776; // Jersey City / Newark urban metro hub
        }

        return {
          title: mainText,
          subtitle: subText,
          label,
          fullLabel: r.display_name,
          lat: targetLat,
          lng: targetLng,
          type: r.addresstype || r.type || 'place',
        };
      });

    // Merge without duplicates
    const combined = [...localMatches];
    for (const item of mapped) {
      if (!combined.some((c) => Math.abs(c.lat - item.lat) < 0.05 && Math.abs(c.lng - item.lng) < 0.05)) {
        combined.push(item);
      }
    }

    return combined.slice(0, 8);
  } catch {
    return localMatches;
  }
}

/**
 * Acquires the user's real coordinates in any city/town:
 * 1. Saved manual or GPS override in sessionStorage (if recent)
 * 2. Browser hardware/Wi-Fi Geolocation (high accuracy -> standard accuracy)
 * 3. IP-based city geolocation fallback when browser permission is denied
 */
export async function detectUserGps({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const saved = getSavedExactGps();
    if (saved) return saved;
  }

  const getBrowserPos = (highAccuracy, timeout) =>
    new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        return reject(new Error('Geolocation unsupported'));
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: highAccuracy,
        timeout,
        maximumAge: forceRefresh ? 0 : 60000,
      });
    });

  try {
    let pos;
    try {
      pos = await getBrowserPos(false, 1800);
    } catch (err) {
      if (err?.code === 1) {
        return {
          status: 'denied',
          lat: null,
          lng: null,
          accuracy: null,
          isExact: false,
          label: 'Location access denied',
          source: 'none',
        };
      }
      pos = await getBrowserPos(true, 2200);
    }

    const { latitude, longitude, accuracy } = pos.coords;

    const payload = {
      status: 'exact',
      lat: latitude,
      lng: longitude,
      accuracy: accuracy ? Math.round(accuracy) : null,
      isExact: true,
      label: 'Current Location',
      source: 'gps',
      ts: Date.now(),
    };

    saveUserLocation(payload);

    // Resolve human-readable city label asynchronously without blocking room creation
    reverseGeocode(latitude, longitude).then((resolvedLabel) => {
      if (resolvedLabel) {
        saveUserLocation({ ...payload, label: resolvedLabel });
      }
    }).catch(() => {});

    return payload;
  } catch (err) {
    return {
      status: err?.code === 1 ? 'denied' : 'unavailable',
      lat: null,
      lng: null,
      accuracy: null,
      isExact: false,
      label: err?.code === 1 ? 'Location access denied' : 'Location unavailable',
      source: 'none',
    };
  }
}

export function saveUserLocation(locObj) {
  try {
    sessionStorage.setItem(
      'consensus_exact_gps',
      JSON.stringify({
        ...locObj,
        isExact: true,
        ts: Date.now(),
      })
    );
  } catch {}
}

export function getSavedExactGps() {
  try {
    const raw = sessionStorage.getItem('consensus_exact_gps');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.lat != null && parsed.lng != null && Date.now() - parsed.ts < 30 * 60 * 1000) {
      return parsed;
    }
  } catch {}
  return null;
}

const roadMetricsCache = new Map();

/**
 * Queries OSRM for actual road/bridge network distances and travel durations
 * from (userLat, userLng) to an array of venues.
 */
export async function fetchRoadRouteMetrics(userLat, userLng, venues = []) {
  if (userLat == null || userLng == null || !Array.isArray(venues) || venues.length === 0) {
    return {};
  }
  const validVenues = venues.filter((v) => v && v.lat != null && v.lng != null);
  if (validVenues.length === 0) return {};

  const cacheKey = `${Number(userLat).toFixed(3)},${Number(userLng).toFixed(3)}|${validVenues.map((v) => v.id || v.name).join(',')}`;
  if (roadMetricsCache.has(cacheKey)) {
    return roadMetricsCache.get(cacheKey);
  }

  try {
    const coordStr = [`${userLng},${userLat}`, ...validVenues.map((v) => `${v.lng},${v.lat}`)].join(';');
    const url = `https://router.project-osrm.org/table/v1/driving/${coordStr}?sources=0&annotations=distance,duration`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout ? AbortSignal.timeout(3500) : undefined,
    });
    if (!res.ok) return {};
    const data = await res.json();
    const distances = data?.distances?.[0];
    const durations = data?.durations?.[0];
    if (!Array.isArray(distances)) return {};

    const resultMap = {};
    validVenues.forEach((v, i) => {
      const roadMeters = distances[i + 1];
      const driveSeconds = durations?.[i + 1];
      if (typeof roadMeters === 'number' && roadMeters > 0) {
        const roadDistanceKm = Math.max(0.1, Number((roadMeters / 1000).toFixed(1)));
        const driveMinutes =
          typeof driveSeconds === 'number'
            ? Math.max(2, Math.round(driveSeconds / 60))
            : Math.max(2, Math.round(roadDistanceKm * 2.2));
        const walkMinutes = Math.max(2, Math.round(roadMeters / 78));
        resultMap[v.id || v.name] = {
          roadDistanceKm,
          walkMinutes,
          driveMinutes,
        };
      }
    });

    roadMetricsCache.set(cacheKey, resultMap);
    return resultMap;
  } catch {
    return {};
  }
}

/**
 * Formats road distance and walking/driving time into a clear human-friendly string
 * using regional distance units (miles for US/UK, kilometers elsewhere).
 */
export function formatTravelSummary(item, lang = 'en') {
  const localSpotMap = {
    ro: 'Locație în apropiere',
    ru: 'Место поблизости',
    fr: 'Lieu à proximité',
    de: 'Ort in der Nähe',
    es: 'Lugar cercano',
    en: 'Local Spot',
  };
  if (!item) {
    return localSpotMap[lang] || localSpotMap.en;
  }
  const dist = item.distance_km;
  if (dist == null) {
    if (item.address) return item.address.split(',')[0];
    return localSpotMap[lang] || localSpotMap.en;
  }
  const distLabel = formatRegionalDistance(dist, {
    lat: item.lat,
    lng: item.lng,
    address: item.address,
  });
  const walkMin = item.walk_minutes || Math.max(2, Math.round(dist * 12.5));
  const driveMin = item.drive_minutes || Math.max(2, Math.round(dist * 2.2));
  if (dist <= 1.5) {
    if (lang === 'ro') return `${distLabel} • ~${walkMin} min pe jos`;
    if (lang === 'ru') return `${distLabel} • ~${walkMin} мин пешком`;
    if (lang === 'fr') return `${distLabel} • ~${walkMin} min à pied`;
    if (lang === 'de') return `${distLabel} • ~${walkMin} Min. zu Fuß`;
    if (lang === 'es') return `${distLabel} • ~${walkMin} min a pie`;
    return `${distLabel} • ~${walkMin} min walk`;
  }
  if (lang === 'ro') return `${distLabel} • ~${driveMin} min cu mașina`;
  if (lang === 'ru') return `${distLabel} • ~${driveMin} мин на авто`;
  if (lang === 'fr') return `${distLabel} • ~${driveMin} min en voiture`;
  if (lang === 'de') return `${distLabel} • ~${driveMin} Min. Fahrt`;
  if (lang === 'es') return `${distLabel} • ~${driveMin} min en coche`;
  return `${distLabel} • ~${driveMin} min drive`;
}

