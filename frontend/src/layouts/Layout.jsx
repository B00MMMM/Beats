import Sidebar from '../components/Sidebar/Sidebar';
import TopNavbar from '../components/TopNavbar/TopNavbar';
import BottomPlayer from '../components/BottomPlayer/BottomPlayer';
import MiniPlayer from '../components/MiniPlayer/MiniPlayer';
import BottomNav from '../components/BottomNav/BottomNav';
import ListeningActivityPanel from '../components/ListeningActivityPanel/ListeningActivityPanel';
import NowPlaying from '../components/NowPlaying/NowPlaying';
import { useLocation } from 'react-router-dom';
import styles from './Layout.module.css';

function Layout({ children }) {
  const location = useLocation();

  return (
    <div className={styles.layout}>
      {!location.pathname.startsWith('/song/') && <Sidebar />}
      <div className={`${styles.mainContent} ${location.pathname.startsWith('/song/') ? styles.fullWidthContent : ''}`}>
        <div className={styles.topbarShell}>
          {!location.pathname.startsWith('/song/') && <TopNavbar />}
        </div>
        <div className={styles.contentArea}>
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

