import React from 'react';
import { Shuffle, SkipBack, Play, Pause, SkipForward, Repeat } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import styles from './SongPagePlayer.module.css';

function SongPagePlayer() {
  const { isPlaying, togglePlayPause, duration, currentTime, handleProgressBarClick } = usePlayer();

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={styles.songPagePlayer}>
      <div className={styles.progressSection}>
        <div className={styles.progressBar} onClick={handleProgressBarClick}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={styles.timeContainer}>
          <span className={styles.time}>{formatTime(currentTime)}</span>
          <span className={styles.time}>{formatTime(duration)}</span>
        </div>
      </div>
      <div className={styles.controls}>
        <button className={styles.controlButton}>
          <Shuffle size={18} />
        </button>
        <button className={styles.controlButton}>
          <SkipBack size={20} />
        </button>
        <button className={styles.playButton} onClick={togglePlayPause}>
          {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
        </button>
        <button className={styles.controlButton}>
          <SkipForward size={20} />
        </button>
        <button className={styles.controlButton}>
          <Repeat size={18} />
        </button>
      </div>
    </div>
  );
}

export default SongPagePlayer;
