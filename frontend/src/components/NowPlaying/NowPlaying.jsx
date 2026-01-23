import React from 'react';
import { usePlayer } from '../../context/PlayerContext';
import styles from './NowPlaying.module.css';

function NowPlaying() {
  const { currentTrack } = usePlayer();

  if (!currentTrack) {
    return null;
  }

  return (
    <div className={styles.nowPlaying}>
      <div className={styles.scrollableContent}>
        <div className={styles.trackInfo}>
          <img
            src={currentTrack.cover || currentTrack.album?.cover_medium || 'https://via.placeholder.com/200x200'}
            alt={currentTrack.title}
            className={styles.albumArt}
          />
          <div className={styles.details}>
            <p className={styles.title}>{currentTrack.title}</p>
            <p className={styles.artist}>{typeof currentTrack.artist === 'string' ? currentTrack.artist : currentTrack.artist?.name}</p>
            {currentTrack.album && <p className={styles.album}>{currentTrack.album.title}</p>}
          </div>
        </div>

        {/* Detailed Info Section */}
        {currentTrack.artist && typeof currentTrack.artist === 'object' && (
          <div className={styles.extraDetails}>
            <div className={styles.artistSection}>
              <h3>Artist</h3>
              <div className={styles.artistProfile}>
                <img
                  src={currentTrack.artist.picture_medium || currentTrack.artist.picture}
                  alt={currentTrack.artist.name}
                  className={styles.artistImage}
                />
                <p className={styles.artistName}>{currentTrack.artist.name}</p>
              </div>
            </div>

            {/* Song Details */}
            <div className={styles.songMetadata}>
              <h3>Song Info</h3>
              <div className={styles.metadataList}>
                {currentTrack.duration && (
                  <div className={styles.metadataItem}>
                    <span className={styles.metadataLabel}>Duration</span>
                    <span className={styles.metadataValue}>
                      {Math.floor(currentTrack.duration / 60)}:{String(currentTrack.duration % 60).padStart(2, '0')}
                    </span>
                  </div>
                )}
                {currentTrack.album?.release_date && (
                  <div className={styles.metadataItem}>
                    <span className={styles.metadataLabel}>Released</span>
                    <span className={styles.metadataValue}>
                      {new Date(currentTrack.album.release_date).getFullYear()}
                    </span>
                  </div>
                )}
                {currentTrack.rank && (
                  <div className={styles.metadataItem}>
                    <span className={styles.metadataLabel}>Popularity</span>
                    <span className={styles.metadataValue}>
                      {Math.round((currentTrack.rank / 1000000) * 100)}%
                    </span>
                  </div>
                )}
                {currentTrack.explicit_lyrics !== undefined && (
                  <div className={styles.metadataItem}>
                    <span className={styles.metadataLabel}>Explicit</span>
                    <span className={styles.metadataValue}>
                      {currentTrack.explicit_lyrics ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NowPlaying;
