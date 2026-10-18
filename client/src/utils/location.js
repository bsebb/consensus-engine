/**
 * High-reliability Geolocation & Chișinău Sector Resolver.
 * Distinguishes true street-level GPS/Wi-Fi fixes (accuracy <= 2000m)
 * from coarse ISP IP centroids (which in Moldova often resolve ~22.7 km north of Chișinău),
 * and provides 1-tap neighborhood anchors when hardware GPS is unavailable.
 */

export const CHISINAU_SECTORS = [
  { id: 'gps', label: 'Near Me (GPS)', lat: null, lng: null },
  { id: 'centru', label: 'Centru', lat: 47.0225, lng: 28.8340 },
  { id: 'botanica', label: 'Botanica', lat: 46.9865, lng: 28.8580 },
  { id: 'riscani', label: 'Rîșcani', lat: 47.0460, lng: 28.8655 },
  { id: 'buiucani', label: 'Buiucani', lat: 47.0365, lng: 28.7905 },
  { id: 'ciocana', label: 'Ciocana', lat: 47.0455, lng: 28.8915 },
  { id: 'telecentru', label: 'Telecentru', lat: 46.9960, lng: 28.8260 },
];

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
 * Acquires device geolocation with a two-stage strategy:
 * 1. High-accuracy GPS/Wi-Fi fix (up to 5s)
 * 2. Standard network fix fallback (up to 4s)
 * Rejects coarse ISP IP centroids (accuracy > 2500m or > 15km outside Chișinău when coarse).
 */
export async function detectUserGps() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { status: 'unsupported', lat: null, lng: null, accuracy: null, isExact: false };
  }

  const getPos = (highAccuracy, timeout) =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: highAccuracy,
        timeout,
        maximumAge: 60000,
      });
    });

  try {
    let pos;
    try {
      pos = await getPos(true, 5000);
    } catch {
      pos = await getPos(false, 4000);
    }

    const { latitude, longitude, accuracy } = pos.coords;
    const distFromChisinauKm = calculateDistanceKm(latitude, longitude, 47.0185, 28.8360);

    // In Moldova, desktop ISP IP geolocation often resolves ~22.7 km north of Chișinău with accuracy > 2500m.
    // Only treat coordinates as exact street-level GPS if accuracy <= 2500m AND not the 22.7km ISP outlier.
    const isIspOutlier = distFromChisinauKm != null && distFromChisinauKm > 14 && accuracy > 1000;
    const isExact = accuracy != null && accuracy <= 2500 && !isIspOutlier;

    if (isExact) {
      try {
        sessionStorage.setItem(
          'consensus_exact_gps',
          JSON.stringify({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy), ts: Date.now() })
        );
      } catch {}
    }

    return {
      status: isExact ? 'exact' : 'coarse',
      lat: latitude,
      lng: longitude,
      accuracy: accuracy ? Math.round(accuracy) : null,
      isExact,
    };
  } catch (err) {
    return {
      status: err?.code === 1 ? 'denied' : 'unavailable',
      lat: null,
      lng: null,
      accuracy: null,
      isExact: false,
    };
  }
}

export function getSavedExactGps() {
  try {
    const raw = sessionStorage.getItem('consensus_exact_gps');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.lat != null && parsed.lng != null && Date.now() - parsed.ts < 15 * 60 * 1000) {
      return parsed;
    }
  } catch {}
  return null;
}
