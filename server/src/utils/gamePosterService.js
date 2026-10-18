// Resolves official artwork for a game title.
// 1. Steam store search, accepted only on an exact (normalized) title match.
// 2. Wikipedia article for the game: cover/box art file, then page image, then title logo.
// Results (including misses) are cached in memory for the lifetime of the process.

const HEADERS = { 'User-Agent': 'NoYouPick/1.0 (https://noyoupick.org)' };
const WIKI_API = 'https://en.wikipedia.org/w/api.php?format=json&action=query';
const EDITION_SUFFIX = /\s(remastered|definitive edition|enhanced edition|complete edition|deluxe edition|goty edition|game of the year edition)$/;
const cache = new Map();

const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[™®©]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

async function getJson(url) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(3500) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function fromSteam(query) {
  const q = normalize(query);
  const data = await getJson(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`
  );
  const items = Array.isArray(data?.items) ? data.items : [];
  const hit = items.find((item) => {
    const name = normalize(item.name);
    return name === q || name.replace(EDITION_SUFFIX, '') === q;
  });
  if (!hit) return null;
  return {
    url: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${hit.id}/header.jpg`,
    source: 'steam',
    title: hit.name,
  };
}

async function fromWikipedia(query) {
  const q = normalize(query);
  const isGamePage = (p) => p && !('missing' in p) && /\b(video )?game\b|esports/i.test(p.description || '');
  const pageQuery = (titles) =>
    getJson(
      `${WIKI_API}&redirects=1&prop=description|images|pageimages&imlimit=80&piprop=name&pilicense=any&titles=${encodeURIComponent(titles)}`
    ).then((d) => Object.values(d?.query?.pages || {}));

  // Direct title (follows redirects such as "GTA V" -> "Grand Theft Auto V")
  let info = (await pageQuery(`${query}|${query} (video game)`)).find(isGamePage);

  if (!info) {
    const search = await getJson(
      `${WIKI_API}&list=search&srlimit=6&srsearch=${encodeURIComponent(`${query} video game`)}`
    );
    const baseTitle = (t) => normalize(String(t).replace(/\s*\([^)]*\)\s*$/, '').replace(/^the /i, ''));
    const qBare = q.replace(/^the /, '');
    const match = (search?.query?.search || []).find((r) => baseTitle(r.title) === qBare);
    if (match) info = (await pageQuery(match.title)).find(isGamePage);
  }
  if (!info) return null;

  const files = (info.images || []).map((i) => i.title).filter((f) => !/\.(ogg|oga|webm|ogv|mp3|wav)$/i.test(f));
  const raster = files.filter((f) => !/\.svg$/i.test(f));
  const titleWord = normalize(info.title).replace(/^the /, '').split(' ')[0];
  const isArt = (f) => /(cover|box ?art|key ?art|artwork|poster)/i.test(f);
  const pick =
    raster.find((f) => isArt(f) && normalize(f).includes(titleWord)) ||
    raster.find(isArt) ||
    (info.pageimage ? `File:${info.pageimage}` : null) ||
    files.find((f) => /logo/i.test(f) && normalize(f).includes(titleWord));
  if (!pick) return null;

  // iiurlwidth returns a raster thumbnail, so SVG logos come back as PNG
  const imageData = await getJson(
    `${WIKI_API}&prop=imageinfo&iiprop=url&iiurlwidth=800&titles=${encodeURIComponent(pick)}`
  );
  const image = Object.values(imageData?.query?.pages || {})[0]?.imageinfo?.[0];
  const url = image?.thumburl || image?.url;
  return url ? { url, source: 'wikipedia', title: info.title } : null;
}

async function resolveGamePoster(rawQuery) {
  const query = String(rawQuery || '').trim().slice(0, 80);
  if (query.length < 2) return null;
  const key = normalize(query);
  if (cache.has(key)) return cache.get(key);

  const result = (await fromSteam(query)) || (await fromWikipedia(query));
  cache.set(key, result);
  return result;
}

module.exports = { resolveGamePoster, normalize };
