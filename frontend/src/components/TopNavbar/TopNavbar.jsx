import { ChevronLeft, ChevronRight, Search, Sparkles, Bell, User, Camera } from 'lucide-react'
import { UserButton, SignedIn, SignedOut, useAuth } from '@clerk/clerk-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../../context/SocketContext'
import { useAIChat } from '../../context/AIChatContext'
import NotificationModal from '../NotificationModal/NotificationModal'
import axios from '../../api/axios'
import styles from './TopNavbar.module.css'

function TopNavbar() {
  const [query, setQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { socket } = useSocket();
  const { toggleAIChat, isAIChatOpen } = useAIChat();

  // Fetch initial notification count (unread)
  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const response = await axios.get('/notifications/unread-count', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotificationCount(response.data.count);
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchNotificationCount();
  }, [getToken]);

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notification) => {
      setNotificationCount(prev => prev + 1);
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket]);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && query.trim() !== '') {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleNotificationClick = () => {
    setShowNotifications(true);
    setNotificationCount(0); // Clear count when opened
  };

  return (
    <div className={styles.topNavbar}>
      <div className={styles.leftSection}>
        <button className={styles.navButton} onClick={() => navigate(-1)}>
          <ChevronLeft size={20} />
        </button>
        <button className={styles.navButton} onClick={() => navigate(1)}>
          <ChevronRight size={20} />
        </button>
        <button className={styles.homeButton} onClick={() => navigate('/')}>
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
        <button
          className={`${styles.mobileAIButton} ${isAIChatOpen ? styles.active : ''}`}
          onClick={toggleAIChat}
        >
          <Sparkles size={20} />
        </button>
        <button className={styles.mobileNotificationButton} onClick={handleNotificationClick}>
          <Bell size={20} />
          {notificationCount > 0 && (
            <span className={styles.mobileNotificationBadge}>
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>
        <button
          className={`${styles.aiButton} ${isAIChatOpen ? styles.active : ''}`}
          onClick={toggleAIChat}
        >
          <Sparkles size={18} />
          <span>AI Chat</span>
        </button>
        <button className={styles.premiumButton} onClick={() => navigate('/premium')}>
          <span>Explore Premium</span>
        </button>
        <button className={styles.iconButton} onClick={handleNotificationClick}>
          <Bell size={20} />
          {notificationCount > 0 && (
            <span className={styles.notificationBadge}>
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>
        <SignedIn>
          <UserButton afterSignOutUrl="/sign-in" />
        </SignedIn>
        <SignedOut>
          <a href="/sign-in" className={styles.signInButton}>Sign In</a>
        </SignedOut>
      </div>

      <NotificationModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  )
}

export default TopNavbar
