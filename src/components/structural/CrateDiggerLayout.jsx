import { useEffect, useState } from 'react'
import { Nav, Navbar } from 'react-bootstrap'
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router'

function NavbarSearch() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const onSearchPage = location.pathname === '/search'
  const [value, setValue] = useState(onSearchPage ? params.get('q') || '' : '')

  useEffect(() => {
    if (onSearchPage) setValue(params.get('q') || '')
    else setValue('')
  }, [location.pathname, params, onSearchPage])

  const onSubmit = (e) => {
    e.preventDefault()
    const q = value.trim()
    if (!q) return
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <form className="navbar-search" onSubmit={onSubmit} role="search">
      <svg className="navbar-search__icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
      </svg>
      <input
        type="search"
        className="navbar-search__input"
        placeholder="Search albums, artists..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search albums and artists"
      />
    </form>
  )
}

function CrateDiggerLayout() {
  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="px-3">
        <Navbar.Brand as={Link} to="/" className="navbar-brand-blonde">
          Crate Digger
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            <Nav.Link as={Link} to="/my-crate">My Crate</Nav.Link>
            <Nav.Link as={Link} to="/randomizer">Randomizer</Nav.Link>
          </Nav>
          <NavbarSearch />
        </Navbar.Collapse>
      </Navbar>
      <div className="page-wide">
        <Outlet />
      </div>
    </>
  )
}

export default CrateDiggerLayout
