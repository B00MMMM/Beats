import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Search, Heart, Users, User, Settings, Plus, MoreVertical } from 'lucide-react'
import Logo from '../Logo/Logo'
import styles from './Sidebar.module.css'
import { useAuth, useUser } from '@clerk/clerk-react'
import axios from '../../api/axios'

function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { getToken } = useAuth()
  const { user } = useUser()
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false)
  const [playlists, setPlaylists] = useState([])
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const token = await getToken();
        const response = await axios.get('/playlists/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPlaylists(response.data);
      } catch (error) {
        console.error("Error fetching playlists:", error);
      }
    };

    if (user) {
      fetchPlaylists();
    }
  }, [user, getToken]); // Add dependencies or handle refresh events (e.g. via Context)

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

      const newPlaylist = response.data;
      setPlaylists([newPlaylist, ...playlists]);
      navigate(`/playlist/${newPlaylist._id}`);
    } catch (error) {
      console.error("Error creating playlist:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const menuItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Heart, label: 'Favorites', path: '/favorites' },
    { icon: Users, label: 'Friends', path: '/friends' }
  ]

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    if (path === '/search') return location.pathname === '/search' || location.pathname.startsWith('/music')
    return location.pathname.startsWith(path)
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <Logo />
        <span>Beats</span>
      </div>

      <div className={styles.menu}>
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.path}
              className={`${styles.menuItem} ${isActive(item.path) ? styles.active : ''}`}
              onClick={() => navigate(item.path)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      <div className={styles.divider}></div>

      <div className={styles.profileMenu}>
        {/* Profile removed as per user request (Clerk handles it) */}
        <button className={styles.menuItem}>
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>

      <div className={styles.library}>
        <div className={styles.libraryHeader}>
          <h2>Your Library</h2>
          <div className={styles.libraryActions}>
            <button className={styles.iconButton} onClick={handleCreatePlaylist} disabled={isLoading}>
              <Plus size={20} />
            </button>
            <button
              className={styles.iconButton}
              onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
            >
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {showPlaylistMenu && (
          <div className={styles.playlistMenu}>
            <button>Playlists</button>
            <button>Artists</button>
            <button>Albums</button>
          </div>
        )}

        <div className={styles.searchBox}>
          <Search size={16} />
          <input type="text" placeholder="Search in library" />
        </div>

        <div className={styles.playlistList}>
          {playlists.map((playlist) => (
            <button
              key={playlist._id}
              className={`${styles.playlistItem} ${location.pathname === `/playlist/${playlist._id}` ? styles.active : ''}`}
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
    </div>
  )
}

export default Sidebar
