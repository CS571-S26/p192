const STORAGE_KEY = 'p192-album-annotations'
export const ANNOTATIONS_CHANGE_EVENT = 'p192-annotations-change'

/** Bumped on every write so `useSyncExternalStore` can re-render subscribers cheaply */
let annotationsVersion = 0

export function subscribeAnnotations(callback) {
  window.addEventListener(ANNOTATIONS_CHANGE_EVENT, callback)
  return () => window.removeEventListener(ANNOTATIONS_CHANGE_EVENT, callback)
}

export function getAnnotationsVersion() {
  return annotationsVersion
}

/** @typedef {'listening' | 'listened' | 'plan' | null} ListenStatus */

function readAll() {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeAll(data) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* quota */
  }
  annotationsVersion += 1
  window.dispatchEvent(new Event(ANNOTATIONS_CHANGE_EVENT))
}

/**
 * @param {string} albumId
 * @returns {{ rating: number | null, listenStatus: ListenStatus }}
 */
export function getAlbumAnnotation(albumId) {
  if (!albumId) return { rating: null, listenStatus: null }
  const row = readAll()[albumId]
  return {
    rating: typeof row?.rating === 'number' && row.rating >= 0 && row.rating <= 5 ? row.rating : null,
    listenStatus: row?.listenStatus === 'listening' || row?.listenStatus === 'listened' || row?.listenStatus === 'plan'
      ? row.listenStatus
      : null,
  }
}

/**
 * @param {string} albumId
 * @param {number | null} rating 1–5, or null to clear
 */
export function setAlbumRating(albumId, rating) {
  if (!albumId) return
  const all = readAll()
  const prev = all[albumId] || {}
  if (rating === null || rating === undefined) {
    const { rating: _r, ...rest } = prev
    if (Object.keys(rest).length === 0) delete all[albumId]
    else all[albumId] = rest
  } else {
    const n = Math.round(Number(rating))
    const clamped = Math.min(5, Math.max(1, n))
    all[albumId] = { ...prev, rating: clamped }
  }
  writeAll(all)
}

/**
 * @param {string} albumId
 * @param {ListenStatus} status
 */
export function setAlbumListenStatus(albumId, status) {
  if (!albumId) return
  const all = readAll()
  const prev = all[albumId] || {}
  if (!status) {
    const { listenStatus: _l, ...rest } = prev
    if (Object.keys(rest).length === 0) delete all[albumId]
    else all[albumId] = rest
  } else {
    all[albumId] = { ...prev, listenStatus: status }
  }
  writeAll(all)
}
