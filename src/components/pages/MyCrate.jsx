import { useNavigate } from 'react-router'
import { Alert } from 'react-bootstrap'

function useCrate() {
  const stored = localStorage.getItem('my-crate')
  return stored ? JSON.parse(stored) : []
}

function MyCrate() {
  const albums = useCrate()
  const navigate = useNavigate()

  if (albums.length === 0) {
    return (
      <>
        <h1>My Crate</h1>
        <Alert variant="info">
          Your crate is empty. Browse albums and add some!
        </Alert>
      </>
    )
  }

  return (
    <>
      <h1>My Crate</h1>
      <div className="album-grid">
        {albums.map((album) => (
          <div
            key={album.id}
            className="album-card"
            onClick={() => navigate(`/album/${album.id}`)}
          >
            <img
              src={album.image}
              alt={album.name}
            />
            <p className="album-title">{album.name}</p>
            <p className="album-artist">{album.artist}</p>
          </div>
        ))}
      </div>
    </>
  )
}

export default MyCrate
