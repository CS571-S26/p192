import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Spinner, Alert } from 'react-bootstrap'
import { getRandomAlbum } from '../../utils/spotify'

function Randomizer() {
  const [album, setAlbum] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleRandomize = () => {
    setLoading(true)
    setError(null)
    getRandomAlbum()
      .then((data) => setAlbum(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  return (
    <>
      <h1>Album Randomizer</h1>
      <p className="text-muted mb-4">Feeling adventurous? Discover a random album.</p>
      <Button variant="dark" size="lg" onClick={handleRandomize} disabled={loading}>
        {loading ? <Spinner animation="border" size="sm" /> : 'Dig a Random Album'}
      </Button>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      {album && (
        <div className="mt-4 text-center">
          <img
            src={album.images[0]?.url}
            alt={album.name}
            className="rounded"
            style={{ width: 300, height: 300, objectFit: 'cover', cursor: 'pointer' }}
            onClick={() => navigate(`/album/${album.id}`)}
          />
          <h3 className="mt-3">{album.name}</h3>
          <p className="text-muted">
            {album.artists.map((a) => a.name).join(', ')}
          </p>
          <Button
            variant="outline-dark"
            onClick={() => navigate(`/album/${album.id}`)}
          >
            View Details
          </Button>
        </div>
      )}
    </>
  )
}

export default Randomizer
