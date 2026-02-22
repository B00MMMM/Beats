import { Heart, Volume2, VolumeX, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, List, Cast, Maximize, PlusCircle, Check, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import styles from './BottomPlayer.module.css';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '@clerk/clerk-react';
import axios from '../../api/axios';

function BottomPlayer() {
  const { currentTrack, isPlaying, duration, currentTime, volume, setVolume, togglePlayPause, handleProgressBarClick, isMuted, toggleMute, toggleShuffle, isShuffled, queue, playNext, playPrevious, likedSongs, toggleLike, isLoadingTrack } = usePlayer();
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken } = useAuth();

  const [showHeadphonesMenu, setShowHeadphonesMenu] = useState(false);
  const [showQueueMenu, setShowQueueMenu] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [playlistsWithSong, setPlaylistsWithSong] = useState(new Set());

  const menuRef = useRef(null);
  const queueRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowHeadphonesMenu(false);
      }
      if (queueRef.current && !queueRef.current.contains(event.target)) {
        setShowQueueMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddToPlaylistClick = async () => {
    if (!showHeadphonesMenu && currentTrack) {
      try {
        const token = await getToken();
        const [playlistsRes, checkRes] = await Promise.all([
          axios.get('/playlists/my', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`/playlists/check/${currentTrack.deezerId}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setPlaylists(playlistsRes.data);
        setPlaylistsWithSong(new Set(checkRes.data));

      } catch (error) {
        console.error("Error fetching playlists data:", error);
      }
    }
    setShowHeadphonesMenu(!showHeadphonesMenu);
    setShowQueueMenu(false); // Close other menu
  };

  const handleQueueClick = () => {
    setShowQueueMenu(!showQueueMenu);
    setShowHeadphonesMenu(false); // Close other menu
  };

  const addToPlaylist = async (playlistId) => {
    if (!currentTrack) return;
    try {
      const token = await getToken();
      await axios.post(`/playlists/${playlistId}/songs`,
        { songData: currentTrack },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPlaylistsWithSong(prev => new Set([...prev, playlistId]));
      // Don't close immediately, let them see the tick
      // setShowHeadphonesMenu(false);
      // Optional: Show toast
    } catch (error) {
      console.error("Error adding to playlist:", error);
    }
  };

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

  // Find index of current track in queue to show "next" items
  const currentIndex = queue.findIndex(t => t.deezerId === currentTrack?.deezerId);
  const nextUp = currentIndex !== -1 ? queue.slice(currentIndex + 1) : [];

  if (location.pathname.startsWith('/song/')) {
    return null;
  }

  return (
    <div className={styles.bottomPlayer}>
      <div className={styles.leftSection}>
        <div className={styles.trackInfo}>
          {currentTrack?.cover || currentTrack?.album?.cover_medium ? (
            <img
              src={currentTrack?.cover || currentTrack?.album?.cover_medium}
              alt={currentTrack?.title}
              className={styles.albumArt}
            />
          ) : (
            <div className={`${styles.albumArtPlaceholder} ${isLoadingTrack ? styles.albumArtLoading : ''}`}>
              {isLoadingTrack ? <Loader2 size={24} className={styles.placeholderSpinner} /> : <span>B</span>}
            </div>
          )}
          <div className={styles.trackDetails}>
            <span className={styles.trackTitle}>{currentTrack?.title || 'No track selected'}</span>
            <span className={styles.trackArtist}>{currentTrack?.artist?.name || currentTrack?.artist || ''}</span>
          </div>
        </div>
        <div className={styles.playlistActionWrapper} ref={menuRef}>
          <button className={styles.iconButton} onClick={handleAddToPlaylistClick}>
            <PlusCircle size={18} />
          </button>
          {showHeadphonesMenu && (
            <div className={styles.playlistMenu}>
              <div className={styles.menuHeader}>Add to Playlist</div>
              {playlists.length > 0 ? (
                playlists.map(p => (
                  <button key={p._id} className={styles.menuItem} onClick={() => addToPlaylist(p._id)}>
                    <span className={styles.playlistTitle}>{p.title}</span>
                    {playlistsWithSong.has(p._id) && <Check size={16} className={styles.checkIcon} />}
                  </button>
                ))
              ) : (
                <div className={styles.emptyMsg}>No playlists</div>
              )}
            </div>
          )}
        </div>
        <button
          className={styles.iconButton}
          onClick={() => currentTrack && toggleLike(currentTrack)}
          disabled={!currentTrack}
        >
          <Heart
            size={18}
            fill={currentTrack && likedSongs.has(String(currentTrack.deezerId || currentTrack.id)) ? '#00FFD9' : 'none'}
            color={currentTrack && likedSongs.has(String(currentTrack.deezerId || currentTrack.id)) ? '#00FFD9' : 'currentColor'}
          />
        </button>
      </div>

      <div className={styles.centerSection}>
        <div className={styles.controls}>
          {queue.length > 0 && (
            <button className={`${styles.controlButton} ${isShuffled ? styles.activeShuffle : ''}`} onClick={toggleShuffle}>
              <Shuffle size={18} />
            </button>
          )}
          <button className={styles.controlButton} onClick={playPrevious} disabled={isLoadingTrack}>
            <SkipBack size={20} />
          </button>
          <button className={`${styles.playButton} ${isLoadingTrack ? styles.playButtonLoading : ''}`} onClick={togglePlayPause} disabled={!currentTrack || isLoadingTrack}>
            {isLoadingTrack ? <Loader2 size={24} className={styles.spinnerIcon} /> : isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>
          <button className={styles.controlButton} onClick={playNext} disabled={isLoadingTrack}>
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
        <div className={styles.queueWrapper} ref={queueRef}>
          <button className={`${styles.iconButton} ${showQueueMenu ? styles.active : ''}`} onClick={handleQueueClick}>
            <List size={18} />
          </button>
          {showQueueMenu && (
            <div className={styles.queueMenu}>
              <div className={styles.menuHeader}>Next Up</div>
              {nextUp.length > 0 ? (
                nextUp.slice(0, 10).map((t, i) => (
                  <div key={`${t.deezerId}-${i}`} className={styles.queueItem}>
                    <img src={t.cover || t.album?.cover_medium} alt={t.title} />
                    <div className={styles.queueInfo}>
                      <span>{t.title}</span>
                      <small>{t.artist?.name || t.artist}</small>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyMsg}>No upcoming songs</div>
              )}
            </div>
          )}
        </div>
        <button className={styles.iconButton}>
          <Cast size={18} />
        </button>
        <div className={styles.volumeControl}>
          <button className={styles.iconButton} onClick={toggleMute}>
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
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
