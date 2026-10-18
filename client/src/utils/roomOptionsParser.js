import { calculateDistanceKm } from './location';
import { deduplicateVenues } from './venueImages';
import { filterOutReportedVenues } from './reportedVenuesClient';

export function parseGooglePlaceMetadata(placeIdString = '') {
  if (!placeIdString || typeof placeIdString !== 'string' || !placeIdString.includes('|')) {
    return { dist: null, addr: 'Local Venue', catLabel: null, lat: null, lng: null, photoUrl: null };
  }
  const parts = placeIdString.split('|');
  const parsedDist = parseFloat(parts[1]);
  const dist = !isNaN(parsedDist) && parsedDist > 0 ? parsedDist : null;
  const addr = parts[2] || 'Local Venue';
  const catLabel = parts[3] || null;
  let lat = null;
  let lng = null;
  if (parts[4] && parts[4].includes(',')) {
    const [latStr, lngStr] = parts[4].split(',');
    const pLat = parseFloat(latStr);
    const pLng = parseFloat(lngStr);
    if (!isNaN(pLat) && !isNaN(pLng)) {
      lat = pLat;
      lng = pLng;
    }
  }
  const photoUrl = parts[5] && parts[5].startsWith('http') ? parts[5] : null;
  return { dist, addr, catLabel, lat, lng, photoUrl };
}

export function buildCandidatePool({
  mode = 'DISCOVERY',
  groupPool = [],
  realOptions = [],
  category = null,
  userGps = null,
  roadRoutes = {},
  mockPool = [],
}) {
  if (mode === 'CUSTOM') {
    return groupPool.map((name, idx) => ({
      id: `custom-${idx}-${name}`,
      name,
      category: 'Group Suggestion',
      price_level: 2,
      distance_km: null,
      address: 'Added by group',
      tags: ['Custom'],
      isCustom: true,
      customIndex: idx,
    }));
  }

  let baseList = [];
  if (realOptions && realOptions.length > 0) {
    baseList = realOptions.map((opt) => {
      const meta = parseGooglePlaceMetadata(opt.googlePlaceId);
      const catLabel = meta.catLabel || category || 'Local Favorite';
      const venueLat = meta.lat;
      const venueLng = meta.lng;
      const addr = meta.addr || 'Local Venue';
      const photoUrl = meta.photoUrl;

      const route = roadRoutes[opt.id];
      let dist = meta.dist;
      if (route && route.roadDistanceKm != null) {
        dist = route.roadDistanceKm;
      } else if (userGps && venueLat != null && venueLng != null) {
        dist = calculateDistanceKm(userGps.lat, userGps.lng, venueLat, venueLng);
      } else if (!userGps && dist == null) {
        dist = null;
      }

      return {
        id: opt.id,
        name: opt.name,
        category: catLabel,
        price_level: opt.priceLevel || 2,
        distance_km: dist,
        drive_minutes: route?.driveMinutes ?? null,
        walk_minutes: route?.walkMinutes ?? null,
        lat: venueLat,
        lng: venueLng,
        tags: [catLabel],
        address: addr,
        photo_url: photoUrl,
        isCustom: false,
      };
    });
  } else {
    let pool = mockPool || [];
    if (category && category !== 'Restaurants') {
      const catLower = category.toLowerCase();
      const matched = pool.filter(
        (r) =>
          r.tags?.some((t) => t.toLowerCase().includes(catLower)) ||
          r.category?.toLowerCase().includes(catLower) ||
          r.name?.toLowerCase().includes(catLower)
      );
      if (matched.length > 0) pool = matched;
    }
    baseList = pool.map((r) => {
      const route = roadRoutes[r.id];
      const dist = route?.roadDistanceKm != null
        ? route.roadDistanceKm
        : userGps && r.lat != null && r.lng != null
        ? calculateDistanceKm(userGps.lat, userGps.lng, r.lat, r.lng)
        : null;
      return {
        ...r,
        distance_km: dist,
        drive_minutes: route?.driveMinutes ?? null,
        walk_minutes: route?.walkMinutes ?? null,
      };
    });
  }

  return filterOutReportedVenues(deduplicateVenues(baseList));
}
