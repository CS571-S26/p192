import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Spinner, Alert } from 'react-bootstrap'
import { getRandomAlbum, getRandomAlbums, prefetchAlbum } from '../../utils/spotify'
import StarRating from '../StarRating'
import { albumToCrateMeta } from '../../utils/crate'

const PAGE_SIZE = 18

function Randomizer() {
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)
  const [digging, setDigging] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const loadAlbums = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getRandomAlbums(PAGE_SIZE)
      .then((data) => {
        if (!cancelled) setAlbums(data)
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
  }, [])

  useEffect(() => {
    const cleanup = loadAlbums()
    return cleanup
  }, [loadAlbums])

  const handleDig = async () => {
    if (digging) return
    if (albums.length > 0) {
      const pick = albums[Math.floor(Math.random() * albums.length)]
      prefetchAlbum(pick.id)
      navigate(`/album/${pick.id}`)
      return
    }
    setDigging(true)
    setError(null)
    try {
      const pick = await getRandomAlbum()
      prefetchAlbum(pick.id)
      navigate(`/album/${pick.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setDigging(false)
    }
  }

  return (
    <div className="home-page">
      <div className="randomizer-header">
        <h1 className="randomizer-title">Album Randomizer</h1>
        <div className="randomizer-actions">
          <Button
            variant="light"
            size="lg"
            className="randomizer-btn"
            onClick={handleDig}
            disabled={digging}
          >
            {digging ? <Spinner animation="border" size="sm" /> : 'Dig'}
          </Button>
          <Button
            variant="outline-light"
            size="lg"
            className="randomizer-btn"
            onClick={loadAlbums}
            disabled={loading}
          >
            {loading ? <Spinner animation="border" size="sm" /> : 'Shuffle'}
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      {loading && albums.length === 0 && (
        <Spinner animation="border" className="d-block mx-auto my-5" />
      )}

      {!loading && !error && albums.length === 0 && (
        <p className="text-muted text-center my-5">
          No albums found — try Shuffle again.
        </p>
      )}

      {albums.length > 0 && (
        <section>
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
        </section>
      )}
    </div>
  )
}

export default Randomizer
