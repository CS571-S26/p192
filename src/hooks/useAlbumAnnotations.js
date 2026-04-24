import { useSyncExternalStore } from 'react'
import {
  getAlbumAnnotation,
  getAnnotationsVersion,
  setAlbumListenStatus,
  setAlbumRating,
  subscribeAnnotations,
} from '../utils/albumAnnotations'

/**
 * Re-reads annotations from localStorage whenever they change (same tab).
 */
export function useAlbumAnnotations() {
  const version = useSyncExternalStore(subscribeAnnotations, getAnnotationsVersion, () => 0)

  return {
    version,
    getAnnotation: getAlbumAnnotation,
    setRating: setAlbumRating,
    setListenStatus: setAlbumListenStatus,
  }
}
