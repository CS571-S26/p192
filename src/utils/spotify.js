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
    throw new Error(`Spotify auth failed: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function spotifyFetch(endpoint) {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status}`);
  }

  return response.json();
}

export async function searchAlbums(query, limit = 10, offset = 0) {
  const params = new URLSearchParams({
    q: query,
    type: 'album',
    limit: String(limit),
    offset: String(offset),
  });
  const data = await spotifyFetch(`/search?${params}`);
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
