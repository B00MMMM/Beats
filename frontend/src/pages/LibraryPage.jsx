import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import styles from './LibraryPage.module.css';
import { useAuth, useUser } from '@clerk/clerk-react';
import { usePlayer } from '../context/PlayerContext';
import axios from '../api/axios';

function LibraryPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { getToken } = useAuth();
    const { user } = useUser();
    const { playlists, fetchPlaylists } = usePlayer(); // Use global state
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreatePlaylist = async () => {
        try {
            if (isLoading) return;
            setIsLoading(true);
            const token = await getToken();
            const response = await axios.post('/playlists',
                {
                    title: `My Playlist #${playlists.length + 1}`,
                    description: "New playlist"
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Refresh global list
            await fetchPlaylists();

            const newPlaylist = response.data;
            navigate(`/playlist/${newPlaylist._id}`);
        } catch (error) {
            console.error("Error creating playlist:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter logic
    const filteredPlaylists = playlists.filter(playlist =>
        playlist.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.libraryPage}>
            <div className={styles.stickyHeader}>
                <div className={styles.libraryHeader}>
                    <h2>Your Library</h2>
                    <div className={styles.libraryActions}>
                        <button className={styles.iconButton} onClick={handleCreatePlaylist} disabled={isLoading}>
                            <Plus size={24} />
                        </button>
                    </div>
                </div>

                <div className={styles.searchBox}>
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search in library"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.playlistList}>
                {filteredPlaylists.map((playlist) => (
                    <button
                        key={playlist._id}
                        className={styles.playlistItem}
                        onClick={() => navigate(`/playlist/${playlist._id}`)}
                    >
                        <div className={styles.playlistIcon}>
                            {playlist.imageUrl ? (
                                <img src={playlist.imageUrl} alt={playlist.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span>🎵</span>
                            )}
                        </div>
                        <div className={styles.playlistInfo}>
                            <span className={styles.playlistName}>{playlist.title}</span>
                            <span className={styles.playlistMeta}>Playlist • {user?.firstName || 'User'}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default LibraryPage;
