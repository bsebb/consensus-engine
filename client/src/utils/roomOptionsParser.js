import { calculateDistanceKm, getSavedExactGps } from './location.js';
import { deduplicateVenues } from './venueImages.js';
import { filterOutReportedVenues } from './reportedVenuesClient.js';
import { resolveCuratedOptionPhoto, getDefaultSeedOptions } from './customOptionService.js';
import { resolveSmartCustomVenue } from './smartPlaceResolver.js';

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
    return groupPool.map((rawItem, idx) => {
      const isObj = typeof rawItem === 'object' && rawItem !== null;
      const name = isObj ? String(rawItem.name || rawItem.suggestion || '').trim() : String(rawItem || '').trim();
      const addedBy = (isObj ? (rawItem.addedBy || rawItem.added_by || rawItem.user_name) : null) || 'Group';
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
        isGroupAdded: true,
        addedBy,
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
      const catLabel = meta.catLabel || opt.category || category || 'Local Favorite';
      const venueLat = meta.lat ?? opt.lat ?? null;
      const venueLng = meta.lng ?? opt.lng ?? null;
      const addr = (meta.addr && meta.addr !== 'Local Venue' ? meta.addr : opt.address) || 'Local Venue';
      const photoUrl = meta.photoUrl || opt.photo_url || null;

      const route = roadRoutes[opt.id];
      let dist = meta.dist ?? opt.distance_km ?? null;
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
        price_level: opt.priceLevel ?? opt.price_level ?? 2,
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
    const addedDiscoveryVenues = groupPool.map((rawItem, idx) => {
      const isObj = typeof rawItem === 'object' && rawItem !== null;
      const cleanName = isObj ? String(rawItem.name || rawItem.suggestion || '').trim() : String(rawItem || '').trim();
      const addedBy = (isObj ? (rawItem.addedBy || rawItem.added_by || rawItem.user_name) : null) || 'Group';
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
          name: existingInPool.name || (smart ? smart.canonicalName : cleanName),
          address: existingInPool.address && existingInPool.address !== 'Local Venue'
            ? existingInPool.address
            : (smart?.address || existingInPool.address),
          distance_km: existingInPool.distance_km ?? smart?.distance_km ?? null,
          drive_minutes: existingInPool.drive_minutes ?? smart?.drive_minutes ?? null,
          walk_minutes: existingInPool.walk_minutes ?? smart?.walk_minutes ?? null,
          isCustom: false,
          isGroupAdded: true,
          addedBy,
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
        addedBy,
        isRoutablePlace: true,
        googleMapsUrl: smart?.googleMapsUrl,
        appleMapsUrl: smart?.appleMapsUrl,
        customIndex: idx,
      };
    });

    baseList = [...addedDiscoveryVenues.reverse(), ...baseList];
  }

  return filterOutReportedVenues(deduplicateVenues(baseList));
}

export function parseRoomOptions(param1 = {}, param2 = [], param3 = {}) {
  const isConfigObj = param1 && typeof param1 === 'object' && !Array.isArray(param1);
  const config = isConfigObj
    ? param1
    : {
        realOptions: Array.isArray(param1) ? param1 : [],
        groupPool: Array.isArray(param2) ? param2 : [],
        ...(param3 && typeof param3 === 'object' ? param3 : {}),
      };

  const groupPool = config.groupPool || config.customSuggestions || config.suggestions || [];
  const realOptions = config.realOptions || config.options || [];
  const pool = buildCandidatePool({
    ...config,
    groupPool,
    realOptions,
  });

  return pool.map((item) => {
    if (item.isGroupAdded || item.isCustom) {
      return {
        ...item,
        isCustom: true,
        isGroupAdded: true,
        addedBy: item.addedBy || 'Group',
      };
    }
    return item;
  });
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
      const hasRealVenueData = !isCustomItem && item.address && item.address !== 'Local Venue' && item.address !== 'Added by group';
      const effectiveSmart = hasRealVenueData ? null : smart;

      const liveDist = typeof item.distance_km === 'number'
        ? item.distance_km
        : savedGps && item.lat != null && item.lng != null
          ? calculateDistanceKm(savedGps.lat, savedGps.lng, item.lat, item.lng)
          : (effectiveSmart?.distance_km ?? null);

      return {
        id: item.id || `option-${idx}`,
        name: effectiveSmart ? effectiveSmart.canonicalName : (item.name || `Option ${idx + 1}`),
        originalName: item.name,
        category: item.category && item.category !== 'Local Favorite' && item.category !== 'Group Suggestion'
          ? item.category
          : (effectiveSmart ? effectiveSmart.category : (isCustomItem ? 'Custom Poll Option' : (item.category || 'Local Favorite'))),
        tags: item.tags && item.tags.length > 0 ? item.tags : (effectiveSmart ? [effectiveSmart.category, 'Top Pick'] : ['Top Pick']),
        distance_km: liveDist,
        drive_minutes: item.drive_minutes ?? effectiveSmart?.drive_minutes ?? null,
        walk_minutes: item.walk_minutes ?? effectiveSmart?.walk_minutes ?? null,
        lat: item.lat ?? effectiveSmart?.lat ?? null,
        lng: item.lng ?? effectiveSmart?.lng ?? null,
        price_level: typeof item.price_level === 'number' ? item.price_level : (effectiveSmart?.price_level ?? 2),
        address: item.address && item.address !== 'Local Venue' && item.address !== 'Added by group'
          ? item.address
          : (effectiveSmart?.address ?? (isCustomItem ? '' : (item.address || 'Local Venue'))),
        isRoutablePlace: Boolean(item.isRoutablePlace || effectiveSmart?.isRoutablePlace || (!isCustomItem && item.lat != null)),
        googleMapsUrl: item.googleMapsUrl || effectiveSmart?.googleMapsUrl,
        appleMapsUrl: item.appleMapsUrl || effectiveSmart?.appleMapsUrl,
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
