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
import FavoritesPage from './pages/FavoritesPage'
import PremiumPage from './pages/PremiumPage'
import AdminDashboard from './pages/AdminDashboard'

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
                <Routes>
                    {/* Admin Route - Outside of standard Layout */}
                    <Route path="/admin/*" element={<AdminDashboard />} />

                    {/* Main App Routes - Wrapped in Layout */}
                    <Route path="*" element={
                        <Layout>
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/search" element={<SearchPage />} />
                                <Route path="/favorites" element={<FavoritesPage />} />
                                <Route path="/playlist/:id" element={<PlaylistPage />} />
                                <Route path="/music/:id" element={<MusicDetailsPage />} />
                                <Route path="/friends" element={<SocialPage />} />
                                <Route path="/song/:deezerId" element={<SongPage />} />
                                <Route path="/premium" element={<PremiumPage />} />
                                {/* Add a fallback route for signed-in users */}
                                <Route path="*" element={<HomePage />} />
                            </Routes>
                        </Layout>
                    } />
                </Routes>
            </SignedIn>
        </>
    )
}

export default App
