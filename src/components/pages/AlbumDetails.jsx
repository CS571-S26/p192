import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link, useParams, useNavigate } from 'react-router'
import { Spinner, Alert } from 'react-bootstrap'
import { getAlbum, getArtist } from '../../utils/spotify'
import { getAlbumWikipediaSummary } from '../../utils/wikipedia'
import StarRating from '../StarRating'
import ListenStatusSelect from '../ListenStatusSelect'
import {
  addToCrate as addAlbumToCrate,
  albumToCrateMeta,
  getCrateVersion,
  isInCrate,
  removeFromCrate as removeAlbumFromCrate,
  subscribeCrate,
} from '../../utils/crate'

function formatDuration(ms) {
  const mins = Math.floor(ms / 60000)
  const secs = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')
  return `${mins}:${secs}`
}

function totalDuration(tracks) {
  const total = tracks.reduce((sum, t) => sum + t.duration_ms, 0)
  const mins = Math.floor(total / 60000)
  const secs = String(Math.floor((total % 60000) / 1000)).padStart(2, '0')
  return `${mins}:${secs}`
}

function AlbumDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [album, setAlbum] = useState(null)
  const [artistData, setArtistData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [wikiSummary, setWikiSummary] = useState(null)
  const [wikiLoading, setWikiLoading] = useState(false)
  useSyncExternalStore(subscribeCrate, getCrateVersion, () => 0)
  const inCrate = album ? isInCrate(album.id) : false

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setArtistData(null)
    setAlbum(null)

    getAlbum(id)
      .then((data) => {
        if (cancelled) return
        setAlbum(data)
        setLoading(false)

        const artistId = data.artists?.[0]?.id
        if (artistId) {
          getArtist(artistId)
            .then((artist) => {
              if (!cancelled && artist) setArtistData(artist)
            })
            .catch(() => {})
        }
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
    if (!album) return
    let cancelled = false
    setWikiLoading(true)
    setWikiSummary(null)
    const artists = album.artists.map((a) => a.name)
    getAlbumWikipediaSummary(album.name, artists)
      .then((data) => {
        if (!cancelled) setWikiSummary(data)
      })
      .catch(() => {
        if (!cancelled) setWikiSummary(null)
      })
      .finally(() => {
        if (!cancelled) setWikiLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [album])

  if (loading) return <Spinner animation="border" className="d-block mx-auto mt-5" />
  if (error) return <Alert variant="danger">{error}</Alert>
  if (!album) return null

  const crateMeta = albumToCrateMeta(album)
  const handleAddToCrate = () => addAlbumToCrate(crateMeta)
  const handleRemoveFromCrate = () => removeAlbumFromCrate(album.id)

  const renderArtistLinks = (artists) =>
    artists.map((a, i) => (
      <span key={a.id || a.name}>
        {a.id ? (
          <Link to={`/artist/${a.id}`} className="artist-link">{a.name}</Link>
        ) : (
          a.name
        )}
        {i < artists.length - 1 ? ', ' : ''}
      </span>
    ))
  const genres = artistData?.genres?.length
    ? artistData.genres
    : album.genres?.length
      ? album.genres
      : null
  const label = album.label || null
  const albumType = album.album_type
    ? album.album_type.charAt(0).toUpperCase() + album.album_type.slice(1)
    : null
  const popularity = album.popularity ?? null
  const copyrightText = album.copyrights?.[0]?.text || null

  const featuredArtists = new Set()
  album.tracks.items.forEach((track) => {
    track.artists?.forEach((a) => {
      if (!album.artists.some((main) => main.id === a.id)) {
        featuredArtists.add(a.name)
      }
    })
  })

  return (
    <div className="album-detail-page">
      <button className="ad-back-btn" onClick={() => navigate(-1)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11 1L4 8l7 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>

      <div className="ad-header">
        <div className="ad-header-text">
          <p className="ad-artist-name">{renderArtistLinks(album.artists)}</p>
          <h1 className="ad-album-title">{album.name}</h1>
          <div className="ad-annotation-row">
            <StarRating albumId={album.id} size="md" albumMeta={crateMeta} />
            <ListenStatusSelect albumId={album.id} albumMeta={crateMeta} />
          </div>
        </div>
      </div>

      <div className="ad-main">
        <div className="ad-left">
          <img
            src={album.images[0]?.url}
            alt={album.name}
            className="ad-cover"
          />
          <div className="ad-actions">
            {album.external_urls?.spotify && (
              <a
                href={album.external_urls.spotify}
                target="_blank"
                rel="noreferrer"
                className="ad-btn ad-btn-spotify"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                Spotify
              </a>
            )}
            <button
              className={`ad-btn ${inCrate ? 'ad-btn-in-crate' : 'ad-btn-crate'}`}
              onClick={inCrate ? handleRemoveFromCrate : handleAddToCrate}
            >
              {inCrate ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.485 1.431a1.473 1.473 0 0 1 2.104 2.062l-7.07 9.07a1.473 1.473 0 0 1-2.164.067L2.476 8.75a1.473 1.473 0 0 1 2.085-2.085l2.835 2.835 5.989-7.97a.536.536 0 0 1 .1-.1z"/></svg>
                  In My Crate
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/></svg>
                  Add to Crate
                </>
              )}
            </button>
          </div>
        </div>

        <div className="ad-center">
          <div className="ad-wiki-section">
            <h3 className="ad-section-title">About</h3>
            {wikiLoading && (
              <Spinner animation="border" size="sm" className="text-secondary" />
            )}
            {!wikiLoading && wikiSummary && (
              <>
                <p className="ad-wiki-text">{wikiSummary.extract}</p>
                <p className="ad-wiki-attr">
                  {wikiSummary.url ? (
                    <a href={wikiSummary.url} target="_blank" rel="noreferrer">Wikipedia</a>
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
            {!wikiLoading && !wikiSummary && (
              <p className="ad-wiki-empty">No Wikipedia article found for this album.</p>
            )}
          </div>

          <div className="ad-tracklist-section">
            <h3 className="ad-section-title">Track List</h3>
            <div className="ad-tracklist">
              {album.tracks.items.map((track, i) => (
                <div key={track.id} className="ad-track-row">
                  <span className="ad-track-num">{i + 1}.</span>
                  <span className="ad-track-name">{track.name}</span>
                  <span className="ad-track-duration">{formatDuration(track.duration_ms)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ad-right">
          <div className="ad-details-box">
            <h3 className="ad-details-title">Details</h3>

            <div className="ad-detail-row">
              <span className="ad-detail-value">{album.release_date}</span>
              <span className="ad-detail-label">/ release date</span>
            </div>

            {albumType && (
              <div className="ad-detail-row">
                <span className="ad-detail-value">{albumType}</span>
                <span className="ad-detail-label">/ type</span>
              </div>
            )}

            <div className="ad-detail-row">
              <span className="ad-detail-value">{album.total_tracks} tracks &middot; {totalDuration(album.tracks.items)}</span>
              <span className="ad-detail-label">/ length</span>
            </div>

            {label && (
              <div className="ad-detail-row">
                <span className="ad-detail-value">{label}</span>
                <span className="ad-detail-label">/ label</span>
              </div>
            )}

            {genres && (
              <div className="ad-detail-row">
                <span className="ad-detail-value ad-detail-tags">
                  {genres.map((g) => (
                    <span key={g} className="ad-genre-tag">{g}</span>
                  ))}
                </span>
                <span className="ad-detail-label">/ genre</span>
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

            <div className="ad-detail-row">
              <span className="ad-detail-value">{renderArtistLinks(album.artists)}</span>
              <span className="ad-detail-label">/ artist</span>
            </div>

            {featuredArtists.size > 0 && (
              <div className="ad-detail-row">
                <span className="ad-detail-value">{[...featuredArtists].join(', ')}</span>
                <span className="ad-detail-label">/ featured</span>
              </div>
            )}

            {copyrightText && (
              <div className="ad-detail-row ad-detail-copyright">
                <span className="ad-detail-value">{copyrightText}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlbumDetails
