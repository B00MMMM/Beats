import { Routes, Route } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import Layout from './layouts/Layout'
import HomePage from './pages/HomePage'
import PlaylistPage from './pages/PlaylistPage'
import MusicDetailsPage from './pages/MusicDetailsPage'
import SocialPage from './pages/SocialPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import SearchPage from './pages/SearchPage'
import SongPage from './pages/SongPage'

function App() {
  return (
    <>
      <SignedOut>
        <Routes>
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="*" element={<RedirectToSignIn />} />
        </Routes>
      </SignedOut>
      <SignedIn>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/favorites" element={<HomePage />} />
            <Route path="/playlist/:id" element={<PlaylistPage />} />
            <Route path="/music/:id" element={<MusicDetailsPage />} />
            <Route path="/friends" element={<SocialPage />} />
            <Route path="/song/:deezerId" element={<SongPage />} />
            {/* Add a fallback route for signed-in users */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Layout>
      </SignedIn>
    </>
  )
}

export default App
