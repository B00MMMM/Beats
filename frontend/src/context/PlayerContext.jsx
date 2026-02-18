import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from '../api/axios';
import { useSocket } from './SocketContext'; // Import

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(() => {
    const savedTrack = localStorage.getItem('lastPlayed');
    return savedTrack ? JSON.parse(savedTrack) : null;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const { getToken, userId } = useAuth();
  const { socket } = useSocket(); // Use socket

  // Queue & Playlist State
  const [queue, setQueue] = useState([]);
  const [originalQueue, setOriginalQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isShuffled, setIsShuffled] = useState(false);
  const [likedSongs, setLikedSongs] = useState(new Set());
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const pendingSeekRef = useRef(null); // Stores position to restore after token-refresh reload
  const [playContext, setPlayContext] = useState(null); // { type: 'playlist'|'album'|'artist', id: string, title: string, cover: string }


  useEffect(() => {
    if (currentTrack) {
      localStorage.setItem('lastPlayed', JSON.stringify(currentTrack));

      // Keep lastPlaylistSession in sync with the currently playing song
      if (currentTrack.deezerId) {
        try {
          const session = localStorage.getItem('lastPlaylistSession');
          if (session) {
            const parsed = JSON.parse(session);
            parsed.songDeezerId = String(currentTrack.deezerId);
            localStorage.setItem('lastPlaylistSession', JSON.stringify(parsed));
          }
        } catch (e) { /* ignore parse errors */ }
      }

      // Record History only when track changes and has valid data
      const recordHistory = async () => {
        try {
          const token = await getToken();
          if (token && currentTrack.deezerId && currentTrack.title) {
            await axios.post('/users/history',
              {
                songData: currentTrack,
                contextType: playContext?.type || 'song',
                contextId: playContext?.id,
                contextData: playContext // { title, cover }
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }
        } catch (error) {
          console.error("Error recording history:", error);
        }
      };

      if (userId) {
        recordHistory();
      }
    }
  }, [currentTrack?.deezerId]);

  // Load and play audio when streamUrl is ready (avoids race condition with async token fetch)
  useEffect(() => {
    if (streamUrl && audioRef.current) {
      audioRef.current.load();

      // If resuming with a refreshed token, restore the playback position
      if (pendingSeekRef.current !== null) {
        const seekTo = pendingSeekRef.current;
        pendingSeekRef.current = null;
        const restorePosition = () => {
          audioRef.current.currentTime = seekTo;
        };
        audioRef.current.addEventListener('loadedmetadata', restorePosition, { once: true });
      }

      if (isPlaying) {
        audioRef.current.play().catch((err) => {
          if (err.name !== 'AbortError') {
            console.error('Audio play error:', err);
            if (err.name === 'NotSupportedError') {
              console.warn("Playback failed: Source not supported or rate limited.");
              setIsPlaying(false);
            }
          }
        });

      }
    }

  }, [streamUrl]);

  // Update activity when play/pause state changes
  useEffect(() => {
    const updateActivity = async () => {
      if (!userId || !currentTrack) return;

      try {
        const token = await getToken();
        if (token) {
          const songId = currentTrack.deezerId || currentTrack.id;

          // Debug check - if playing but no ID, avoid sending bad data
          if (isPlaying && !songId) {
            console.warn("Skipping activity update: No valid songId found for", currentTrack.title);
            return;
          }

          const activity = isPlaying ? {
            songId: songId,
            title: currentTrack.title,
            artist: typeof currentTrack.artist === 'string' ? currentTrack.artist : currentTrack.artist?.name,
            cover: currentTrack.cover || currentTrack.album?.cover_medium,
          } : null;

          await axios.post('/users/activity',
            { activity, isPlaying },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      } catch (error) {
        console.error("Error updating activity:", error);
      }
    };

    updateActivity();
  }, [isPlaying, currentTrack?.deezerId, userId]);

  // Enrich track data if sparse (e.g. from Liked Songs)
  useEffect(() => {
    const enrichTrackData = async () => {
      if (currentTrack?.deezerId && (
        typeof currentTrack.artist === 'string' ||
        !currentTrack.album ||
        currentTrack.rank === undefined ||
        currentTrack.explicit_lyrics === undefined ||
        !currentTrack.album.release_date
      )) {
        try {
          // Use the proxy endpoint directly
          const response = await axios.get(`${BACKEND_URL}/api/songs/${currentTrack.deezerId}`);
          const fullTrack = response.data;

          setCurrentTrack(prev => ({
            ...prev,
            ...fullTrack,
            deezerId: prev.deezerId // Ensure ID consistency
          }));
        } catch (error) {
          console.error("Error enriching track data:", error);
        }
      }
    };

    enrichTrackData();
  }, [currentTrack?.deezerId]);

  const fetchLikedSongs = async () => {
    if (!userId) return;
    try {
      const token = await getToken();
      if (!token) return;

      const res = await axios.get('/users/favorites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Assuming favorites return an array of objects with deezerId
      const ids = new Set(res.data.map(song => String(song.deezerId)));
      setLikedSongs(ids);
    } catch (error) {
      console.error("Error fetching liked songs:", error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchLikedSongs();
    }
  }, [userId]);

  const toggleLike = async (song) => {
    if (!userId || !song) return;
    const songId = String(song.deezerId || song.id);

    // Optimistic update
    const isLiked = likedSongs.has(songId);
    const newLikedSongs = new Set(likedSongs);
    if (isLiked) {
      newLikedSongs.delete(songId);
    } else {
      newLikedSongs.add(songId);
    }
    setLikedSongs(newLikedSongs);

    try {
      const token = await getToken();
      await axios.post('/users/like',
        { songData: song },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // We could refetch or trust the optimistic update.
      // If the server returns existing status, we can verify.
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert on error
      if (isLiked) {
        newLikedSongs.add(songId);
      } else {
        newLikedSongs.delete(songId);
      }
      setLikedSongs(new Set(newLikedSongs));
    }
  };

  useEffect(() => {
    // Determine current index based on track whenever queue changes (or we fall out of sync)
    if (currentTrack && queue.length > 0) {
      const idx = queue.findIndex(t => t.deezerId === currentTrack.deezerId);
      if (idx !== -1) setCurrentIndex(idx);
    }
  }, [queue, currentTrack?.deezerId]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Play error on toggle:', err);
          }
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const playTrack = (track) => {
    if (track?.deezerId === currentTrack?.deezerId) {
      togglePlayPause();
    } else {
      // Stop old audio immediately to prevent flash of previous song
      if (audioRef.current) audioRef.current.pause();
      setStreamUrl('');
      setQueue([track]);
      setOriginalQueue([track]);
      setCurrentIndex(0);
      setCurrentTrack(track);
      setIsPlaying(true);
      setPlayContext(null); // Clear playlist context for single track
      // Clear playlist session — single track play has no playlist to restore
      localStorage.removeItem('lastPlaylistSession');
    }
  };

  const playPlaylist = (songs, startIndex = 0, sourcePlaylistId = null, playlistData = null) => {
    if (!songs || songs.length === 0) return;

    // Stop old audio immediately to prevent flash of previous song
    if (audioRef.current) audioRef.current.pause();
    setStreamUrl('');

    setOriginalQueue(songs);

    let selectedTrack;
    if (isShuffled) {
      const shuffled = [...songs];
      const first = shuffled[startIndex];
      const others = shuffled.filter((_, i) => i !== startIndex);
      for (let i = others.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [others[i], others[j]] = [others[j], others[i]];
      }
      const NEW_QUEUE = [first, ...others];
      setQueue(NEW_QUEUE);
      setCurrentIndex(0);
      setCurrentTrack(NEW_QUEUE[0]);
      selectedTrack = NEW_QUEUE[0];
    } else {
      setQueue(songs);
      setCurrentIndex(startIndex);
      setCurrentTrack(songs[startIndex]);
      selectedTrack = songs[startIndex];
    }
    setIsPlaying(true);

    // Set Context
    if (sourcePlaylistId && playlistData && sourcePlaylistId !== 'favorites') { // Exclude favorites
      setPlayContext({
        type: 'playlist',
        id: sourcePlaylistId,
        title: playlistData.title,
        cover: playlistData.cover || playlistData.imageUrl || playlistData.image, // Handle different cover field names
      });

    } else {
      setPlayContext(null);
    }

    // Persist playlist session so queue can be restored on next visit
    if (sourcePlaylistId && selectedTrack?.deezerId) {
      localStorage.setItem('lastPlaylistSession', JSON.stringify({
        playlistId: sourcePlaylistId,
        songDeezerId: String(selectedTrack.deezerId),
      }));
    }
  };

  const toggleShuffle = () => {
    const newShuffleState = !isShuffled;
    setIsShuffled(newShuffleState);

    if (newShuffleState) {
      // Turn Shuffle ON
      if (queue.length > 0) {
        const shuffled = [...originalQueue];
        // Keep current playing song first if possible
        const current = currentTrack;
        const others = shuffled.filter(s => s.deezerId !== current?.deezerId);

        for (let i = others.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [others[i], others[j]] = [others[j], others[i]];
        }

        const newQ = current ? [current, ...others] : others;
        setQueue(newQ);
        setCurrentIndex(0);
      }
    } else {
      // Turn Shuffle OFF - restore original order
      setQueue(originalQueue);
      // Find where we are in original queue
      const idx = originalQueue.findIndex(s => s.deezerId === currentTrack?.deezerId);
      setCurrentIndex(idx !== -1 ? idx : 0);
    }
  };

  const playNext = () => {
    if (queue.length === 0) return;
    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      // Stop old audio immediately to prevent flash of previous song
      if (audioRef.current) audioRef.current.pause();
      setStreamUrl('');
      setCurrentIndex(nextIndex);
      setCurrentTrack(queue[nextIndex]);
      setIsPlaying(true);
    } else {
      // End of playlist
      setIsPlaying(false);
    }
  };

  const playPrevious = () => {
    if (queue.length === 0) return;
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      // Stop old audio immediately to prevent flash of previous song
      if (audioRef.current) audioRef.current.pause();
      setStreamUrl('');
      setCurrentIndex(prevIndex);
      setCurrentTrack(queue[prevIndex]);
      setIsPlaying(true);
    } else {
      // restart song or stop?
      audioRef.current.currentTime = 0;
    }
  };

  // Auto play next on end
  // We need to modify the onEnded handler in the audio tag return below

  const pauseTrack = () => {
    setIsPlaying(false);
  };

  const togglePlayPause = async () => {
    if (!isPlaying && currentTrack?.deezerId) {
      // Refresh token before resuming to avoid expired-token failures
      try {
        const token = await getToken();
        const base = `${BACKEND_URL}/api/songs/stream/${currentTrack.deezerId}`;
        const newUrl = token ? `${base}?token=${token}` : base;
        if (newUrl !== streamUrl) {
          // Save current position so it's restored after load()
          pendingSeekRef.current = audioRef.current?.currentTime || 0;
          setStreamUrl(newUrl);
        }
      } catch (e) {
        console.warn('Token refresh failed, attempting play anyway:', e);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  const handleProgressBarClick = (e) => {
    const progressBar = e.currentTarget;
    const clickX = e.clientX - progressBar.getBoundingClientRect().left;
    const progressBarWidth = progressBar.offsetWidth;
    const newTime = (clickX / progressBarWidth) * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const previousVolumeRef = useRef(50);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(previousVolumeRef.current);
    } else {
      previousVolumeRef.current = volume;
      setIsMuted(true);
      setVolume(0);
    }
  };



  const [analyser, setAnalyser] = useState(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);

  // Build stream URL with auth token (so backend can check user's plan)

  useEffect(() => {
    const buildStreamUrl = async () => {
      if (!currentTrack?.deezerId) {
        setStreamUrl('');
        return;
      }
      try {
        const token = await getToken();
        const base = `${BACKEND_URL}/api/songs/stream/${currentTrack.deezerId}`;
        setStreamUrl(token ? `${base}?token=${token}` : base);
      } catch {
        setStreamUrl(`${BACKEND_URL}/api/songs/stream/${currentTrack.deezerId}`);
      }
    };
    buildStreamUrl();
  }, [currentTrack?.deezerId]);

  useEffect(() => {
    if (audioRef.current && !audioContextRef.current) {
      // Initialize AudioContext on first user interaction or mount if allowed
      const initAudio = () => {
        if (!audioContextRef.current) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          audioContextRef.current = new AudioContext();
          const ana = audioContextRef.current.createAnalyser();
          ana.fftSize = 2048; // Resolution
          setAnalyser(ana);

          // Create source only once
          try {
            sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
            sourceRef.current.connect(ana);
            ana.connect(audioContextRef.current.destination);
          } catch (e) {
            console.error("Error creating MediaElementSource:", e);
          }
        } else if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
      };

      // Add event listener for future play events
      audioRef.current.addEventListener('play', initAudio);

      // Also try to init if audio is already playing (e.g., after page refresh)
      if (!audioRef.current.paused) {
        initAudio();
      }

      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('play', initAudio);
        }
      }
    }
  }, []);

  // Playlist Global State
  const [playlists, setPlaylists] = useState([]);

  const fetchPlaylists = async () => {
    if (!userId) {
      setPlaylists([]);
      return;
    }
    try {
      const token = await getToken();
      if (!token) return;

      const response = await axios.get('/playlists/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlaylists(response.data);
    } catch (error) {
      console.error("Error fetching playlists:", error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchPlaylists();
    } else {
      setPlaylists([]);
    }
  }, [userId]);

  // Restore queue from last playlist session on mount
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (!userId || hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const restoreSession = async () => {
      try {
        const savedSession = localStorage.getItem('lastPlaylistSession');
        if (!savedSession) return;

        const { playlistId, songDeezerId } = JSON.parse(savedSession);
        if (!playlistId) return;

        const token = await getToken();
        if (!token) return;

        let songs = [];
        if (playlistId === 'favorites') {
          const res = await axios.get('/users/favorites', {
            headers: { Authorization: `Bearer ${token}` }
          });
          songs = res.data;
        } else {
          const res = await axios.get(`/playlists/${playlistId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          songs = res.data?.songs;

          // Restore Context
          if (res.data) {
            setPlayContext({
              type: 'playlist',
              id: playlistId,
              title: res.data.title,
              cover: res.data.image || res.data.cover,
            });
          }
        }

        if (!songs || songs.length === 0) return;

        // Find the song that was playing
        const matchIndex = songs.findIndex(s => String(s.deezerId) === String(songDeezerId));
        const startIdx = matchIndex !== -1 ? matchIndex : 0;

        // Set queue without auto-playing
        setOriginalQueue(songs);
        setQueue(songs);
        setCurrentIndex(startIdx);
        setCurrentTrack(songs[startIdx]);
        // Don't auto-play — user can press play when ready
      } catch (error) {
        console.error('Error restoring playlist session:', error);
      }
    };

    restoreSession();
  }, [userId]);

  const value = {
    currentTrack,
    isPlaying,
    duration,
    currentTime,
    volume,
    setVolume,
    playTrack,
    playPlaylist,
    playNext,
    playPrevious,
    toggleShuffle,
    queue,
    isShuffled,
    pauseTrack,
    togglePlayPause,
    setCurrentTrack,
    setIsPlaying,
    handleProgressBarClick,
    audioRef,
    analyser, // Expose analyser
    isMuted,
    toggleMute,
    likedSongs,
    toggleLike,
    fetchLikedSongs,
    playlists,      // Exported
    fetchPlaylists, // Exported
    setPlaylists,   // Exported (optional, but useful)
    isLoadingTrack, // Loading state for async track fetching
    setIsLoadingTrack
  };

  return (
    <PlayerContext.Provider value={value}>
      <audio
        ref={audioRef}
        src={streamUrl}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          // Auto play next
          if (queue.length > 0) {
            playNext();
          } else {
            setIsPlaying(false);
          }
        }}
      />
      {children}
    </PlayerContext.Provider>
  );
};
