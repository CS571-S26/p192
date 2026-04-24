import { useSyncExternalStore } from 'react'
import {
  getAlbumAnnotation,
  getAnnotationsVersion,
  setAlbumListenStatus,
  subscribeAnnotations,
} from '../utils/albumAnnotations'
import {
  addToCrate,
  getCrateVersion,
  isInCrate,
  removeFromCrate,
  subscribeCrate,
} from '../utils/crate'

const OPTIONS = [
  { value: '', label: 'No tag', short: '+ Tag' },
  { value: 'listening', label: 'Listening to', short: 'Listening' },
  { value: 'listened', label: 'Listened', short: 'Listened' },
  { value: 'plan', label: 'Plan to listen', short: 'Plan' },
]

const REMOVE_VALUE = '__remove__'

/**
 * @param {{
 *   albumId: string,
 *   variant?: 'default' | 'compact',
 *   className?: string,
 *   albumMeta?: { id: string, name: string, artist: string, image?: string }
 * }} props
 */
function ListenStatusSelect({ albumId, variant = 'default', className = '', albumMeta = null }) {
  useSyncExternalStore(subscribeAnnotations, getAnnotationsVersion, () => 0)
  useSyncExternalStore(subscribeCrate, getCrateVersion, () => 0)
  const status = getAlbumAnnotation(albumId).listenStatus || ''
  const inCrate = isInCrate(albumId)
  const isCompact = variant === 'compact'

  return (
    <select
      className={[
        'listen-status-select',
        isCompact ? 'listen-status-select--compact' : '',
        status ? 'has-value' : '',
        className,
      ].filter(Boolean).join(' ')}
      value={status}
      aria-label="Listen status"
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation()
        const v = e.target.value
        if (v === REMOVE_VALUE) {
          removeFromCrate(albumId)
          setAlbumListenStatus(albumId, null)
          return
        }
        const next = v === '' ? null : v
        if (next && albumMeta) addToCrate(albumMeta)
        setAlbumListenStatus(albumId, next)
      }}
    >
      {OPTIONS.map((o) => (
        <option key={o.value || 'none'} value={o.value}>
          {isCompact ? o.short : o.label}
        </option>
      ))}
      {inCrate && (
        <option value={REMOVE_VALUE} className="listen-status-select__remove">
          {isCompact ? 'Remove' : 'Remove from crate'}
        </option>
      )}
    </select>
  )
}

export default ListenStatusSelect
