import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import styles from './SongPage.module.css';
import {
  ChevronLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Heart,
  PlusCircle,
  Check
} from 'lucide-react';
import Color from 'color-thief-react';
import axios from '../api/axios';
import { useAuth } from '@clerk/clerk-react';
import AudioReactiveBars from '../components/AudioReactiveBars/AudioReactiveBars';

function SongPage() {
  const { deezerId } = useParams();
  const navigate = useNavigate();

  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlayPause,
    playNext,
    playPrevious,
    toggleShuffle,
    isShuffled,
    duration,
    currentTime,
    handleProgressBarClick,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    likedSongs,
    toggleLike
  } = usePlayer();

  const { getToken } = useAuth();
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [playlistsWithSong, setPlaylistsWithSong] = useState(new Set());

  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [repeatMode, setRepeatMode] = useState(0); // 0: off, 1: all, 2: one
  const [showReactiveBars, setShowReactiveBars] = useState(false);

  const handleAddToPlaylistClick = async () => {
    if (!showPlaylistMenu && song) {
      try {
        const token = await getToken();
        // Use deezerId for checking
        const songId = song.deezerId || song.id;

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

  const addToPlaylist = async (playlistId) => {
    if (!song) return;
    try {
      const token = await getToken();
      await axios.post(`/playlists/${playlistId}/songs`,
        { songData: song }, // Ensure song object matches backend expectation
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPlaylistsWithSong(prev => new Set([...prev, playlistId]));
    } catch (error) {
      console.error("Error adding to playlist:", error);
    }
  };

  // Delay reactive bars by 2 seconds when page loads
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowReactiveBars(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isPlaying && currentTrack && currentTrack.deezerId && currentTrack.deezerId.toString() !== deezerId) {
      navigate(`/song/${currentTrack.deezerId}`, { replace: true });
    }
  }, [currentTrack, deezerId, isPlaying, navigate]);

  useEffect(() => {
    let isMounted = true;

    const fetchSong = async () => {
      try {
        if (!isMounted) return;
        if (currentTrack && currentTrack.deezerId?.toString() === deezerId) {
          if (isMounted) {
            setSong(currentTrack);
            setLoading(false);
          }
        } else {
          // If we don't have the data yet (e.g. manual navigation), show spinner
          if (isMounted) setLoading(true);
        }

        // Always fetch fresh data to ensure we have full details 
        // (and to fix any stale context)
        const response = await axios.get(`/songs/track/${deezerId}`);

        if (isMounted) {
          setSong(response.data);
          setLoading(false);
        }

      } catch (error) {
        console.error('Error fetching song details:', error);
        // If optimistic update worked, we might not want to show error?
        // But for now logging is fine.
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSong();

    return () => {
      isMounted = false;
    };
  }, [deezerId, currentTrack]);

  // Format time helper
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress calculation
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Toggle repeat mode
  const toggleRepeat = () => {
    setRepeatMode((prev) => (prev + 1) % 3);
  };

  // Check if current song is liked
  const isLiked = song && likedSongs.has(String(song.deezerId));

  // Handle like toggle
  const handleLikeToggle = () => {
    if (song) {
      toggleLike(song);
    }
  };

  // Keyboard shortcut for play/pause
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space bar to toggle play/pause
      if (e.key === ' ' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause]);

  // Get album cover
  const albumCover = song?.album?.cover_medium || song?.album?.cover_big || song?.cover;
  const artistName = typeof song?.artist === 'object' ? song?.artist?.name : song?.artist;
  const artistPicture = typeof song?.artist === 'object' ? song?.artist?.picture_medium : null;
  const albumName = song?.album?.title || 'Unknown Album';
  const releaseYear = song?.album?.release_date ? new Date(song.album.release_date).getFullYear() : '';

  // Determine bar count based on screen width
  const [barCount, setBarCount] = useState(window.innerWidth <= 768 ? 20 : 35);

  useEffect(() => {
    const handleResize = () => {
      setBarCount(window.innerWidth <= 768 ? 20 : 35);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={styles.songPageWrapper}>
      {/* Audio Reactive Bars (synced with music) */}
      {isPlaying && showReactiveBars && <AudioReactiveBars barCount={barCount} showBpm={true} />}

      <Color src={albumCover} format="hex" crossOrigin="anonymous">
        {({ data: color }) => (
          <div
            className={styles.songPage}
            style={{
              background: `linear-gradient(180deg, ${color}40 0%, ${color}15 30%, #000000 100%)`,
            }}
          >
            {/* Header */}
            <header className={styles.header}>
              <button className={styles.backButton} onClick={() => navigate(-1)}>
                <ChevronLeft size={28} />
              </button>
              <span className={styles.headerTitle}>Now Playing</span>
              <div className={styles.headerActions} />
            </header>

            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner} />
                <p>Loading...</p>
              </div>
            ) : song ? (
              <main className={styles.mainContent}>
                {/* Album Art & Song Details */}
                <div className={styles.contentRow}>
                  {/* Album Art */}
                  <div className={styles.albumArtSection}>
                    <div className={styles.albumArtContainer}>
                      <img
                        src={albumCover}
                        alt={song.title}
                        className={styles.albumArt}
                      />
                      {/* Glow effect */}
                      <div
                        className={styles.albumGlow}
                        style={{ backgroundColor: color }}
                      />
                    </div>
                  </div>

                  {/* Song Details & Controls */}
                  <div className={styles.detailsSection}>
                    {/* Song Info */}
                    <div className={styles.songInfo}>
                      <h1 className={styles.title}>{song.title}</h1>
                      <p className={styles.artist}>{artistName}</p>
                      <p className={styles.albumInfo}>
                        {albumName} {releaseYear && `• ${releaseYear}`}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className={styles.actionButtons}>
                      <button
                        onClick={handleLikeToggle}
                        className={`${styles.actionBtn} ${isLiked ? styles.actionBtnActive : ''}`}
                        title={isLiked ? 'Remove from Favorites' : 'Add to Favorites'}
                      >
                        <Heart className={isLiked ? styles.heartFilled : ''} size={22} />
                      </button>

                      <div className={styles.playlistActionWrapper}>
                        <button
                          className={styles.actionBtn}
                          title="Add to Playlist"
                          onClick={handleAddToPlaylistClick}
                        >
                          <PlusCircle size={22} />
                        </button>

                        {showPlaylistMenu && (
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
                    </div>

                    {/* Progress Bar */}
                    <div className={styles.progressSection}>
                      <div
                        className={styles.progressBar}
                        onClick={handleProgressBarClick}
                      >
                        <div
                          className={styles.progressFill}
                          style={{
                            width: `${progress}%`,
                            background: `linear-gradient(90deg, #00FFD9, ${color || '#00FFD9'})`
                          }}
                        />
                        <div
                          className={styles.progressThumb}
                          style={{ left: `${progress}%` }}
                        />
                      </div>
                      <div className={styles.timeContainer}>
                        <span className={styles.time}>{formatTime(currentTime)}</span>
                        <span className={styles.time}>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Playback Controls Row - includes volume on right */}
                    <div className={styles.controlsRow}>
                      {/* Playback Controls */}
                      <div className={styles.playbackControls}>
                        <button
                          onClick={toggleShuffle}
                          className={`${styles.controlBtn} ${isShuffled ? styles.controlBtnActive : ''}`}
                          title="Shuffle"
                        >
                          <Shuffle size={20} />
                        </button>

                        <button
                          className={styles.controlBtn}
                          onClick={playPrevious}
                          title="Previous"
                        >
                          <SkipBack size={24} />
                        </button>

                        <button
                          onClick={togglePlayPause}
                          className={styles.playBtn}
                          title={isPlaying ? 'Pause' : 'Play'}
                        >
                          {isPlaying ? (
                            <Pause size={28} fill="currentColor" />
                          ) : (
                            <Play size={28} fill="currentColor" style={{ marginLeft: 3 }} />
                          )}
                        </button>

                        <button
                          className={styles.controlBtn}
                          onClick={playNext}
                          title="Next"
                        >
                          <SkipForward size={24} />
                        </button>

                        <button
                          onClick={toggleRepeat}
                          className={`${styles.controlBtn} ${repeatMode > 0 ? styles.controlBtnActive : ''}`}
                          title="Repeat"
                        >
                          <Repeat size={20} />
                          {repeatMode === 2 && (
                            <span className={styles.repeatBadge}>1</span>
                          )}
                        </button>
                      </div>

                      {/* Volume Control */}
                      <div className={styles.volumeSection}>
                        <button
                          className={styles.volumeBtn}
                          onClick={toggleMute}
                          title={isMuted ? 'Unmute' : 'Mute'}
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX size={20} />
                          ) : (
                            <Volume2 size={20} />
                          )}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => setVolume(Number(e.target.value))}
                          className={styles.volumeSlider}
                          style={{
                            background: `linear-gradient(to right, #00FFD9 0%, #00FFD9 ${isMuted ? 0 : volume}%, rgba(255, 255, 255, 0.1) ${isMuted ? 0 : volume}%, rgba(255, 255, 255, 0.1) 100%)`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Info Cards */}
                <div className={styles.infoCards}>
                  {/* Artist Card */}
                  <div className={styles.infoCard}>
                    <h3>About the Artist</h3>
                    <div className={styles.artistCardInfo}>
                      {artistPicture && (
                        <img
                          src={artistPicture}
                          alt={artistName}
                          className={styles.artistAvatar}
                        />
                      )}
                      <div className={styles.artistDetails}>
                        <p className={styles.artistCardName}>{artistName}</p>
                        {song.artist?.nb_fan && (
                          <p className={styles.artistFans}>
                            {(song.artist.nb_fan / 1000000).toFixed(1)}M fans
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Credits Card */}
                  <div className={styles.infoCard}>
                    <h3>Credits</h3>
                    <p className={styles.creditsText}>
                      Performed by <span>{artistName}</span>
                    </p>
                    {song.contributors && song.contributors.length > 1 && (
                      <p className={styles.creditsText}>
                        Featuring {song.contributors.slice(1).map(c => c.name).join(', ')}
                      </p>
                    )}
                    <button className={styles.showAllBtn}>Show all</button>
                  </div>
                </div>
              </main>
            ) : (
              <div className={styles.notFound}>
                <p>Song not found.</p>
                <button onClick={() => navigate(-1)} className={styles.goBackBtn}>
                  Go Back
                </button>
              </div>
            )}
          </div>
        )}
      </Color>
    </div>
  );
}

export default SongPage;
