import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

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

  useEffect(() => {
    if (currentTrack) {
      localStorage.setItem('lastPlayed', JSON.stringify(currentTrack));
      if (audioRef.current) {
        audioRef.current.load();
        if (isPlaying) {
          audioRef.current.play();
        }
      }
    }
  }, [currentTrack?.deezerId]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const playTrack = (track) => {
    if (track?.deezerId === currentTrack?.deezerId) {
      togglePlayPause();
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const pauseTrack = () => {
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
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

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);



  const [analyser, setAnalyser] = useState(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);

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

      // Attempt to init immediately (might be blocked by browser)
      // Better to trigger on play
      audioRef.current.addEventListener('play', initAudio);

      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('play', initAudio);
        }
      }
    }
  }, []);

  const value = {
    currentTrack,
    isPlaying,
    duration,
    currentTime,
    volume,
    setVolume,
    playTrack,
    pauseTrack,
    togglePlayPause,
    setCurrentTrack,
    setIsPlaying,
    handleProgressBarClick,
    audioRef,
    analyser // Expose analyser
  };

  return (
    <PlayerContext.Provider value={value}>
      <audio
        ref={audioRef}
        src={currentTrack ? `http://localhost:5000/api/songs/stream/${currentTrack.deezerId}` : ''}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      {children}
    </PlayerContext.Provider>
  );
};
