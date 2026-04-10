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
/** Space out completed calls so bursts (e.g. home rows + Strict Mode) stay under Spotify limits */
const SPOTIFY_QUEUE_GAP_MS = 900;

const SEARCH_CACHE_PREFIX = 'p192-spotify-search:';
const SEARCH_CACHE_TTL_MS = 12 * 60 * 1000;

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
  spotifyQueue = run
    .catch(() => {})
    .then(() => new Promise((r) => setTimeout(r, SPOTIFY_QUEUE_GAP_MS)));
  return run;
}

export async function searchAlbums(query, limit = 10, offset = 0) {
  const params = new URLSearchParams({
    q: query,
    type: 'album',
    limit: String(limit),
    offset: String(offset),
  });
  const endpoint = `/search?${params}`;
  const cached = readSearchCache(endpoint);
  if (cached) return cached;

  const data = await spotifyFetch(endpoint);
  writeSearchCache(endpoint, data.albums);
  return data.albums;
}

export async function getAlbum(id) {
  return spotifyFetch(`/albums/${id}`);
}

export async function getNewReleases(limit = 10, offset = 0) {
  const data = await spotifyFetch(
    `/search?q=new+music&type=album&limit=${limit}&offset=${offset}`
  );
  return data.albums;
}

const RANDOM_CHARS = 'abcdefghijklmnopqrstuvwxyz';

export async function getRandomAlbum() {
  const char = RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
  const offset = Math.floor(Math.random() * 100);
  const data = await spotifyFetch(
    `/search?q=${char}&type=album&limit=1&offset=${offset}`
  );
  const albums = data.albums?.items;
  if (!albums || albums.length === 0) {
    return getRandomAlbum();
  }
  return albums[0];
}
