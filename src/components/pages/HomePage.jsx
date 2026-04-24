import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Spinner, Alert } from 'react-bootstrap'
import { searchAlbums, prefetchAlbum } from '../../utils/spotify'
import StarRating from '../StarRating'
import { albumToCrateMeta } from '../../utils/crate'

const SECTIONS = [
  { title: 'New & Popular', query: 'year:2024-2026', sort: 'popularity', rowLimit: 18 },
  { title: "2020's", query: 'year:2020-2023', sort: 'popularity' },
  { title: "2010's", query: 'year:2010-2019', sort: 'popularity' },
  { title: "2000's", query: 'year:2000-2009', sort: 'popularity' },
  { title: "90's", query: 'year:1990-1999', sort: 'popularity' },
  { title: "80's", query: 'year:1980-1989', sort: 'popularity' },
  { title: "70's", query: 'year:1970-1979', sort: 'popularity' },
]

function AlbumRow({ title, query, sort, loadDelayMs = 0, deferUntilVisible = false, rowLimit = 12 }) {
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [visible, setVisible] = useState(!deferUntilVisible)
  const sentinelRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (visible || !deferUntilVisible) return
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { rootMargin: '400px 0px', threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [visible, deferUntilVisible])

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    setLoading(true)
    setError(null)

    const timer = setTimeout(() => {
      Promise.all([
        searchAlbums(query, 10, 0),
        searchAlbums(query, 10, 10),
        searchAlbums(query, 10, 20),
        searchAlbums(query, 10, 30),
      ])
        .then((pages) => {
          if (cancelled) return
          const combined = pages.flatMap((p) => p.items || [])
          let filtered = combined
            .filter((album) => album.album_type !== 'compilation')
            .filter((album) => album.total_tracks >= 6 && album.total_tracks <= 35)
            .filter((a, i, arr) => arr.findIndex((b) => b.id === a.id) === i)
          if (sort === 'popularity') {
            filtered.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
          }
          filtered = filtered.slice(0, rowLimit)
          setAlbums(filtered)
        })
        .catch((err) => {
          if (!cancelled) setError(err.message)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, loadDelayMs)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, sort, loadDelayMs, visible, rowLimit])

  if (!visible) {
    return (
      <div
        ref={sentinelRef}
        className="home-section-sentinel"
        aria-hidden
      />
    )
  }

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
  )
}

function HomePage() {
  return (
    <div className="home-page">
      {SECTIONS.map((section, index) => (
        <AlbumRow
          key={section.title}
          title={section.title}
          query={section.query}
          sort={section.sort}
          rowLimit={section.rowLimit}
          loadDelayMs={index * 120}
          deferUntilVisible={index >= 2}
        />
      ))}
    </div>
  )
}

export default HomePage
