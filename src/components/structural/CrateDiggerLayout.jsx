import { Container, Nav, Navbar } from 'react-bootstrap'
import { Link, Outlet } from 'react-router'

function CrateDiggerLayout() {
  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="px-3">
        <Navbar.Brand as={Link} to="/">Crate Digger</Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            <Nav.Link as={Link} to="/search">Search</Nav.Link>
            <Nav.Link as={Link} to="/my-crate">My Crate</Nav.Link>
            <Nav.Link as={Link} to="/randomizer">Randomizer</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
      <div className="page-wide">
        <Outlet />
      </div>
    </>
  )
}

export default CrateDiggerLayout
