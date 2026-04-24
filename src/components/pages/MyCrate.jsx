import { useMemo, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router'
import { Alert } from 'react-bootstrap'
import { prefetchAlbum } from '../../utils/spotify'
import { useAlbumAnnotations } from '../../hooks/useAlbumAnnotations'
import StarRating from '../StarRating'
import ListenStatusSelect from '../ListenStatusSelect'
import { getCrate, getCrateVersion, subscribeCrate } from '../../utils/crate'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'listening', label: 'Listening to' },
  { id: 'listened', label: 'Listened' },
  { id: 'plan', label: 'Plan to listen' },
  { id: 'untagged', label: 'No tag' },
]

function MyCrate() {
  useSyncExternalStore(subscribeCrate, getCrateVersion, () => 0)
  const albums = getCrate()
  const navigate = useNavigate()
  const { version, getAnnotation } = useAlbumAnnotations()
  const [filter, setFilter] = useState('all')

  const filteredAlbums = useMemo(() => {
    if (filter === 'all') return albums
    return albums.filter((a) => {
      const ls = getAnnotation(a.id).listenStatus
      if (filter === 'untagged') return !ls
      return ls === filter
    })
  }, [albums, filter, getAnnotation, version])

  if (albums.length === 0) {
    return (
      <>
        <h1 className="page-title-sm">My Crate</h1>
        <Alert variant="info">
          Your crate is empty. Browse albums and add some — or rate any album to
          auto-save it here.
        </Alert>
      </>
    )
  }

  return (
    <>
      <h1 className="page-title-sm">My Crate</h1>

      <div className="crate-filters" role="toolbar" aria-label="Filter by listen status">
        <span className="crate-filters__label">Show:</span>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`crate-filter-btn ${filter === f.id ? 'is-active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredAlbums.length === 0 ? (
        <p className="text-muted">No albums match this filter.</p>
      ) : (
        <div className="album-grid">
          {filteredAlbums.map((album) => (
            <div key={album.id} className="album-card">
              <div
                className="album-card-main"
                onMouseEnter={() => prefetchAlbum(album.id)}
                onClick={() => navigate(`/album/${album.id}`)}
              >
                <img src={album.image} alt={album.name} />
                <p className="album-title">{album.name}</p>
                <p className="album-artist">{album.artist}</p>
              </div>
              <div className="album-card-meta album-card-meta--row">
                <StarRating albumId={album.id} size="sm" albumMeta={album} />
                <ListenStatusSelect albumId={album.id} variant="compact" albumMeta={album} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default MyCrate
