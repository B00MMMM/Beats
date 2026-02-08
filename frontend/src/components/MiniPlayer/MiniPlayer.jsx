import { Play, Pause, Cast, CheckCircle2 } from 'lucide-react'
import styles from './MiniPlayer.module.css'
import { usePlayer } from '../../context/PlayerContext'

import { useLocation } from 'react-router-dom';
// ... (imports)

function MiniPlayer() {
  const { currentTrack, isPlaying, togglePlayPause } = usePlayer();
  const location = useLocation();

  if (location.pathname.startsWith('/song/')) {
    return null;
  }

  return (
    // ... (rest of the component)
    <div className={styles.miniPlayer}>
      <div className={styles.trackInfo}>
        {currentTrack?.cover || currentTrack?.album?.cover_small ? (
          <img
            src={currentTrack?.cover || currentTrack?.album?.cover_small}
            alt={currentTrack?.title}
            className={styles.albumArt}
          />
        ) : (
          <div className={styles.albumArtPlaceholder}>
            <span>B</span>
          </div>
        )}
        <div className={styles.trackDetails}>
          <span className={styles.trackTitle}>{currentTrack?.title || 'No track selected'}</span>
          <span className={styles.trackArtist}>{currentTrack?.artist?.name || ''}</span>
        </div>
      </div>
      <div className={styles.controls}>
        <button className={styles.iconButton}>
          <Cast size={18} />
        </button>
        <button className={styles.iconButton}>
          <CheckCircle2 size={18} className={styles.downloaded} />
        </button>
        <button className={styles.playButton} onClick={togglePlayPause}>
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
      </div>
    </div>
  )
}

export default MiniPlayer
