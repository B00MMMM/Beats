import { Heart, Volume2, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, List, Cast, Maximize } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './BottomPlayer.module.css';
import { usePlayer } from '../../context/PlayerContext';

function BottomPlayer() {
  const { currentTrack, isPlaying, duration, currentTime, volume, setVolume, togglePlayPause, handleProgressBarClick } = usePlayer();
  const navigate = useNavigate();
  const location = useLocation();

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMaximizeClick = () => {
    if (currentTrack) {
      navigate(`/song/${currentTrack.deezerId}`);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (location.pathname.startsWith('/song/')) {
    return null;
  }

  return (
    <div className={styles.bottomPlayer}>
      <div className={styles.leftSection}>
        <div className={styles.trackInfo}>
          <img
            src={currentTrack?.cover || currentTrack?.album?.cover_medium || 'https://via.placeholder.com/56x56'}
            alt={currentTrack?.title}
            className={styles.albumArt}
          />
          <div className={styles.trackDetails}>
            <span className={styles.trackTitle}>{currentTrack?.title || 'No track selected'}</span>
            <span className={styles.trackArtist}>{currentTrack?.artist?.name || ''}</span>
          </div>
        </div>
        <button className={styles.iconButton}>
          <Heart size={18} />
        </button>
        <button className={styles.iconButton}>
          <Volume2 size={18} />
        </button>
      </div>

      <div className={styles.centerSection}>
        <div className={styles.controls}>
          <button className={styles.controlButton}>
            <Shuffle size={18} />
          </button>
          <button className={styles.controlButton}>
            <SkipBack size={20} />
          </button>
          <button className={styles.playButton} onClick={togglePlayPause} disabled={!currentTrack}>
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>
          <button className={styles.controlButton}>
            <SkipForward size={20} />
          </button>
          <button className={styles.controlButton}>
            <Repeat size={18} />
          </button>
        </div>
        <div className={styles.progressSection}>
          <span className={styles.time}>{formatTime(currentTime)}</span>
          <div className={styles.progressBar} onClick={handleProgressBarClick}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={styles.time}>{formatTime(duration)}</span>
        </div>
      </div>

      <div className={styles.rightSection}>
        <button className={styles.iconButton}>
          <List size={18} />
        </button>
        <button className={styles.iconButton}>
          <Cast size={18} />
        </button>
        <div className={styles.volumeControl}>
          <Volume2 size={16} />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className={styles.volumeSlider}
            style={{
              background: `linear-gradient(to right, #fff ${volume}%, var(--surface-dark) ${volume}%)`,
            }}
          />
        </div>
        <button className={styles.iconButton} onClick={handleMaximizeClick}>
          <Maximize size={18} />
        </button>
      </div>
    </div>
  );
}

export default BottomPlayer;
