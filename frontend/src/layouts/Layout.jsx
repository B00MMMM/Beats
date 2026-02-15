import Sidebar from '../components/Sidebar/Sidebar';
import TopNavbar from '../components/TopNavbar/TopNavbar';
import BottomPlayer from '../components/BottomPlayer/BottomPlayer';
import MiniPlayer from '../components/MiniPlayer/MiniPlayer';
import BottomNav from '../components/BottomNav/BottomNav';
import ListeningActivityPanel from '../components/ListeningActivityPanel/ListeningActivityPanel';
import NowPlaying from '../components/NowPlaying/NowPlaying';
import AIChat from '../components/AIChat/AIChat';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useAIChat } from '../context/AIChatContext';
import axios from '../api/axios';
import styles from './Layout.module.css';

function Layout({ children }) {
  const location = useLocation();
  const { user, isLoaded } = useUser();
  const { isAIChatOpen, setIsAIChatOpen, toggleAIChat } = useAIChat();

  useEffect(() => {
    const syncUser = async () => {
      if (isLoaded && user) {
        try {
          await axios.post('/auth/callback', {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl
          });
        } catch (error) {
          console.error("Error syncing user:", error);
        }
      }
    };

    syncUser();
  }, [isLoaded, user]);

  // Manage AI Chat visibility when entering/leaving Song Page
  useEffect(() => {
    const isSongPage = location.pathname.startsWith('/song/');

    if (isSongPage) {
      if (isAIChatOpen) {
        // Save state to sessionStorage so we know to restore it
        sessionStorage.setItem('restoreAIChat', 'true');
        setIsAIChatOpen(false);
      }
    } else {
      // Leaving song page (or on normal page)
      const shouldRestore = sessionStorage.getItem('restoreAIChat');
      if (shouldRestore === 'true') {
        if (!isAIChatOpen) {
          setIsAIChatOpen(true);
        }
        sessionStorage.removeItem('restoreAIChat');
      }
    }
  }, [location.pathname, isAIChatOpen, setIsAIChatOpen]);

  // Check for Social Page Chat Mode
  const isSocialPage = location.pathname.startsWith('/social') || location.pathname.startsWith('/friends');
  const searchParams = new URLSearchParams(location.search);
  const isChatMode = isSocialPage && searchParams.get('mode') === 'chat';



  return (
    <div className={`${styles.layout} ${isAIChatOpen ? styles.aiChatExpanded : ''}`}>
      {!location.pathname.startsWith('/song/') && <Sidebar />}
      <div className={`${styles.mainContent} ${location.pathname.startsWith('/song/') ? styles.fullWidthContent : ''} ${location.pathname.startsWith('/song/') ? styles.songPageMain : ''} ${isAIChatOpen ? styles.aiChatMainContent : ''} ${isChatMode ? styles.socialChatMain : ''}`}>
        <div className={styles.topbarShell}>
          {!location.pathname.startsWith('/song/') && <TopNavbar />}
        </div>
        <div className={`${styles.contentArea} ${location.pathname.startsWith('/song/') ? styles.songPageContent : ''} ${isSocialPage ? styles.socialPageContent : ''} ${location.pathname === '/library' ? styles.libraryContent : ''}`}>
          {children}
        </div>
      </div>

      {!location.pathname.startsWith('/song/') && (
        <aside className={`${styles.rightPanel} ${isAIChatOpen ? styles.aiChatPanel : ''}`}>
          {isAIChatOpen ? (
            // AI Chat available on ALL pages when toggled
            <>
              <div className={styles.rightPanelTitle}>AI CHAT</div>
              <div className={styles.rightPanelBody}>
                <AIChat />
              </div>
            </>
          ) : location.pathname.startsWith('/friends') ? (
            // Friends page default: Shows "LISTENING TOO" 
            <>
              <div className={styles.rightPanelTitle}>LISTENING TOO</div>
              <div className={styles.rightPanelBody}>
                <ListeningActivityPanel />
              </div>
            </>
          ) : (
            // Other pages default: Shows "NOW PLAYING"
            <>
              <div className={styles.rightPanelTitle}>NOW PLAYING</div>
              <div className={styles.rightPanelBody}>
                <NowPlaying />
              </div>
            </>
          )}
        </aside>
      )}

      <BottomPlayer />
      <MiniPlayer isChatMode={isChatMode} />
      {!location.pathname.startsWith('/song/') && !isChatMode && <BottomNav />}
    </div>
  );
}

export default Layout;

