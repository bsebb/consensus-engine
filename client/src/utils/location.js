/**
 * Universal Geolocation, Reverse Geocoder & Hexagonal Grid Anchor Resolver.
 * Works in any city, town, or neighborhood without clamping to a single city.
 */

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

/**
 * Reverse-geocodes (lat, lng) into a concise human-readable neighborhood/city label
 * using OpenStreetMap Nominatim.
 */
export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=14&accept-language=en,ro`,
      {
        headers: { Accept: 'application/json' },
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
      addr.county ||
      '';
    const area =
      addr.suburb ||
      addr.city_district ||
      addr.neighbourhood ||
      addr.quarter ||
      addr.road ||
      '';
    if (area && city && area.toLowerCase() !== city.toLowerCase()) {
      return `${area}, ${city}`;
    }
    return city || area || data?.name || null;
  } catch {
    return null;
  }
}

/**
 * Forward-geocodes a city, town, neighborhood, or street query via OpenStreetMap Nominatim.
 */
export async function searchLocationByQuery(query) {
  const clean = String(query || '').trim();
  if (clean.length < 2) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(clean)}&limit=5&addressdetails=1&accept-language=en,ro`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
      }
    );
    if (!res.ok) return [];
    const results = await res.json();
    if (!Array.isArray(results)) return [];
    return results
      .filter((r) => r.lat != null && r.lon != null)
      .map((r) => {
        const addr = r.address || {};
        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          addr.county ||
          '';
        const primary = r.name || addr.suburb || addr.road || city || r.display_name?.split(',')[0];
        const label =
          city && primary && primary.toLowerCase() !== city.toLowerCase()
            ? `${primary}, ${city}`
            : primary || r.display_name?.split(',').slice(0, 2).join(', ');
        return {
          label,
          fullLabel: r.display_name,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        };
      });
  } catch {
    return [];
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
      pos = await getBrowserPos(true, 5000);
    } catch {
      pos = await getBrowserPos(false, 4500);
    }

    const { latitude, longitude, accuracy } = pos.coords;
    const label = (await reverseGeocode(latitude, longitude)) || 'Current Location';

    const payload = {
      status: 'exact',
      lat: latitude,
      lng: longitude,
      accuracy: accuracy ? Math.round(accuracy) : null,
      isExact: true,
      label,
      source: 'gps',
      ts: Date.now(),
    };

    saveUserLocation(payload);
    return payload;
  } catch {
    // Fallback to IP geolocation if browser permission was denied/blocked
    try {
      const ipRes = await fetch('https://get.geojs.io/v1/ip/geo.json', {
        signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
      });
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        const lat = parseFloat(ipData.latitude);
        const lng = parseFloat(ipData.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          const label = ipData.city
            ? `${ipData.city}${ipData.region && ipData.region !== ipData.city ? `, ${ipData.region}` : ''}`
            : (await reverseGeocode(lat, lng)) || 'Approximate Area';
          const payload = {
            status: 'ip',
            lat,
            lng,
            accuracy: 5000,
            isExact: true,
            label,
            source: 'ip',
            ts: Date.now(),
          };
          saveUserLocation(payload);
          return payload;
        }
      }
    } catch {}

    return {
      status: 'unavailable',
      lat: null,
      lng: null,
      accuracy: null,
      isExact: false,
      label: 'Location not set',
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
 * Formats road distance and walking/driving time into a clear human-friendly string.
 */
export function formatTravelSummary(item) {
  if (!item) return 'Local Venue';
  const dist = item.distance_km;
  if (dist == null) {
    return item.address ? item.address.split(',')[0] : 'Local Area';
  }
  const walkMin = item.walk_minutes || Math.max(2, Math.round(dist * 12.5));
  const driveMin = item.drive_minutes || Math.max(2, Math.round(dist * 2.2));
  if (dist <= 1.8) {
    return `${dist} km road • ~${walkMin} min walk`;
  }
  return `${dist} km road • ~${driveMin} min drive (${walkMin}m walk)`;
}

