const CRATE_KEY = 'my-crate'
export const CRATE_CHANGE_EVENT = 'p192-crate-change'

let crateVersion = 0

export function subscribeCrate(callback) {
  window.addEventListener(CRATE_CHANGE_EVENT, callback)
  return () => window.removeEventListener(CRATE_CHANGE_EVENT, callback)
}

export function getCrateVersion() {
  return crateVersion
}

export function getCrate() {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(CRATE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeCrate(crate) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(CRATE_KEY, JSON.stringify(crate))
  } catch {
    /* quota */
  }
  crateVersion += 1
  window.dispatchEvent(new Event(CRATE_CHANGE_EVENT))
}

export function isInCrate(id) {
  if (!id) return false
  return getCrate().some((a) => a.id === id)
}

/**
 * @param {{ id: string, name: string, artist: string, image?: string }} meta
 */
export function addToCrate(meta) {
  if (!meta?.id) return
  const crate = getCrate()
  if (crate.some((a) => a.id === meta.id)) return
  crate.push({
    id: meta.id,
    name: meta.name || '',
    artist: meta.artist || '',
    image: meta.image || '',
  })
  writeCrate(crate)
}

export function removeFromCrate(id) {
  const crate = getCrate().filter((a) => a.id !== id)
  writeCrate(crate)
}

/** Convert a Spotify album object to the compact crate shape */
export function albumToCrateMeta(album) {
  if (!album?.id) return null
  const artist = Array.isArray(album.artists)
    ? album.artists.map((a) => a.name).join(', ')
    : album.artist || ''
  const image = album.images?.[0]?.url || album.image || ''
  return { id: album.id, name: album.name, artist, image }
}
