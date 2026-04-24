import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Spinner, Alert } from 'react-bootstrap'
import { getArtist, getArtistAlbums, prefetchAlbum } from '../../utils/spotify'
import { getArtistWikipediaSummary } from '../../utils/wikipedia'

function formatFollowers(n) {
  if (!Number.isFinite(n)) return null
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function ArtistDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [artist, setArtist] = useState(null)
  const [albums, setAlbums] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [albumsError, setAlbumsError] = useState(null)
  const [wiki, setWiki] = useState(null)
  const [wikiLoading, setWikiLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setArtist(null)
    setAlbums(null)
    setAlbumsError(null)

    getArtist(id)
      .then((data) => {
        if (cancelled) return
        setArtist(data)
        setLoading(false)

        // Discography depends on the artist name for the search fallback
        // that Spotify's Feb-2026 Dev Mode changes force us to use.
        getArtistAlbums(id, data.name)
          .then((r) => {
            if (!cancelled) setAlbums(r?.items || [])
          })
          .catch((err) => {
            if (!cancelled) {
              console.warn('[ArtistDetails] discography failed:', err)
              setAlbumsError(err.message)
              setAlbums([])
            }
          })
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!artist) return
    let cancelled = false
    setWikiLoading(true)
    setWiki(null)
    getArtistWikipediaSummary(artist.name, artist.genres || [])
      .then((data) => {
        if (!cancelled) setWiki(data)
      })
      .catch(() => {
        if (!cancelled) setWiki(null)
      })
      .finally(() => {
        if (!cancelled) setWikiLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [artist])

  const dedupedAlbums = useMemo(() => {
    if (!albums) return null
    // Dedupe by lowercase name; Spotify lists many region/reissue duplicates.
    const seen = new Map()
    for (const a of albums) {
      const key = (a.name || '').toLowerCase()
      if (!seen.has(key)) seen.set(key, a)
    }
    const list = [...seen.values()]
    list.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))
    return list
  }, [albums])

  if (loading) return <Spinner animation="border" className="d-block mx-auto mt-5" />
  if (error) return <Alert variant="danger">{error}</Alert>
  if (!artist) return null

  const image = artist.images?.[0]?.url
  const followers = formatFollowers(artist.followers?.total)
  const popularity = artist.popularity ?? null

  return (
    <div className="album-detail-page artist-detail-page">
      <button className="ad-back-btn" onClick={() => navigate(-1)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11 1L4 8l7 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>

      <div className="ad-header">
        <div className="ad-header-text">
          <p className="ad-artist-name">Artist</p>
          <h1 className="ad-album-title">{artist.name}</h1>
        </div>
      </div>

      <div className="ad-main">
        <div className="ad-left">
          {image && (
            <img src={image} alt={artist.name} className="ad-cover" />
          )}
          {artist.external_urls?.spotify && (
            <div className="ad-actions">
              <a
                href={artist.external_urls.spotify}
                target="_blank"
                rel="noreferrer"
                className="ad-btn ad-btn-spotify"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                Spotify
              </a>
            </div>
          )}
        </div>

        <div className="ad-center">
          <div className="ad-wiki-section">
            <h3 className="ad-section-title">About</h3>
            {wikiLoading && (
              <Spinner animation="border" size="sm" className="text-secondary" />
            )}
            {!wikiLoading && wiki && (
              <>
                <p className="ad-wiki-text">{wiki.extract}</p>
                <p className="ad-wiki-attr">
                  {wiki.url ? (
                    <a href={wiki.url} target="_blank" rel="noreferrer">Wikipedia</a>
                  ) : 'Wikipedia'}
                  {' '}&middot;{' '}
                  <a
                    href="https://en.wikipedia.org/wiki/Wikipedia:Text_of_the_Creative_Commons_Attribution-ShareAlike_4.0_International_License"
                    target="_blank"
                    rel="noreferrer"
                  >
                    CC BY-SA
                  </a>
                </p>
              </>
            )}
            {!wikiLoading && !wiki && (
              <p className="ad-wiki-empty">No Wikipedia article found for this artist.</p>
            )}
          </div>

          <div className="ad-tracklist-section">
            <h3 className="ad-section-title">Discography</h3>
            {!dedupedAlbums && !albumsError && (
              <Spinner animation="border" size="sm" className="text-secondary" />
            )}
            {albumsError && (
              <p className="ad-wiki-empty">Couldn't load discography ({albumsError}).</p>
            )}
            {dedupedAlbums && !albumsError && dedupedAlbums.length === 0 && (
              <p className="ad-wiki-empty">No discography available.</p>
            )}
            {dedupedAlbums && dedupedAlbums.length > 0 && (
              <div className="album-grid artist-discography">
                {dedupedAlbums.map((album) => (
                  <div key={album.id} className="album-card">
                    <div
                      className="album-card-main"
                      onMouseEnter={() => prefetchAlbum(album.id)}
                      onClick={() => navigate(`/album/${album.id}`)}
                    >
                      <img src={album.images?.[0]?.url} alt={album.name} />
                      <p className="album-title">{album.name}</p>
                      <p className="album-artist">
                        {album.release_date?.slice(0, 4) || ''}
                        {album.album_type ? ` · ${album.album_type}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="ad-right">
          <div className="ad-details-box">
            <h3 className="ad-details-title">Details</h3>

            {artist.genres?.length > 0 && (
              <div className="ad-detail-row">
                <span className="ad-detail-value ad-detail-tags">
                  {artist.genres.map((g) => (
                    <span key={g} className="ad-genre-tag">{g}</span>
                  ))}
                </span>
                <span className="ad-detail-label">/ genre</span>
              </div>
            )}

            {followers && (
              <div className="ad-detail-row">
                <span className="ad-detail-value">{followers} followers</span>
                <span className="ad-detail-label">/ followers</span>
              </div>
            )}

            {popularity !== null && (
              <div className="ad-detail-row">
                <div className="ad-popularity">
                  <div className="ad-popularity-bar">
                    <div className="ad-popularity-fill" style={{ width: `${popularity}%` }} />
                  </div>
                  <span className="ad-detail-value">{popularity}</span>
                </div>
                <span className="ad-detail-label">/ popularity</span>
              </div>
            )}

            {dedupedAlbums && (
              <div className="ad-detail-row">
                <span className="ad-detail-value">{dedupedAlbums.length}</span>
                <span className="ad-detail-label">/ releases</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArtistDetails
