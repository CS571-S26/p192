import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CrateDiggerApp from './components/structural/CrateDiggerApp.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CrateDiggerApp />
  </StrictMode>,
)
