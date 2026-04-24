import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Spinner, Alert } from 'react-bootstrap'
import { searchAlbums, prefetchAlbum } from '../../utils/spotify'
import StarRating from '../StarRating'
import { albumToCrateMeta } from '../../utils/crate'

function SearchResults() {
  const [params] = useSearchParams()
  const query = params.get('q')?.trim() || ''
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!query) {
      setAlbums([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      searchAlbums(query, 10, 0),
      searchAlbums(query, 10, 10),
      searchAlbums(query, 10, 20),
    ])
      .then((pages) => {
        if (cancelled) return
        const combined = pages.flatMap((p) => p.items || [])
        const filtered = combined
          .filter((album) => album.album_type !== 'compilation')
          .filter((a, i, arr) => arr.findIndex((b) => b.id === a.id) === i)
        setAlbums(filtered.slice(0, 24))
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [query])

  if (!query) {
    return (
      <>
        <h1 className="page-title-sm">Search</h1>
        <p className="text-muted">Type an album or artist in the search bar above.</p>
      </>
    )
  }

  return (
    <>
      <h1 className="page-title-sm">
        Search Results for <span className="search-query">&ldquo;{query}&rdquo;</span>
      </h1>

      {loading && <Spinner animation="border" className="d-block mx-auto mt-3" />}
      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && !error && albums.length === 0 && (
        <p className="text-muted">No albums found.</p>
      )}

      <div className="album-grid">
        {albums.map((album) => (
          <div key={album.id} className="album-card">
            <div
              className="album-card-main"
              onMouseEnter={() => prefetchAlbum(album.id)}
              onClick={() => navigate(`/album/${album.id}`)}
            >
              <img src={album.images[0]?.url} alt={album.name} />
              <p className="album-title">{album.name}</p>
              <p className="album-artist">
                {album.artists.map((a) => a.name).join(', ')}
              </p>
            </div>
            <div className="album-card-meta">
              <StarRating
                albumId={album.id}
                size="sm"
                albumMeta={albumToCrateMeta(album)}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default SearchResults
