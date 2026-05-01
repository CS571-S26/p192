import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Spinner, Alert } from 'react-bootstrap'
import { searchAlbums, searchArtists, prefetchAlbum } from '../../utils/spotify'
import StarRating from '../StarRating'
import AddToCrateButton from '../AddToCrateButton'
import { albumToCrateMeta } from '../../utils/crate'

function SearchResults() {
  const [params] = useSearchParams()
  const query = params.get('q')?.trim() || ''
  const [albums, setAlbums] = useState([])
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!query) {
      setAlbums([])
      setArtists([])
      setLoading(false)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      Promise.all([
        searchAlbums(query, 10, 0),
        searchAlbums(query, 10, 10),
        searchAlbums(query, 10, 20),
      ]),
      searchArtists(query, 8),
    ])
      .then(([albumPages, artistsPage]) => {
        if (cancelled) return

        const combined = albumPages.flatMap((p) => p.items || [])
        const filteredAlbums = combined
          .filter((album) => album?.id && album.album_type !== 'compilation')
          .filter((a, i, arr) => arr.findIndex((b) => b.id === a.id) === i)
        setAlbums(filteredAlbums.slice(0, 24))

        const allArtists = (artistsPage?.items || []).filter(
          (a) => a?.id && a?.name
        )
        setArtists(allArtists.slice(0, 8))
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

      {error && <Alert variant="danger">{error}</Alert>}

      {artists.length > 0 && (
        <section className="search-artists">
          <h2 className="search-section-title">Artists</h2>
          <div className="artist-row">
            {artists.map((artist) => {
              const img = artist.images?.[0]?.url
              return (
                <button
                  key={artist.id}
                  type="button"
                  className="artist-chip"
                  onClick={() => navigate(`/artist/${artist.id}`)}
                  aria-label={`Open ${artist.name} artist page`}
                >
                  {img ? (
                    <img src={img} alt={artist.name} />
                  ) : (
                    <div className="artist-chip-fallback" aria-hidden="true">
                      {artist.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <p className="artist-chip-name">{artist.name}</p>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section>
        {albums.length > 0 && <h2 className="search-section-title">Albums</h2>}

        {loading && albums.length === 0 && (
          <Spinner animation="border" className="d-block mx-auto mt-3" />
        )}

        {!loading && !error && albums.length === 0 && artists.length === 0 && (
          <p className="text-muted">No albums or artists found.</p>
        )}

        {albums.length > 0 && (
          <div className="album-grid">
            {albums.map((album) => (
              <div key={album.id} className="album-card">
                <div
                  className="album-card-main"
                  onMouseEnter={() => prefetchAlbum(album.id)}
                  onClick={() => navigate(`/album/${album.id}`)}
                >
                  <img src={album.images[0]?.url} alt={album.name} />
                  <AddToCrateButton albumMeta={albumToCrateMeta(album)} />
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
        )}
      </section>
    </>
  )
}

export default SearchResults
