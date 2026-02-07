import Sidebar from '../components/Sidebar/Sidebar';
import TopNavbar from '../components/TopNavbar/TopNavbar';
import BottomPlayer from '../components/BottomPlayer/BottomPlayer';
import MiniPlayer from '../components/MiniPlayer/MiniPlayer';
import BottomNav from '../components/BottomNav/BottomNav';
import ListeningActivityPanel from '../components/ListeningActivityPanel/ListeningActivityPanel';
import NowPlaying from '../components/NowPlaying/NowPlaying';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import axios from '../api/axios';
import styles from './Layout.module.css';

function Layout({ children }) {
  const location = useLocation();
  const { user, isLoaded } = useUser();

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

  return (
    <div className={styles.layout}>
      {!location.pathname.startsWith('/song/') && <Sidebar />}
      <div className={`${styles.mainContent} ${location.pathname.startsWith('/song/') ? styles.fullWidthContent : ''} ${location.pathname.startsWith('/song/') ? styles.songPageMain : ''}`}>
        <div className={styles.topbarShell}>
          {!location.pathname.startsWith('/song/') && <TopNavbar />}
        </div>
        <div className={`${styles.contentArea} ${location.pathname.startsWith('/song/') ? styles.songPageContent : ''}`}>
          {children}
        </div>
      </div>

      {!location.pathname.startsWith('/song/') && (
        <aside className={styles.rightPanel}>
          {location.pathname.startsWith('/friends') ? (
            <>
              <div className={styles.rightPanelTitle}>LISTENING TOO</div>
              <div className={styles.rightPanelBody}>
                <ListeningActivityPanel />
              </div>
            </>
          ) : (
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
      <MiniPlayer />
      {!location.pathname.startsWith('/song/') && <BottomNav />}
    </div>
  );
}

export default Layout;

