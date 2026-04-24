const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('[Spotify] Token request failed:', response.status, text);
    throw new Error(`Spotify auth failed: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

const SPOTIFY_429_MAX_RETRIES = 8;
/**
 * Short gap between search requests. We rely on the built-in 429 retry
 * logic as a safety net instead of pre-pacing aggressively, so navigation
 * doesn't stall behind long search bursts.
 */
const SPOTIFY_SEARCH_GAP_MS = 250;
/** Album/artist fetches are single-object; shorter gap keeps navigation snappy */
const SPOTIFY_ENTITY_GAP_MS = 80;

const SEARCH_CACHE_PREFIX = 'p192-spotify-search:';
const SEARCH_CACHE_TTL_MS = 12 * 60 * 1000;

const ALBUM_CACHE_PREFIX = 'p192-spotify-album:';
const ARTIST_CACHE_PREFIX = 'p192-spotify-artist:';
const ENTITY_CACHE_TTL_MS = 25 * 60 * 1000;

function queueGapAfterMs(endpoint) {
  return endpoint.startsWith('/search?') ? SPOTIFY_SEARCH_GAP_MS : SPOTIFY_ENTITY_GAP_MS;
}

function readSearchCache(endpointPath) {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const key = SEARCH_CACHE_PREFIX + endpointPath;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { t, albums } = JSON.parse(raw);
    if (Date.now() - t > SEARCH_CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return albums;
  } catch {
    return null;
  }
}

function writeSearchCache(endpointPath, albums) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      SEARCH_CACHE_PREFIX + endpointPath,
      JSON.stringify({ t: Date.now(), albums })
    );
  } catch {
    /* quota / private mode */
  }
}

function readEntityCache(prefix, id) {
  if (typeof sessionStorage === 'undefined' || !id) return null;
  try {
    const key = prefix + id;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { t, payload } = JSON.parse(raw);
    if (Date.now() - t > ENTITY_CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function writeEntityCache(prefix, id, payload) {
  if (typeof sessionStorage === 'undefined' || !id) return;
  try {
    sessionStorage.setItem(prefix + id, JSON.stringify({ t: Date.now(), payload }));
  } catch {
    /* quota / private mode */
  }
}

let spotifyQueue = Promise.resolve();

/**
 * One Spotify API GET with 429 retries. Retries stay inside this call — they do not re-enter the queue,
 * so we avoid a thundering herd of parallel retries.
 */
async function spotifyRequestOnce(endpoint) {
  for (let attempt = 0; attempt <= SPOTIFY_429_MAX_RETRIES; attempt++) {
    const token = await getAccessToken();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 429 && attempt < SPOTIFY_429_MAX_RETRIES) {
      const retryAfter = response.headers.get('Retry-After');
      const fromHeader = retryAfter ? parseInt(retryAfter, 10) * 1000 : NaN;
      let waitMs = Number.isFinite(fromHeader) ? fromHeader : 2000 * 2 ** attempt;
      if (!Number.isFinite(waitMs) || waitMs < 800) waitMs = 2000;
      if (waitMs > 45_000) waitMs = 45_000;
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('[Spotify] API error:', response.status, endpoint, text);
      throw new Error(`Spotify API error: ${response.status}`);
    }

    return response.json();
  }

  throw new Error('Spotify API error: 429');
}

/** Serialize API traffic: one in-flight request at a time, short pause after each finishes */
function spotifyFetch(endpoint) {
  const run = spotifyQueue.then(() => spotifyRequestOnce(endpoint));
  const gapMs = queueGapAfterMs(endpoint);
  spotifyQueue = run
    .catch(() => {})
    .then(() => new Promise((r) => setTimeout(r, gapMs)));
  return run;
}

export async function searchAlbums(query, limit = 10, offset = 0) {
  // Spotify search caps `limit` at 10 per endpoint spec.
  const safeLimit = Math.max(1, Math.min(10, Math.floor(limit)));
  const params = new URLSearchParams({
    q: query,
    type: 'album',
    limit: String(safeLimit),
    offset: String(Math.max(0, Math.floor(offset))),
    // Client-credentials tokens have no user country, so per docs
    // we must pass `market` or items get flagged unavailable and
    // can silently drop out of results.
    market: 'US',
  });
  const endpoint = `/search?${params}`;
  const cached = readSearchCache(endpoint);
  if (cached) return cached;

  const data = await spotifyFetch(endpoint);
  writeSearchCache(endpoint, data.albums);
  return data.albums;
}

export async function getAlbum(id) {
  const cached = readEntityCache(ALBUM_CACHE_PREFIX, id);
  if (cached) return cached;

  const data = await spotifyFetch(`/albums/${id}`);
  writeEntityCache(ALBUM_CACHE_PREFIX, id, data);
  return data;
}

export async function getArtist(id) {
  const cached = readEntityCache(ARTIST_CACHE_PREFIX, id);
  if (cached) return cached;

  const data = await spotifyFetch(`/artists/${id}`);
  writeEntityCache(ARTIST_CACHE_PREFIX, id, data);
  return data;
}

/**
 * Fetch an artist's discography. The native `/artists/{id}/albums` endpoint
 * is unreliable under Spotify's February 2026 Dev Mode restrictions (often
 * returns 400/403), so we try it first, then fall back to the search
 * endpoint with `artist:"Name"` which is still fully supported.
 */
export async function getArtistAlbums(id, artistName) {
  const key = `${id}:albums`;
  const cached = readEntityCache(ARTIST_CACHE_PREFIX, key);
  if (cached) return cached;

  const params = new URLSearchParams({
    include_groups: 'album,single',
    limit: '20',
    market: 'US',
  });

  try {
    const data = await spotifyFetch(`/artists/${id}/albums?${params}`);
    writeEntityCache(ARTIST_CACHE_PREFIX, key, data);
    return data;
  } catch (err) {
    if (!artistName) throw err;
    console.warn(
      '[Spotify] /artists/{id}/albums failed — falling back to search:',
      err?.message
    );
    // Search fallback. Pull 2 pages so we have enough records to dedupe.
    const pages = await Promise.all([
      searchAlbums(`artist:"${artistName}"`, 10, 0),
      searchAlbums(`artist:"${artistName}"`, 10, 10),
    ]);
    const items = pages.flatMap((p) => p.items || []);
    const data = { items, source: 'search-fallback' };
    writeEntityCache(ARTIST_CACHE_PREFIX, key, data);
    return data;
  }
}


/** Warm album cache on hover so the detail route often hits cache immediately */
export function prefetchAlbum(id) {
  if (!id || readEntityCache(ALBUM_CACHE_PREFIX, id)) return;
  void getAlbum(id).catch(() => {});
}

export async function getNewReleases(limit = 10, offset = 0) {
  const data = await spotifyFetch(
    `/search?q=new+music&type=album&limit=${limit}&offset=${offset}`
  );
  return data.albums;
}

/**
 * Seed keywords + decades that produce *different* query combinations than
 * the HomePage rows. Combining `keyword year:XXXX-YYYY` re-orders Spotify's
 * relevance ranking so we surface albums the HomePage will never show,
 * while still relying on Spotify's own relevance (= popularity-ish) to
 * keep niche / unknown projects off the page.
 */
/**
 * Strictly genre-focused seeds. Generic/mood words ("love", "dreams",
 * "night", "classic", "greatest") are avoided because they heavily attract
 * lullaby, ASMR, tribute, karaoke, and meditation filler.
 */
const RANDOM_SEED_KEYWORDS = [
  'rock', 'pop', 'hip hop', 'rap', 'soul', 'funk', 'jazz', 'indie',
  'r&b', 'electronic', 'dance', 'metal', 'punk', 'country', 'folk',
  'blues', 'reggae', 'alternative', 'house', 'techno',
  'disco', 'grunge', 'shoegaze', 'new wave', 'synthwave',
  'garage', 'post-punk', 'soundtrack', 'emo', 'trap',
];

const RANDOM_DECADES = [
  'year:2020-2026',
  'year:2010-2019',
  'year:2000-2009',
  'year:1990-1999',
  'year:1980-1989',
  'year:1970-1979',
  'year:1960-1969',
];

/** Low offsets only -> stays near the top (popular) results per query. */
const RANDOM_OFFSET_BUCKETS = [0, 0, 10, 10, 20, 30];

/** How many unique (keyword, decade, offset) queries to fire per load. */
const RANDOM_QUERIES_PER_LOAD = 7;

/**
 * Case-insensitive substring blocklists applied to album/artist names.
 * Catches the "album-type:album but really a compilation / karaoke /
 * ASMR / kids-music / tribute-band / stock-music" cases that slip past
 * `album_type === 'album'`.
 */
const ALBUM_NAME_BLOCKLIST = [
  'white noise', 'pink noise', 'brown noise',
  'sleep music', 'sleep sounds', 'sleeping music',
  'lullaby', 'lullabies',
  'nursery rhyme', 'nursery rhymes', 'sunday school',
  'meditation', 'relaxation', 'relaxing music',
  'yoga music', 'spa music',
  'karaoke', 'instrumental version', 'instrumental versions',
  'tribute to', 'piano tribute', 'tribute band',
  'string quartet tribute',
  'type beat', 'type beats', 'beat tape',
  'asmr', 'binaural',
  'study music', 'music for studying', 'music for sleep',
  'background music', 'elevator music',
  'healing frequencies', 'healing music',
  'rain sounds', 'ocean sounds', 'nature sounds',
  'greatest hits', 'best of', 'anthology',
  'the collection', 'essential collection',
  'sing along', 'sing-along',
  'soundscapes', 'ambient music for',
  'christmas carols',
];

const ARTIST_NAME_BLOCKLIST = [
  'white noise', 'noise therapy',
  'lullaby', 'lullabies',
  'nursery rhyme',
  'meditation', 'relaxation',
  'sleep music', 'sleep sounds',
  'karaoke',
  'tribute band', 'piano tribute',
  'string quartet', 'string orchestra',
  'asmr',
  'yoga music',
  'rain sounds', 'ocean sounds', 'nature sounds',
  'cedarmont kids', 'children\'s music',
];

function matchesBlocklist(text, blocklist) {
  if (!text) return false;
  const t = text.toLowerCase();
  return blocklist.some((term) => t.includes(term));
}

function passesQualityFilter(album) {
  if (!album || album.album_type !== 'album') return false;
  if (!(album.total_tracks >= 6 && album.total_tracks <= 20)) return false;
  if (!album.images?.length) return false;
  if (matchesBlocklist(album.name, ALBUM_NAME_BLOCKLIST)) return false;
  const artistNames = (album.artists || []).map((a) => a.name).join(' ');
  if (matchesBlocklist(artistNames, ARTIST_NAME_BLOCKLIST)) return false;
  return true;
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Build a batch of random `keyword year:XXXX-YYYY` queries. Dedup'd so we
 * never fire the exact same query twice in one load.
 */
function buildRandomQueries(count) {
  const seen = new Set();
  const queries = [];
  let attempts = 0;
  while (queries.length < count && attempts < count * 5) {
    attempts++;
    const kw = pickRandom(RANDOM_SEED_KEYWORDS);
    const decade = pickRandom(RANDOM_DECADES);
    const offset = pickRandom(RANDOM_OFFSET_BUCKETS);
    const key = `${kw}|${decade}|${offset}`;
    if (seen.has(key)) continue;
    seen.add(key);
    queries.push({ q: `${kw} ${decade}`, offset });
  }
  return queries;
}

/**
 * Pull a diverse pool of reasonably popular albums using random
 * keyword+decade combinations — delivers genuinely varied results that
 * won't overlap with the HomePage rows, while Spotify's own relevance
 * ranking keeps obscure/niche projects out of the top slots.
 */
export async function getRandomAlbumPool() {
  const queries = buildRandomQueries(RANDOM_QUERIES_PER_LOAD);
  const results = await Promise.allSettled(
    queries.map(({ q, offset }) => searchAlbums(q, 10, offset))
  );

  const items = [];
  const errors = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      items.push(...(r.value.items || []));
    } else if (r.status === 'rejected') {
      console.warn('[Randomizer] search failed:', r.reason);
      errors.push(r.reason);
    }
  }

  if (items.length === 0) {
    if (errors.length > 0) {
      throw new Error(errors[0]?.message || 'Spotify search failed');
    }
    throw new Error('Spotify returned no albums. Try again.');
  }

  const filtered = items
    .filter(passesQualityFilter)
    .filter((a, i, arr) => arr.findIndex((b) => b.id === a.id) === i);
  return shuffleArray(filtered);
}

export async function getRandomAlbums(count = 18) {
  const pool = await getRandomAlbumPool();
  return pool.slice(0, count);
}

export async function getRandomAlbum() {
  const pool = await getRandomAlbumPool();
  if (pool.length === 0) {
    throw new Error('No random albums available right now.');
  }
  return pool[0];
}
