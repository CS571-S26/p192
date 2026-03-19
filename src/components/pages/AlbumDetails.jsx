import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Spinner, Alert, Button, Row, Col, ListGroup } from 'react-bootstrap'
import { getAlbum } from '../../utils/spotify'

function AlbumDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [album, setAlbum] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [inCrate, setInCrate] = useState(false)

  useEffect(() => {
    getAlbum(id)
      .then((data) => {
        setAlbum(data)
        const stored = JSON.parse(localStorage.getItem('my-crate') || '[]')
        setInCrate(stored.some((a) => a.id === data.id))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Spinner animation="border" className="d-block mx-auto mt-5" />
  if (error) return <Alert variant="danger">{error}</Alert>
  if (!album) return null

  const addToCrate = () => {
    const stored = JSON.parse(localStorage.getItem('my-crate') || '[]')
    if (stored.some((a) => a.id === album.id)) return
    stored.push({
      id: album.id,
      name: album.name,
      artist: album.artists.map((a) => a.name).join(', '),
      image: album.images[0]?.url,
    })
    localStorage.setItem('my-crate', JSON.stringify(stored))
    setInCrate(true)
  }

  return (
    <>
      <Button variant="outline-dark" className="mb-3" onClick={() => navigate(-1)}>
        &larr; Back
      </Button>

      <Row>
        <Col md={4}>
          <img
            src={album.images[0]?.url}
            alt={album.name}
            className="img-fluid rounded"
          />
        </Col>
        <Col md={8} className="text-start">
          <h1 className="mb-1">{album.name}</h1>
          <h5 className="text-muted mb-3">
            {album.artists.map((a) => a.name).join(', ')}
          </h5>
          <p><strong>Release Date:</strong> {album.release_date}</p>
          <p><strong>Tracks:</strong> {album.total_tracks}</p>
          <div className="d-flex gap-2 mb-3">
            {album.external_urls?.spotify && (
              <a
                href={album.external_urls.spotify}
                target="_blank"
                rel="noreferrer"
                className="btn btn-success btn-sm"
              >
                Open in Spotify
              </a>
            )}
            <Button
              variant={inCrate ? 'secondary' : 'dark'}
              size="sm"
              onClick={addToCrate}
              disabled={inCrate}
            >
              {inCrate ? 'In My Crate' : 'Add to My Crate'}
            </Button>
          </div>

          <h5 className="mt-3">Track List</h5>
          <ListGroup variant="flush">
            {album.tracks.items.map((track, i) => (
              <ListGroup.Item key={track.id} className="d-flex justify-content-between">
                <span>{i + 1}. {track.name}</span>
                <span className="text-muted">
                  {Math.floor(track.duration_ms / 60000)}:
                  {String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}
                </span>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>
      </Row>
    </>
  )
}

export default AlbumDetails
