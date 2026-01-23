import { ChevronLeft, ChevronRight, Search, Sparkles, Bell, User, Camera } from 'lucide-react'
import { UserButton, SignedIn, SignedOut } from '@clerk/clerk-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './TopNavbar.module.css'

function TopNavbar() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    if (e.key === 'Enter' && query.trim() !== '') {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className={styles.topNavbar}>
      <div className={styles.leftSection}>
        <button className={styles.navButton}>
          <ChevronLeft size={20} />
        </button>
        <button className={styles.navButton}>
          <ChevronRight size={20} />
        </button>
        <button className={styles.homeButton}>
          <span>Home</span>
        </button>
      </div>

      <div className={styles.centerSection}>
        <div className={styles.searchBar}>
          <Search size={18} />
          <input
            type="text"
            placeholder="What do you want to play?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
      </div>

      <div className={styles.rightSection}>
        <button className={styles.mobileSearchButton}>
          <Search size={20} />
        </button>
        <button className={styles.mobileCameraButton}>
          <Camera size={20} />
        </button>
        <button className={styles.aiButton}>
          <Sparkles size={18} />
          <span>AI Chat</span>
        </button>
        <button className={styles.premiumButton}>
          <span>Explore Premium</span>
        </button>
        <button className={styles.iconButton}>
          <Bell size={20} />
        </button>
        <SignedIn>
          <UserButton afterSignOutUrl="/sign-in" />
        </SignedIn>
        <SignedOut>
          <a href="/sign-in" className={styles.signInButton}>Sign In</a>
        </SignedOut>
      </div>
    </div>
  )
}

export default TopNavbar
