import { HashRouter, Route, Routes } from 'react-router'

import CrateDiggerLayout from './CrateDiggerLayout'
import HomePage from '../pages/HomePage'
import SearchResults from '../pages/SearchResults'
import AlbumDetails from '../pages/AlbumDetails'
import MyCrate from '../pages/MyCrate'
import Randomizer from '../pages/Randomizer'

function CrateDiggerApp() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<CrateDiggerLayout />}>
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchResults />} />
          <Route path="album/:id" element={<AlbumDetails />} />
          <Route path="my-crate" element={<MyCrate />} />
          <Route path="randomizer" element={<Randomizer />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default CrateDiggerApp
