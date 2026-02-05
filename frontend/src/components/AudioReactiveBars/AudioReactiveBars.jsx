import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import styles from './AudioReactiveBars.module.css';

const AudioReactiveBars = ({ barCount = 64, showBpm = true }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const { audioRef, isPlaying, analyser: playerAnalyser } = usePlayer();
  
  // Audio analysis refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const dataArrayRef = useRef(null);
  
  // Beat detection state
  const [bpm, setBpm] = useState(null);
  const [energy, setEnergy] = useState(0);
  const [isDetecting, setIsDetecting] = useState(true);
  const lastBeatRef = useRef(0);
  const beatHistoryRef = useRef([]);
  const prevBassRef = useRef(0);
  const smoothedBpmRef = useRef(0);
  
  // Initialize audio analyzer
  const initAudio = useCallback(() => {
    if (!audioRef?.current) return false;
    
    // Use existing player analyser if available
    if (playerAnalyser) {
      analyserRef.current = playerAnalyser;
      if (!dataArrayRef.current || dataArrayRef.current.length !== playerAnalyser.frequencyBinCount) {
        dataArrayRef.current = new Uint8Array(playerAnalyser.frequencyBinCount);
      }
      return true;
    }
    
    // Don't create our own if source is already connected elsewhere
    // Just wait for playerAnalyser to be available
    return false;
  }, [audioRef, playerAnalyser]);
  
  // Draw frequency bars
  const draw = useCallback(() => {
    if (!canvasRef.current) {
      animationRef.current = requestAnimationFrame(draw);
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Check if we have audio data
    const hasAudioData = analyserRef.current && dataArrayRef.current;
    let data = dataArrayRef.current;
    
    if (hasAudioData) {
      // Get frequency data
      analyserRef.current.getByteFrequencyData(data);
    }
    
    // Calculate energy and bass for beat detection
    let total = 0;
    let bass = 0;
    if (hasAudioData) {
      for (let i = 0; i < data.length; i++) {
        total += data[i];
        if (i < 10) bass += data[i];
      }
    }
    
    const avgEnergy = total / (data.length * 255);
    const avgBass = bass / (10 * 255);
    
    setEnergy(Math.round(avgEnergy * 100));
    
    // Beat detection
    const now = performance.now();
    const bassJump = avgBass - prevBassRef.current;
    const timeSinceLastBeat = now - lastBeatRef.current;
    
    // More sensitive beat detection with lower thresholds
    if (avgBass > 0.25 && bassJump > 0.05 && timeSinceLastBeat > 180) {
      const beatInterval = now - lastBeatRef.current;
      lastBeatRef.current = now;
      
      if (beatInterval > 180 && beatInterval < 2500) {
        beatHistoryRef.current.push(beatInterval);
        if (beatHistoryRef.current.length > 12) {
          beatHistoryRef.current.shift();
        }
        
        if (beatHistoryRef.current.length >= 3) {
          // Use median filtering to remove outliers
          const sorted = [...beatHistoryRef.current].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          const medianInterval = sorted.length % 2 !== 0 
            ? sorted[mid] 
            : (sorted[mid - 1] + sorted[mid]) / 2;
          
          const newBpm = Math.round(60000 / medianInterval);
          
          // Clamp BPM to reasonable range (60-200)
          if (newBpm >= 60 && newBpm <= 200) {
            // Smooth BPM changes
            if (smoothedBpmRef.current === 0) {
              smoothedBpmRef.current = newBpm;
            } else {
              smoothedBpmRef.current = Math.round(smoothedBpmRef.current * 0.7 + newBpm * 0.3);
            }
            setBpm(smoothedBpmRef.current);
            setIsDetecting(false);
          }
        }
      }
    }
    prevBassRef.current = avgBass;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bars
    const barWidth = canvas.width / barCount;
    const bufferLength = hasAudioData ? data.length : barCount;
    
    for (let i = 0; i < barCount; i++) {
      let value;
      if (hasAudioData && data) {
        const dataIndex = Math.floor((i / barCount) * bufferLength * 0.8);
        value = data[dataIndex] / 255;
      } else {
        // Generate idle animation when no audio data
        const time = performance.now() / 1000;
        value = 0.1 + 0.05 * Math.sin(time * 2 + i * 0.2);
      }
      const barHeight = Math.max(8, value * canvas.height);
      
      // Create gradient for each bar - using consistent #00FFD9 primary accent
      const gradient = ctx.createLinearGradient(
        0, canvas.height - barHeight,
        0, canvas.height
      );
      gradient.addColorStop(0, `rgba(0, 255, 217, ${0.98 + value * 0.02})`);
      gradient.addColorStop(0.5, `rgba(0, 255, 217, ${0.9 + value * 0.1})`);
      gradient.addColorStop(1, `rgba(0, 255, 217, ${0.75 + value * 0.25})`);
      
      ctx.fillStyle = gradient;
      
      // Add stronger glow effect
      ctx.shadowColor = '#00FFD9';
      ctx.shadowBlur = 15 * value;
      
      const x = i * barWidth;
      const gap = 1;
      
      // Draw rounded bar
      const radius = Math.min(3, (barWidth - gap) / 2);
      const bw = barWidth - gap;
      const bh = Math.max(8, barHeight);
      const by = canvas.height - bh;
      
      ctx.beginPath();
      ctx.moveTo(x + radius, by);
      ctx.lineTo(x + bw - radius, by);
      ctx.quadraticCurveTo(x + bw, by, x + bw, by + radius);
      ctx.lineTo(x + bw, canvas.height);
      ctx.lineTo(x, canvas.height);
      ctx.lineTo(x, by + radius);
      ctx.quadraticCurveTo(x, by, x + radius, by);
      ctx.fill();
    }
    
    ctx.shadowBlur = 0;
    
    animationRef.current = requestAnimationFrame(draw);
  }, [barCount]);
  
  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const container = canvasRef.current.parentElement;
        canvasRef.current.width = container.offsetWidth;
        canvasRef.current.height = container.offsetHeight;
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Initialize audio on play or when playerAnalyser becomes available
  useEffect(() => {
    if (isPlaying) {
      initAudio();
    }
  }, [isPlaying, initAudio, playerAnalyser]);
  
  // Start/stop animation
  useEffect(() => {
    if (isPlaying) {
      draw();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, draw]);
  
  return (
    <>
      {/* BPM Display */}
      {showBpm && (
        <div className={styles.bpmDisplay}>
          <span className={styles.bpmValue}>
            {bpm !== null ? bpm : '--'}
          </span>
          <span className={styles.bpmLabel}>
            {isDetecting ? 'DETECTING' : 'BPM'}
          </span>
          <span className={styles.energyLabel}>ENERGY: {energy}%</span>
        </div>
      )}
      
      {/* Frequency Bars */}
      <div className={styles.barsContainer}>
        <div className={styles.gradientOverlay} />
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>
    </>
  );
};

export default AudioReactiveBars;
