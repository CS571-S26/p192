import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Form, Button, Spinner, Alert, Row, Col } from 'react-bootstrap'
import { searchAlbums } from '../../utils/spotify'

const DECADES = [
  { label: 'Any Decade', value: '' },
  { label: '2020s', value: '2020-2026' },
  { label: '2010s', value: '2010-2019' },
  { label: '2000s', value: '2000-2009' },
  { label: '90s', value: '1990-1999' },
  { label: '80s', value: '1980-1989' },
  { label: '70s', value: '1970-1979' },
]

const GENRES = [
  { label: 'Any Genre', value: '' },
  { label: 'Hip-Hop', value: 'hip-hop' },
  { label: 'Rock', value: 'rock' },
  { label: 'Pop', value: 'pop' },
  { label: 'R&B', value: 'r&b' },
  { label: 'Electronic', value: 'electronic' },
  { label: 'Jazz', value: 'jazz' },
  { label: 'Country', value: 'country' },
  { label: 'Metal', value: 'metal' },
  { label: 'Punk', value: 'punk' },
  { label: 'Soul', value: 'soul' },
  { label: 'Reggae', value: 'reggae' },
  { label: 'Classical', value: 'classical' },
]

function buildQuery(text, decade, genre) {
  let q = text.trim()
  if (genre) q += ` ${genre}`
  if (decade) q += ` year:${decade}`
  return q
}

function SearchResults() {
  const [query, setQuery] = useState('')
  const [decade, setDecade] = useState('')
  const [genre, setGenre] = useState('')
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    const fullQuery = buildQuery(query, decade, genre)
    if (!fullQuery.trim()) return

    setLoading(true)
    setError(null)
    Promise.all([
      searchAlbums(fullQuery, 10, 0),
      searchAlbums(fullQuery, 10, 10),
      searchAlbums(fullQuery, 10, 20),
    ])
      .then((pages) => {
        const combined = pages.flatMap((p) => p.items || [])
        const hasKeyword = query.trim().length > 0
        let filtered = combined
          .filter((album) => album.album_type !== 'compilation')
          .filter((a, i, arr) => arr.findIndex((b) => b.id === a.id) === i)
        if (!hasKeyword) {
          filtered = filtered
            .filter((album) => album.total_tracks >= 6 && album.total_tracks <= 35)
            .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
        }
        setAlbums(filtered.slice(0, 24))
        setSearched(true)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  return (
    <>
      <h1>Search Albums</h1>
      <Form onSubmit={handleSearch} className="mb-4">
        <Row className="g-2 mb-2">
          <Col>
            <Form.Control
              type="text"
              placeholder="Search by album or artist..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Col>
          <Col xs="auto">
            <Button type="submit" variant="light" disabled={loading}>
              Search
            </Button>
          </Col>
        </Row>
        <Row className="g-2">
          <Col xs={6} md={3}>
            <Form.Select value={decade} onChange={(e) => setDecade(e.target.value)}>
              {DECADES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </Form.Select>
          </Col>
          <Col xs={6} md={3}>
            <Form.Select value={genre} onChange={(e) => setGenre(e.target.value)}>
              {GENRES.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </Form.Select>
          </Col>
        </Row>
      </Form>

      {loading && <Spinner animation="border" className="d-block mx-auto" />}
      {error && <Alert variant="danger">{error}</Alert>}

      {searched && albums.length === 0 && !loading && (
        <p className="text-muted">No albums found.</p>
      )}

      <div className="album-grid">
        {albums.map((album) => (
          <div
            key={album.id}
            className="album-card"
            onClick={() => navigate(`/album/${album.id}`)}
          >
            <img src={album.images[0]?.url} alt={album.name} />
            <p className="album-title">{album.name}</p>
            <p className="album-artist">
              {album.artists.map((a) => a.name).join(', ')}
            </p>
          </div>
        ))}
      </div>
    </>
  )
}

export default SearchResults
