import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Search, Heart, Users, User, Settings, Plus, MoreVertical } from 'lucide-react'
import Logo from '../Logo/Logo'
import styles from './Sidebar.module.css'

function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false)

  const playlists = [
    { id: 1, name: 'Liked Songs', icon: 'heart', count: 247 },
    { id: 2, name: 'Workout Mix', icon: 'dumbbell', count: 38 },
    { id: 3, name: 'Chill Vibes', icon: 'sunset', count: 92 },
    { id: 4, name: 'Party Hits', icon: 'party', count: 156 },
    { id: 5, name: 'Focus Flow', icon: 'focus', count: 64 }
  ]

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
        <button className={styles.menuItem}>
          <User size={20} />
          <span>Profile</span>
        </button>
        <button className={styles.menuItem}>
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>

      <div className={styles.library}>
        <div className={styles.libraryHeader}>
          <h2>Your Library</h2>
          <div className={styles.libraryActions}>
            <button className={styles.iconButton}>
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
              key={playlist.id}
              className={styles.playlistItem}
              onClick={() => navigate(`/playlist/${playlist.id}`)}
            >
              <div className={styles.playlistIcon}>
                {playlist.icon === 'heart' && <Heart size={16} fill="currentColor" />}
                {playlist.icon === 'dumbbell' && <span>🏋️</span>}
                {playlist.icon === 'sunset' && <span>🌅</span>}
                {playlist.icon === 'party' && <span>🎉</span>}
                {playlist.icon === 'focus' && <span>🎯</span>}
              </div>
              <div className={styles.playlistInfo}>
                <span className={styles.playlistName}>{playlist.name}</span>
                <span className={styles.playlistMeta}>Playlist • {playlist.count} songs</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Sidebar
