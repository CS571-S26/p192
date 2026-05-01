import { useSyncExternalStore } from 'react'
import {
  addToCrate,
  getCrateVersion,
  isInCrate,
  removeFromCrate,
  subscribeCrate,
} from '../utils/crate'

/**
 * Small circular toggle pinned to the top-right of an album card cover.
 * Shows "+" when the album isn't in the crate, "✓" once it is. Clicking
 * the checked state removes it from the crate.
 *
 * @param {{
 *   albumMeta: { id: string, name: string, artist: string, image?: string }
 * }} props
 */
function AddToCrateButton({ albumMeta }) {
  useSyncExternalStore(subscribeCrate, getCrateVersion, () => 0)
  if (!albumMeta?.id) return null
  const inCrate = isInCrate(albumMeta.id)

  const handleClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (inCrate) {
      removeFromCrate(albumMeta.id)
    } else {
      addToCrate(albumMeta)
    }
  }

  const label = inCrate ? 'Remove from crate' : 'Add to crate'

  return (
    <button
      type="button"
      className={`add-to-crate-btn ${inCrate ? 'is-in-crate' : ''}`}
      onClick={handleClick}
      aria-label={label}
      aria-pressed={inCrate}
      title={label}
    >
      <svg
        viewBox="0 0 12 12"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M2 6h8" />
        {!inCrate && <path d="M6 2v8" />}
      </svg>
    </button>
  )
}

export default AddToCrateButton
