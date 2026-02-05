import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import styles from './AudioVisualizer.module.css';

// ==========================================
// AUDIO VISUALIZER COMPONENT
// React-based Three.js visualization with
// beat detection, BPM, bass reactivity,
// and shockwave effects
// ==========================================

const AudioVisualizer = ({ isActive, onReady }) => {
  const canvasRef = useRef(null);
  const hudCanvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Three.js refs
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const composerRef = useRef(null);
  const animationRef = useRef(null);
  const clockRef = useRef(null);
  
  // Audio refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const dataArrayRef = useRef(null);
  
  // Scene objects refs
  const coreGroupRef = useRef(null);
  const coreMeshRef = useRef(null);
  const wireMeshRef = useRef(null);
  const particlesRef = useRef(null);
  const shocksRef = useRef([]);
  const starsRef = useRef(null);
  const rimMatRef = useRef(null);
  const afterRef = useRef(null);
  const bloomRef = useRef(null);
  
  // Audio data state (for performance, use refs)
  const audioDataRef = useRef({
    bass: 0, subBass: 0, mid: 0, high: 0, vol: 0, bpm: 120,
    bassSmoothed: 0, subBassSmoothed: 0, midSmoothed: 0, highSmoothed: 0
  });
  const lastBeatRef = useRef(0);
  const beatHistoryRef = useRef([]);
  const timeRef = useRef(0);
  
  // Config state
  const [config, setConfig] = useState({
    form: 'icosahedron',
    rimPower: 2.5,
    showBars: true,
    showShock: true,
    camMode: 'orbit',
    sensitivity: 1.5,
    trail: 0.7,
    theme: 'neon',
    bloom: 1.5
  });
  
  const themes = useMemo(() => ({
    neon: { p: '#00ff88', s: '#004411', bg: '#020502' },
    magenta: { p: '#ff00ff', s: '#440044', bg: '#050205' },
    cyan: { p: '#00ffff', s: '#004444', bg: '#020505' },
    gold: { p: '#ffcc00', s: '#553300', bg: '#0a0800' },
    void: { p: '#ffffff', s: '#444444', bg: '#000000' }
  }), []);
  
  const { audioRef, isPlaying, analyser: playerAnalyser } = usePlayer();
  
  // Initialize Three.js scene
  const initScene = useCallback(async () => {
    if (!canvasRef.current || sceneRef.current) return;
    
    // Dynamic import Three.js for code splitting
    const THREE = await import('three');
    const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js');
    const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass.js');
    const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js');
    const { AfterimagePass } = await import('three/examples/jsm/postprocessing/AfterimagePass.js');
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      canvas: canvasRef.current,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Cap for performance
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = false;
    rendererRef.current = renderer;
    
    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020502, 0.02);
    sceneRef.current = scene;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    camera.position.set(0, 5, 35);
    cameraRef.current = camera;
    
    // Clock for consistent animation
    clockRef.current = new THREE.Clock();
    
    // Core group
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);
    coreGroupRef.current = coreGroup;
    
    // Rim material (glow effect)
    const rimMat = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(themes[config.theme].p) },
        power: { value: config.rimPower },
        bias: { value: 1.5 }
      },
      vertexShader: `
        varying vec3 vN, vV;
        void main() {
          vN = normalize(normalMatrix * normal);
          vec4 p = modelViewMatrix * vec4(position, 1.0);
          vV = -p.xyz;
          gl_Position = projectionMatrix * p;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float power, bias;
        varying vec3 vN, vV;
        void main() {
          float r = 1.0 - max(dot(normalize(vV), normalize(vN)), 0.0);
          gl_FragColor = vec4(color, pow(r, power) * bias);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide
    });
    rimMatRef.current = rimMat;
    
    // Build core geometry
    buildCore(THREE, config.form);
    
    // Particles
    const pGeo = new THREE.BufferGeometry();
    const pCount = 2000;
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const r = 10 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPos[i * 3 + 2] = r * Math.cos(phi);
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMesh = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        size: 0.12,
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      })
    );
    scene.add(pMesh);
    particlesRef.current = pMesh;
    
    // Stars background
    const sGeo = new THREE.BufferGeometry();
    const sPos = [];
    for (let i = 0; i < 1500; i++) {
      sPos.push(
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 400
      );
    }
    sGeo.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
    const stars = new THREE.Points(
      sGeo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.35,
        transparent: true,
        opacity: 0.5
      })
    );
    scene.add(stars);
    starsRef.current = stars;
    
    // Post processing
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      config.bloom,
      0.4,
      0.85
    );
    composer.addPass(bloom);
    bloomRef.current = bloom;
    
    const after = new AfterimagePass();
    after.uniforms['damp'].value = config.trail;
    composer.addPass(after);
    afterRef.current = after;
    
    composerRef.current = composer;
    
    // HUD canvas setup
    if (hudCanvasRef.current) {
      hudCanvasRef.current.width = window.innerWidth;
      hudCanvasRef.current.height = window.innerHeight;
    }
    
    onReady?.();
  }, [config.theme, config.rimPower, config.bloom, config.trail, themes, onReady]);
  
  // Build core geometry
  const buildCore = useCallback(async (THREE, form) => {
    if (!coreGroupRef.current || !rimMatRef.current) return;
    
    const coreGroup = coreGroupRef.current;
    const rimMat = rimMatRef.current;
    
    // Remove existing
    if (coreMeshRef.current) coreGroup.remove(coreMeshRef.current);
    if (wireMeshRef.current) coreGroup.remove(wireMeshRef.current);
    
    let geo;
    switch (form) {
      case 'torusKnot':
        geo = new THREE.TorusKnotGeometry(5, 1.5, 128, 32);
        break;
      case 'sphere':
        geo = new THREE.SphereGeometry(7, 48, 48);
        break;
      case 'octahedron':
        geo = new THREE.OctahedronGeometry(8, 0);
        break;
      case 'icosahedron':
      default:
        geo = new THREE.IcosahedronGeometry(7, 2);
    }
    
    const coreMesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    coreMesh.add(new THREE.Mesh(geo, rimMat));
    
    const wireMesh = new THREE.LineSegments(
      new THREE.WireframeGeometry(geo),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.12
      })
    );
    
    coreGroup.add(coreMesh);
    coreGroup.add(wireMesh);
    
    coreMeshRef.current = coreMesh;
    wireMeshRef.current = wireMesh;
  }, []);
  
  // Spawn shockwave effect
  const spawnShockwave = useCallback(async (intensity = 1) => {
    if (!config.showShock || !sceneRef.current) return;
    
    const THREE = await import('three');
    const theme = themes[config.theme];
    
    const geo = new THREE.RingGeometry(14, 15 + intensity * 2, 64);
    geo.rotateX(-Math.PI / 2);
    
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: theme.p,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      })
    );
    mesh.position.y = -8;
    
    sceneRef.current.add(mesh);
    shocksRef.current.push({ mesh, age: 0, intensity });
  }, [config.showShock, config.theme, themes]);
  
  // Initialize audio analyzer
  const initAudio = useCallback(() => {
    if (!audioRef?.current) return;
    
    // Use existing player analyser if available
    if (playerAnalyser) {
      analyserRef.current = playerAnalyser;
      dataArrayRef.current = new Uint8Array(playerAnalyser.frequencyBinCount);
      return;
    }
    
    // Otherwise create our own
    if (audioContextRef.current) return;
    
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 512; // Optimized for performance
      analyser.smoothingTimeConstant = 0.8;
      
      const source = audioContextRef.current.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(audioContextRef.current.destination);
      
      analyserRef.current = analyser;
      sourceRef.current = source;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {
      console.error('Audio init error:', e);
    }
  }, [audioRef, playerAnalyser]);
  
  // Analyze audio frequencies with improved sensitivity
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;
    
    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    const data = dataArrayRef.current;
    const bufferLength = data.length;
    
    // Frequency band analysis (more granular for better beat detection)
    // Sub-bass: 20-60Hz (indices 0-2)
    // Bass: 60-250Hz (indices 2-10)
    // Low-mid: 250-500Hz (indices 10-20)
    // Mid: 500-2kHz (indices 20-80)
    // High: 2k-16kHz (indices 80+)
    
    let subBass = 0, bass = 0, lowMid = 0, mid = 0, high = 0, total = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const val = data[i];
      total += val;
      
      if (i < 3) subBass += val;
      else if (i < 10) bass += val;
      else if (i < 20) lowMid += val;
      else if (i < 80) mid += val;
      else high += val;
    }
    
    // Normalize values
    const audioData = audioDataRef.current;
    const prevBass = audioData.bass;
    
    audioData.subBass = subBass / (3 * 255);
    audioData.bass = (bass + lowMid * 0.5) / (15 * 255); // Include some low-mid for lighter bass
    audioData.mid = mid / (60 * 255);
    audioData.high = high / ((bufferLength - 80) * 255);
    audioData.vol = total / (bufferLength * 255);
    
    // Smoothing for visual stability (exponential moving average)
    const smoothFactor = 0.3;
    audioData.subBassSmoothed = audioData.subBassSmoothed * (1 - smoothFactor) + audioData.subBass * smoothFactor;
    audioData.bassSmoothed = audioData.bassSmoothed * (1 - smoothFactor) + audioData.bass * smoothFactor;
    audioData.midSmoothed = audioData.midSmoothed * (1 - smoothFactor) + audioData.mid * smoothFactor;
    audioData.highSmoothed = audioData.highSmoothed * (1 - smoothFactor) + audioData.high * smoothFactor;
    
    // Enhanced beat detection (detects light bass like Starboy)
    const now = performance.now();
    const bassJump = audioData.bass - prevBass;
    const timeSinceLastBeat = now - lastBeatRef.current;
    
    // Multi-threshold beat detection
    const isHeavyBeat = audioData.bass > 0.55 && bassJump > 0.1;
    const isLightBeat = audioData.bass > 0.35 && bassJump > 0.08 && audioData.subBass > 0.3;
    const isMidBeat = audioData.mid > 0.5 && audioData.bassSmoothed > 0.25;
    
    if ((isHeavyBeat || isLightBeat || isMidBeat) && timeSinceLastBeat > 180) {
      const beatInterval = now - lastBeatRef.current;
      lastBeatRef.current = now;
      
      // BPM calculation with history
      if (beatInterval > 200 && beatInterval < 2000) {
        beatHistoryRef.current.push(beatInterval);
        if (beatHistoryRef.current.length > 8) {
          beatHistoryRef.current.shift();
        }
        
        if (beatHistoryRef.current.length >= 4) {
          const avgInterval = beatHistoryRef.current.reduce((a, b) => a + b, 0) / beatHistoryRef.current.length;
          audioData.bpm = Math.round(60000 / avgInterval);
        }
      }
      
      // Spawn shockwave with intensity based on beat type
      const intensity = isHeavyBeat ? 1.5 : (isLightBeat ? 1.0 : 0.7);
      spawnShockwave(intensity);
    }
  }, [spawnShockwave]);
  
  // Draw 2D HUD overlay
  const drawHUD = useCallback(() => {
    if (!hudCanvasRef.current) return;
    
    const ctx = hudCanvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const width = hudCanvasRef.current.width;
    const height = hudCanvasRef.current.height;
    const audioData = audioDataRef.current;
    const theme = themes[config.theme];
    
    ctx.clearRect(0, 0, width, height);
    
    // BPM display
    if (audioData.vol > 0.01) {
      ctx.textAlign = 'right';
      ctx.font = 'bold 42px "Space Mono", "SF Mono", monospace';
      ctx.fillStyle = theme.p;
      ctx.shadowColor = theme.p;
      ctx.shadowBlur = 15;
      ctx.fillText(`${audioData.bpm} BPM`, width - 40, 60);
      
      ctx.shadowBlur = 0;
      ctx.font = '12px "Space Mono", monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(`ENERGY: ${Math.round(audioData.vol * 100)}%`, width - 40, 85);
    }
    
    // Frequency bars
    if (config.showBars && dataArrayRef.current) {
      const bars = 64;
      const barWidth = width / bars;
      const data = dataArrayRef.current;
      
      for (let i = 0; i < bars; i++) {
        const idx = Math.floor((i / bars) * (data.length * 0.7));
        const val = data[idx] / 255.0;
        const h = val * (height * 0.35);
        
        // Gradient based on frequency
        const hue = (i / bars) * 60; // Shift from green to yellow
        ctx.fillStyle = theme.p;
        ctx.globalAlpha = 0.6 + val * 0.4;
        
        // Add glow effect
        ctx.shadowColor = theme.p;
        ctx.shadowBlur = 10 * val;
        
        ctx.fillRect(i * barWidth, height - h, barWidth - 2, h);
      }
      
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
    }
  }, [config.showBars, config.theme, themes]);
  
  // Main animation loop with performance optimizations
  const animate = useCallback(() => {
    if (!isActive) return;
    
    animationRef.current = requestAnimationFrame(animate);
    
    if (!rendererRef.current || !composerRef.current || !sceneRef.current || !cameraRef.current) {
      return;
    }
    
    const delta = clockRef.current?.getDelta() || 0.016;
    timeRef.current += delta;
    const time = timeRef.current;
    
    // Analyze audio
    analyzeAudio();
    
    const audioData = audioDataRef.current;
    const S = config.sensitivity;
    const E = audioData.vol * S;
    
    // Animate core
    if (coreGroupRef.current) {
      coreGroupRef.current.rotation.y += 0.005 + E * 0.025;
      coreGroupRef.current.rotation.x += audioData.midSmoothed * 0.01;
      
      // Pulse effect on bass
      const bassScale = 1 + audioData.bassSmoothed * 0.5 * S;
      coreGroupRef.current.scale.setScalar(bassScale);
    }
    
    // Animate shockwaves
    for (let i = shocksRef.current.length - 1; i >= 0; i--) {
      const s = shocksRef.current[i];
      s.age += delta * 1.5;
      
      const scale = 1 + s.age * 10 * s.intensity;
      s.mesh.scale.setScalar(scale);
      s.mesh.material.opacity = Math.max(0, 1 - s.age);
      
      if (s.age >= 1) {
        sceneRef.current.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
        shocksRef.current.splice(i, 1);
      }
    }
    
    // Animate particles
    if (particlesRef.current) {
      particlesRef.current.rotation.y = time * 0.05;
      particlesRef.current.rotation.x = Math.sin(time * 0.02) * 0.1;
      particlesRef.current.material.opacity = 0.4 + audioData.highSmoothed * 0.4;
    }
    
    // Animate stars
    if (starsRef.current) {
      starsRef.current.rotation.y = time * 0.01;
    }
    
    // Camera animation
    const R = 35;
    const camera = cameraRef.current;
    
    switch (config.camMode) {
      case 'reactive':
        const d = R - audioData.bassSmoothed * 15;
        camera.position.set(
          Math.cos(time * 0.3) * d,
          5 + audioData.midSmoothed * 5,
          Math.sin(time * 0.3) * d
        );
        break;
      case 'vortex':
        camera.position.set(
          Math.cos(time * 0.4) * (R - 10),
          15 + Math.sin(time * 0.5) * 10,
          Math.sin(time * 0.4) * (R - 10)
        );
        break;
      case 'cinematic':
        camera.position.set(
          Math.cos(time * 0.1) * R * 1.2,
          10 + Math.sin(time * 0.15) * 8,
          Math.sin(time * 0.1) * R * 1.2
        );
        break;
      case 'orbit':
      default:
        camera.position.set(
          Math.cos(time * 0.2) * R,
          5 + Math.sin(time * 0.1) * 5,
          Math.sin(time * 0.2) * R
        );
    }
    camera.lookAt(0, 0, 0);
    
    // Render
    rendererRef.current.clear();
    composerRef.current.render();
    drawHUD();
  }, [isActive, analyzeAudio, drawHUD, config.sensitivity, config.camMode]);
  
  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current || !composerRef.current) return;
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
      composerRef.current.setSize(width, height);
      
      if (hudCanvasRef.current) {
        hudCanvasRef.current.width = width;
        hudCanvasRef.current.height = height;
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Initialize scene when active
  useEffect(() => {
    if (isActive && !sceneRef.current) {
      initScene();
    }
  }, [isActive, initScene]);
  
  // Initialize audio when playing
  useEffect(() => {
    if (isActive && isPlaying) {
      initAudio();
    }
  }, [isActive, isPlaying, initAudio]);
  
  // Start/stop animation loop
  useEffect(() => {
    if (isActive && sceneRef.current) {
      animate();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, animate]);
  
  // Update theme
  useEffect(() => {
    if (!rimMatRef.current || !sceneRef.current) return;
    
    const theme = themes[config.theme];
    rimMatRef.current.uniforms.color.value.set(theme.p);
    
    if (sceneRef.current.fog) {
      sceneRef.current.fog.color.set(theme.bg);
    }
  }, [config.theme, themes]);
  
  // Update bloom
  useEffect(() => {
    if (bloomRef.current) {
      bloomRef.current.strength = config.bloom;
    }
  }, [config.bloom]);
  
  // Update trail
  useEffect(() => {
    if (afterRef.current) {
      afterRef.current.uniforms['damp'].value = config.trail;
    }
  }, [config.trail]);
  
  // Update rim power
  useEffect(() => {
    if (rimMatRef.current) {
      rimMatRef.current.uniforms.power.value = config.rimPower;
    }
  }, [config.rimPower]);
  
  // Rebuild core on form change
  useEffect(() => {
    const rebuildCore = async () => {
      if (!coreGroupRef.current) return;
      const THREE = await import('three');
      buildCore(THREE, config.form);
    };
    rebuildCore();
  }, [config.form, buildCore]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      // Dispose Three.js resources
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      
      // Clean up shockwaves
      shocksRef.current.forEach(s => {
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
      });
      shocksRef.current = [];
      
      // Note: Don't dispose audio context as it's shared
    };
  }, []);
  
  // Config update handlers
  const updateConfig = useCallback((key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);
  
  if (!isActive) return null;
  
  return (
    <div ref={containerRef} className={styles.visualizerContainer}>
      <canvas ref={canvasRef} className={styles.mainCanvas} />
      <canvas ref={hudCanvasRef} className={styles.hudCanvas} />
      
      {/* Config Controls */}
      <div className={styles.configPanel}>
        <div className={styles.configSection}>
          <label>Geometry</label>
          <select 
            value={config.form} 
            onChange={(e) => updateConfig('form', e.target.value)}
            className={styles.select}
          >
            <option value="icosahedron">Cyber Icosahedron</option>
            <option value="torusKnot">Infinity Knot</option>
            <option value="sphere">Data Sphere</option>
            <option value="octahedron">Crystal Core</option>
          </select>
        </div>
        
        <div className={styles.configSection}>
          <label>Theme</label>
          <select 
            value={config.theme} 
            onChange={(e) => updateConfig('theme', e.target.value)}
            className={styles.select}
          >
            <option value="neon">Cyber Green</option>
            <option value="magenta">Neon Pink</option>
            <option value="cyan">Tron Blue</option>
            <option value="gold">Luxury Gold</option>
            <option value="void">Deep Space</option>
          </select>
        </div>
        
        <div className={styles.configSection}>
          <label>Camera Mode</label>
          <select 
            value={config.camMode} 
            onChange={(e) => updateConfig('camMode', e.target.value)}
            className={styles.select}
          >
            <option value="orbit">Smooth Orbit</option>
            <option value="reactive">Beat Reactive</option>
            <option value="vortex">Vortex Dive</option>
            <option value="cinematic">Cinematic Pan</option>
          </select>
        </div>
        
        <div className={styles.configSection}>
          <label>Intensity: {config.sensitivity.toFixed(1)}</label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={config.sensitivity}
            onChange={(e) => updateConfig('sensitivity', parseFloat(e.target.value))}
            className={styles.slider}
          />
        </div>
        
        <div className={styles.configSection}>
          <label>Bloom: {config.bloom.toFixed(1)}</label>
          <input
            type="range"
            min="0"
            max="3"
            step="0.1"
            value={config.bloom}
            onChange={(e) => updateConfig('bloom', parseFloat(e.target.value))}
            className={styles.slider}
          />
        </div>
        
        <div className={styles.configSection}>
          <label>Trail: {config.trail.toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="0.95"
            step="0.05"
            value={config.trail}
            onChange={(e) => updateConfig('trail', parseFloat(e.target.value))}
            className={styles.slider}
          />
        </div>
        
        <div className={styles.toggleRow}>
          <span>EQ Bars</span>
          <button
            className={`${styles.toggle} ${config.showBars ? styles.toggleActive : ''}`}
            onClick={() => updateConfig('showBars', !config.showBars)}
          >
            <span className={styles.toggleDot} />
          </button>
        </div>
        
        <div className={styles.toggleRow}>
          <span>Shockwaves</span>
          <button
            className={`${styles.toggle} ${config.showShock ? styles.toggleActive : ''}`}
            onClick={() => updateConfig('showShock', !config.showShock)}
          >
            <span className={styles.toggleDot} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioVisualizer;
