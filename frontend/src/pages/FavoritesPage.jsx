import { useState, useEffect } from 'react'
import { Heart, Pause, Play, Clock } from 'lucide-react'
import SongRow from '../components/SongRow/SongRow'
import styles from './FavoritesPage.module.css'
import { useAuth } from '@clerk/clerk-react'
import axios from '../api/axios'
import { usePlayer } from '../context/PlayerContext'

function FavoritesPage() {
    const { getToken, user } = useAuth()
    const { playTrack, playPlaylist, currentTrack, isPlaying, togglePlayPause, likedSongs, toggleLike } = usePlayer()

    const [favorites, setFavorites] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchFavorites()
    }, [])

    // Refetch when likedSongs changes to keep list in sync if unliked elsewhere
    useEffect(() => {
        if (favorites.length > 0) {
            // Filter out any songs that are no longer in likedSongs set
            // Actually, if we unlike ON this page, we might want it to disappear immediately
            // But user might want to re-like.
            // Let's just strictly sync with fetched data or local filter
            setFavorites(prev => prev.filter(song => likedSongs.has(String(song.deezerId || song.id))))
        }
    }, [likedSongs.size]) // Simple trigger

    const fetchFavorites = async () => {
        try {
            setIsLoading(true)
            const token = await getToken()
            const response = await axios.get('/users/favorites', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setFavorites(response.data)
        } catch (error) {
            console.error("Error fetching favorites:", error)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) return <div style={{ color: 'white', padding: '32px' }}>Loading...</div>

    const themeColor = '#00FFD9'; // Teal for Favorites

    return (
        <div
            className={styles.playlistPage}
            style={{ background: `linear-gradient(to bottom, ${themeColor}66 0%, #121212 100%)` }}
        >
            <div className={styles.mainContent}>
                <div
                    className={styles.playlistHeader}
                    style={{ background: `linear-gradient(to bottom, ${themeColor}40 0%, rgba(0,0,0,0) 100%)` }}
                >
                    <div className={styles.coverContainer}>
                        <Heart size={80} fill="white" color="white" />
                    </div>

                    <div className={styles.playlistInfo}>
                        <span className={styles.type}>Playlist</span>
                        <h1 className={styles.playlistName}>Liked Songs</h1>
                        <p className={styles.description}>Your personal collection of favorites.</p>

                        <div className={styles.meta}>
                            <div className={styles.userIcon}>
                                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{user?.firstName?.[0] || 'U'}</span>
                            </div>
                            <span className={styles.username}>{user?.firstName || 'User'}</span>
                            <span className={styles.stats}>• {favorites.length} songs</span>
                        </div>
                    </div>
                </div>

                <div className={styles.actionsBar}>
                    <button
                        className={styles.playButtonMain}
                        onClick={() => favorites.length > 0 && playPlaylist(favorites, 0)}
                        disabled={favorites.length === 0}
                    >
                        {isPlaying && favorites.some(s => s.deezerId === currentTrack?.deezerId) ? (
                            <Pause size={28} fill="black" />
                        ) : (
                            <Play size={28} fill="black" />
                        )}
                    </button>
                </div>

                <div className={styles.songsTable}>
                    <div className={styles.tableHeader}>
                        <div className={styles.headerNumber}>#</div>
                        <div className={styles.headerTitle}>Title</div>
                        <div className={styles.headerAlbum}>Artist</div>
                        <div className={styles.headerDate}>Date Added</div>
                        <div className={styles.headerDuration}>
                            <Clock size={16} />
                        </div>
                    </div>
                    <div className={styles.tableBody}>
                        {favorites.length > 0 ? favorites.map((song, index) => (
                            <div key={song.deezerId} className={styles.songRowWrapper}>
                                <SongRow
                                    number={index + 1}
                                    cover={song.cover || song.album?.cover_medium}
                                    title={song.title}
                                    artist={song.artist?.name || song.artist}
                                    dateAdded={song.createdAt ? new Date(song.createdAt).toLocaleDateString() : 'Unknown'}
                                    duration={formatDuration(song.duration)}
                                    isPlaying={currentTrack?.deezerId === song.deezerId}
                                    onPlay={() => playPlaylist(favorites, index)}
                                    isLiked={true} // It's the liked songs page!
                                    onLike={() => toggleLike(song)}
                                />
                            </div>
                        )) : (
                            <div style={{ padding: '20px', color: '#b3b3b3' }}>
                                No liked songs yet. Go explore and find some music!
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Helpers
const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default FavoritesPage
