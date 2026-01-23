import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import styles from './PlayHistory.module.css';

function PlayHistory() {
  const { playHistory, playTrack } = usePlayer();

  return (
    <div className={styles.playHistory}>
      <h2>Recently Played</h2>
      <div className={styles.historyList}>
        {playHistory.map((song) => (
          <div
            key={song.deezerId}
            className={styles.historyItem}
            onClick={() => playTrack(song)}
          >
            <img src={song.cover} alt={song.title} className={styles.albumArt} />
            <div className={styles.trackInfo}>
              <p className={styles.title}>{song.title}</p>
              <p className={styles.artist}>{song.artist}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlayHistory;
