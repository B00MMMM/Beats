import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import styles from './SongPage.module.css';
import { ChevronLeft } from 'lucide-react';
import Color from 'color-thief-react';
import axios from '../api/axios';
import SongPagePlayer from '../components/SongPagePlayer/SongPagePlayer';

function SongPage() {
  const { deezerId } = useParams();
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack } = usePlayer();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSong = async () => {
      try {
        setLoading(true);
        if (currentTrack && currentTrack.deezerId?.toString() === deezerId) {
          setSong(currentTrack);
        } else {
          const response = await axios.get(`/songs/track/${deezerId}`);
          setSong(response.data);
        }
      } catch (error) {
        console.error('Error fetching song details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSong();
  }, [deezerId, currentTrack]);

  return (
    <div className={styles.songPageWrapper}>
      <Color src={song?.album?.cover_medium} format="hex" crossOrigin="anonymous">
        {({ data: color }) => (
          <div
            className={styles.songPage}
            style={{
              background: `linear-gradient(to bottom, ${color}33 0%, #121212 100%)`,
            }}
          >
            <div className={styles.header}>
              <button className={styles.backButton} onClick={() => navigate(-1)}>
                <ChevronLeft size={32} />
              </button>
              <span className={styles.headerTitle}>Now Playing</span>
              <div className={styles.placeholder} />
            </div>

            {loading ? (
              <p>Loading...</p>
            ) : song ? (
              <div className={styles.songContent}>
                <div className={styles.albumArtContainer}>
                  <img src={song.album?.cover_medium || song.cover} alt={song.title} className={styles.albumArt} />
                </div>
                <div className={styles.songDetails}>
                  <h1 className={styles.title}>{song.title}</h1>
                  <h2 className={styles.artist}>{typeof song.artist === 'string' ? song.artist : song.artist?.name}</h2>
                </div>
                <SongPagePlayer />

                <div className={styles.infoGrid}>
                  <div className={styles.infoCard}>
                    <h3>About the Artist</h3>
                    {typeof song.artist === 'object' && song.artist.picture_medium && (
                      <img src={song.artist.picture_medium} alt={song.artist.name} className={styles.artistCircle} />
                    )}
                    <p className={styles.cardText}>{typeof song.artist === 'object' ? song.artist.name : song.artist}</p>
                  </div>
                  <div className={styles.infoCard}>
                    <h3>Credits</h3>
                    <p className={styles.cardText}>Performed by {typeof song.artist === 'object' ? song.artist.name : song.artist}</p>
                    <button className={styles.textBtn}>Show all</button>
                  </div>
                </div>
              </div>
            ) : (
              <p>Song not found.</p>
            )}
          </div>
        )}
      </Color>
    </div>
  );
}

export default SongPage;
