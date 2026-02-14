import { Play, Pause, PlusCircle, Heart, Check, Loader2 } from 'lucide-react';
import styles from './MiniPlayer.module.css';
import { usePlayer } from '../../context/PlayerContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import axios from '../../api/axios';
import { useState, useEffect, useRef } from 'react';

function MiniPlayer() {
  const { currentTrack, isPlaying, togglePlayPause, likedSongs, toggleLike } = usePlayer();
  const location = useLocation();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [playlistsWithSong, setPlaylistsWithSong] = useState(new Set());
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowPlaylistMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddToPlaylistClick = async (e) => {
    e.stopPropagation(); // Prevent navigating to song page
    if (!showPlaylistMenu && currentTrack) {
      try {
        const token = await getToken();
        // Use deezerId for checking
        const songId = currentTrack.deezerId || currentTrack.id;

        const [playlistsRes, checkRes] = await Promise.all([
          axios.get('/playlists/my', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`/playlists/check/${songId}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setPlaylists(playlistsRes.data);
        setPlaylistsWithSong(new Set(checkRes.data));

      } catch (error) {
        console.error("Error fetching playlists data:", error);
      }
    }
    setShowPlaylistMenu(!showPlaylistMenu);
  };

  const addToPlaylist = async (playlistId, e) => {
    e.stopPropagation(); // Prevent navigating
    if (!currentTrack) return;
    try {
      const token = await getToken();
      await axios.post(`/playlists/${playlistId}/songs`,
        { songData: currentTrack },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPlaylistsWithSong(prev => new Set([...prev, playlistId]));
    } catch (error) {
      console.error("Error adding to playlist:", error);
    }
  };

  const handleLikeClick = (e) => {
    e.stopPropagation();
    if (currentTrack) {
      toggleLike(currentTrack);
    }
  };

  if (location.pathname.startsWith('/song/')) {
    return null;
  }

  const handlePlayerClick = () => {
    if (currentTrack?.deezerId) {
      navigate(`/song/${currentTrack.deezerId}`);
    }
  };

  return (
    // ... (rest of the component)
    <div className={styles.miniPlayer}>
      <div className={styles.trackInfo} onClick={handlePlayerClick}>
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
        <div className={styles.playlistActionWrapper} ref={menuRef}>
          <button className={styles.iconButton} onClick={handleAddToPlaylistClick}>
            <PlusCircle size={20} />
          </button>

          {showPlaylistMenu && (
            <div className={styles.playlistMenu}>
              <div className={styles.menuHeader}>Add to Playlist</div>
              {playlists.length > 0 ? (
                playlists.map(p => (
                  <button key={p._id} className={styles.menuItem} onClick={(e) => addToPlaylist(p._id, e)}>
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

        <button className={styles.iconButton} onClick={handleLikeClick}>
          <Heart
            size={20}
            fill={currentTrack && likedSongs.has(String(currentTrack.deezerId || currentTrack.id)) ? '#00FFD9' : 'none'}
            color={currentTrack && likedSongs.has(String(currentTrack.deezerId || currentTrack.id)) ? '#00FFD9' : 'currentColor'}
          />
        </button>

        <button className={styles.playButton} onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}>
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
      </div>
    </div>
  )
}

export default MiniPlayer
