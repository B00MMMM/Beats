import { Home, Search, Library, Sparkles, Plus } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import styles from './BottomNav.module.css'

function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Library, label: 'Your Library', path: '/library' },
    { icon: Sparkles, label: 'Premium', path: '/premium' },
    { icon: Plus, label: 'Create', path: '/create' }
  ]

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    if (path === '/library') return location.pathname === '/favorites' || location.pathname.startsWith('/playlist')
    return location.pathname.startsWith(path)
  }

  return (
    <nav className={styles.bottomNav}>
      {navItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.path)
        return (
          <button
            key={item.path}
            className={`${styles.navItem} ${active ? styles.active : ''}`}
            onClick={() => navigate(item.path)}
          >
            <Icon size={22} />
            <span className={styles.navLabel}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
