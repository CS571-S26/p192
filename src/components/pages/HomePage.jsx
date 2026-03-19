import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Spinner, Alert } from 'react-bootstrap'
import { searchAlbums } from '../../utils/spotify'

const SECTIONS = [
  { title: 'New Releases', query: 'year:2026', sort: 'popularity' },
  { title: 'Popular', query: 'year:2020-2026', sort: 'popularity' },
  { title: "2010's", query: 'year:2010-2019', sort: 'popularity' },
  { title: "2000's", query: 'year:2000-2009', sort: 'popularity' },
  { title: "90's", query: 'year:1990-1999', sort: 'popularity' },
  { title: "80's", query: 'year:1980-1989', sort: 'popularity' },
  { title: "70's", query: 'year:1970-1979', sort: 'popularity' },
]

function AlbumRow({ title, query, sort }) {
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      searchAlbums(query, 10, 0),
      searchAlbums(query, 10, 10),
      searchAlbums(query, 10, 20),
      searchAlbums(query, 10, 30),
    ])
      .then((pages) => {
        const combined = pages.flatMap((p) => p.items || [])
        let filtered = combined
          .filter((album) => album.album_type !== 'compilation')
          .filter((album) => album.total_tracks >= 6 && album.total_tracks <= 35)
          .filter((a, i, arr) => arr.findIndex((b) => b.id === a.id) === i)
        if (sort === 'popularity') {
          filtered.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
        }
        filtered = filtered.slice(0, 12)
        setAlbums(filtered)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [query])

  if (loading) return <Spinner animation="border" size="sm" className="d-block mx-auto my-3" />
  if (error) return <Alert variant="danger" className="py-1 px-2 mb-2">{error}</Alert>
  if (albums.length === 0) return null

  return (
    <section>
      <div className="section-header">
        <h2>{title}</h2>
      </div>
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
    </section>
  )
}

function HomePage() {
  return (
    <>
      {SECTIONS.map((section) => (
        <AlbumRow key={section.title} title={section.title} query={section.query} sort={section.sort} />
      ))}
    </>
  )
}

export default HomePage
