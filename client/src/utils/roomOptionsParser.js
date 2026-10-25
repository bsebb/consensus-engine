import { calculateDistanceKm, getSavedExactGps } from './location';
import { deduplicateVenues } from './venueImages';
import { filterOutReportedVenues } from './reportedVenuesClient';
import { resolveCuratedOptionPhoto, getDefaultSeedOptions } from './customOptionService';
import { resolveSmartCustomVenue } from './smartPlaceResolver';

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
  topic = '',
  groupPool = [],
  realOptions = [],
  category = null,
  userGps = null,
  roadRoutes = {},
  mockPool = [],
}) {
  if (mode === 'CUSTOM') {
    return groupPool.map((name, idx) => {
      const smart = resolveSmartCustomVenue(name, topic, userGps);
      return {
        id: `custom-${idx}-${name}`,
        name: smart ? smart.canonicalName : name,
        originalName: name,
        category: smart ? smart.category : 'Group Suggestion',
        price_level: smart ? smart.price_level : 2,
        distance_km: smart ? smart.distance_km : null,
        drive_minutes: smart ? smart.drive_minutes : null,
        walk_minutes: smart ? smart.walk_minutes : null,
        address: smart ? smart.address : 'Added by group',
        lat: smart ? smart.lat : null,
        lng: smart ? smart.lng : null,
        tags: smart ? [smart.category, 'Custom'] : ['Custom'],
        isCustom: true,
        isRoutablePlace: Boolean(smart?.isRoutablePlace),
        googleMapsUrl: smart?.googleMapsUrl,
        appleMapsUrl: smart?.appleMapsUrl,
        customIndex: idx,
      };
    });
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

  // In DISCOVERY mode, prepend any spots specifically added by the host or participants via search/autocomplete
  if (Array.isArray(groupPool) && groupPool.length > 0) {
    const addedDiscoveryVenues = groupPool.map((name, idx) => {
      const cleanName = String(name || '').trim();
      const smart = resolveSmartCustomVenue(cleanName, topic || category || 'Where should we go?', userGps);
      const canonical = smart ? smart.canonicalName : cleanName;
      const existingInPool = baseList.find(
        (b) =>
          b.name?.toLowerCase().trim() === cleanName.toLowerCase() ||
          b.name?.toLowerCase().trim() === canonical.toLowerCase()
      );

      if (existingInPool) {
        return {
          ...existingInPool,
          name: smart ? smart.canonicalName : existingInPool.name,
          address: smart?.address || existingInPool.address,
          distance_km: existingInPool.distance_km ?? smart?.distance_km ?? null,
          drive_minutes: existingInPool.drive_minutes ?? smart?.drive_minutes ?? null,
          walk_minutes: existingInPool.walk_minutes ?? smart?.walk_minutes ?? null,
          isCustom: false,
          isGroupAdded: true,
          isRoutablePlace: true,
          googleMapsUrl: smart?.googleMapsUrl || existingInPool.googleMapsUrl,
          appleMapsUrl: smart?.appleMapsUrl || existingInPool.appleMapsUrl,
          customIndex: idx,
        };
      }

      return {
        id: `custom-${idx}-${canonical}`,
        name: canonical,
        originalName: cleanName,
        category: smart ? smart.category : (category || 'Group Pick'),
        price_level: smart ? smart.price_level : 2,
        distance_km: smart ? smart.distance_km : null,
        drive_minutes: smart ? smart.drive_minutes : null,
        walk_minutes: smart ? smart.walk_minutes : null,
        lat: smart ? smart.lat : null,
        lng: smart ? smart.lng : null,
        tags: [smart ? smart.category : (category || 'Group Pick'), 'Added'],
        address: smart ? smart.address : 'Nearest Location',
        photo_url: resolveCuratedOptionPhoto(canonical),
        isCustom: false,
        isGroupAdded: true,
        isRoutablePlace: true,
        googleMapsUrl: smart?.googleMapsUrl,
        appleMapsUrl: smart?.appleMapsUrl,
        customIndex: idx,
      };
    });

    baseList = [...addedDiscoveryVenues, ...baseList];
  }

  return filterOutReportedVenues(deduplicateVenues(baseList));
}

export function buildInitialSwipeCards({ locationState, mode = 'DISCOVERY', topic = '', mockPool = [] }) {
  const savedGps = getSavedExactGps();
  if (locationState?.customCards && Array.isArray(locationState.customCards) && locationState.customCards.length > 0) {
    const initialCards = locationState.customCards.map((item, idx) => {
      const rawName = typeof item === 'string' ? item : item?.name || `Option ${idx + 1}`;
      const smart = resolveSmartCustomVenue(rawName, topic, savedGps);

      if (typeof item === 'string') {
        return {
          id: `custom-${idx}`,
          name: smart ? smart.canonicalName : rawName,
          originalName: rawName,
          category: smart ? smart.category : 'Custom Poll Option',
          tags: smart ? [smart.category, 'Custom'] : ['Custom'],
          distance_km: smart ? smart.distance_km : null,
          drive_minutes: smart ? smart.drive_minutes : null,
          walk_minutes: smart ? smart.walk_minutes : null,
          price_level: smart ? smart.price_level : 2,
          address: smart ? smart.address : '',
          lat: smart ? smart.lat : null,
          lng: smart ? smart.lng : null,
          isRoutablePlace: Boolean(smart?.isRoutablePlace),
          googleMapsUrl: smart?.googleMapsUrl,
          appleMapsUrl: smart?.appleMapsUrl,
          photo_url: resolveCuratedOptionPhoto(rawName),
          isCustom: true,
        };
      }

      const isCustomItem = Boolean(item.isCustom || mode === 'CUSTOM');
      const liveDist = isCustomItem
        ? (smart?.distance_km ?? null)
        : typeof item.distance_km === 'number'
          ? item.distance_km
          : savedGps && item.lat != null && item.lng != null
            ? calculateDistanceKm(savedGps.lat, savedGps.lng, item.lat, item.lng)
            : null;

      return {
        id: item.id || `option-${idx}`,
        name: smart ? smart.canonicalName : (item.name || `Option ${idx + 1}`),
        originalName: item.name,
        category: smart ? smart.category : (isCustomItem ? 'Custom Poll Option' : (item.category || 'Local Favorite')),
        tags: smart ? [smart.category, 'Top Pick'] : (item.tags || ['Top Pick']),
        distance_km: liveDist,
        drive_minutes: smart?.drive_minutes ?? (isCustomItem ? null : (item.drive_minutes ?? null)),
        walk_minutes: smart?.walk_minutes ?? (isCustomItem ? null : (item.walk_minutes ?? null)),
        lat: smart?.lat ?? (isCustomItem ? null : (item.lat ?? null)),
        lng: smart?.lng ?? (isCustomItem ? null : (item.lng ?? null)),
        price_level: smart?.price_level ?? (typeof item.price_level === 'number' ? item.price_level : 2),
        address: smart?.address ?? (isCustomItem ? '' : (item.address || 'Local Venue')),
        isRoutablePlace: Boolean(smart?.isRoutablePlace || item.isRoutablePlace),
        googleMapsUrl: smart?.googleMapsUrl || item.googleMapsUrl,
        appleMapsUrl: smart?.appleMapsUrl || item.appleMapsUrl,
        photo_url: item.photo_url || (isCustomItem ? resolveCuratedOptionPhoto(item.name) : null),
        isCustom: isCustomItem,
      };
    });
    return filterOutReportedVenues(deduplicateVenues(initialCards));
  }

  if (mode === 'CUSTOM') {
    const defaultSeeds = getDefaultSeedOptions(topic);
    return defaultSeeds.map((name, idx) => {
      const smart = resolveSmartCustomVenue(name, topic, savedGps);
      return {
        id: `c${idx + 1}`,
        name: smart ? smart.canonicalName : name,
        originalName: name,
        category: smart ? smart.category : 'Custom Poll Option',
        tags: smart ? [smart.category, 'Custom'] : ['Custom'],
        distance_km: smart ? smart.distance_km : null,
        drive_minutes: smart ? smart.drive_minutes : null,
        walk_minutes: smart ? smart.walk_minutes : null,
        price_level: smart ? smart.price_level : 2,
        address: smart ? smart.address : '',
        lat: smart ? smart.lat : null,
        lng: smart ? smart.lng : null,
        isRoutablePlace: Boolean(smart?.isRoutablePlace),
        googleMapsUrl: smart?.googleMapsUrl,
        appleMapsUrl: smart?.appleMapsUrl,
        photo_url: resolveCuratedOptionPhoto(name),
        isCustom: true,
      };
    });
  }

  return filterOutReportedVenues((mockPool || []).map((r) => ({
    ...r,
    distance_km: savedGps && r.lat != null && r.lng != null ? calculateDistanceKm(savedGps.lat, savedGps.lng, r.lat, r.lng) : null,
    isCustom: false,
  })));
}
