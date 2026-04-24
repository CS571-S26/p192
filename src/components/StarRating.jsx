import { useSyncExternalStore } from 'react'
import {
  getAlbumAnnotation,
  getAnnotationsVersion,
  setAlbumListenStatus,
  setAlbumRating,
  subscribeAnnotations,
} from '../utils/albumAnnotations'
import { addToCrate } from '../utils/crate'

/**
 * @param {{
 *   albumId: string,
 *   size?: 'sm' | 'md',
 *   albumMeta?: { id: string, name: string, artist: string, image?: string }
 * }} props
 */
function StarRating({ albumId, size = 'md', albumMeta = null }) {
  useSyncExternalStore(subscribeAnnotations, getAnnotationsVersion, () => 0)
  const rating = getAlbumAnnotation(albumId).rating

  const onStarClick = (e, n) => {
    e.preventDefault()
    e.stopPropagation()
    if (rating === n) {
      setAlbumRating(albumId, null)
      return
    }
    if (albumMeta) addToCrate(albumMeta)
    setAlbumRating(albumId, n)
    setAlbumListenStatus(albumId, 'listened')
  }

  return (
    <div
      className={`star-rating star-rating--${size}`}
      onClick={(e) => e.stopPropagation()}
      role="group"
      aria-label={rating ? `${rating} out of 5 stars` : 'No rating'}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star-rating__btn ${n <= (rating ?? 0) ? 'is-on' : ''}`}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          aria-pressed={rating !== null && n <= rating}
          onClick={(e) => onStarClick(e, n)}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default StarRating
