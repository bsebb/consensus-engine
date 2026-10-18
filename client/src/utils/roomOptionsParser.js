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
