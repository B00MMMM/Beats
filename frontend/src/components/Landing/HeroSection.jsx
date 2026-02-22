import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Import all pre-extracted frames at build time via Vite glob
const frameModules = import.meta.glob('../../assets/frames/frame_*.webp', { eager: true });
const framePaths = Object.keys(frameModules)
    .sort()
    .map(key => frameModules[key].default);

const TOTAL_FRAMES = framePaths.length;

const HeroSection = () => {
    const sectionRef = useRef(null);
    const contentRef = useRef(null);
    const canvasRef = useRef(null);
    const textRef = useRef(null);
    const framesRef = useRef([]);
    const currentFrameRef = useRef(0);
    const [loadProgress, setLoadProgress] = useState(0);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        const section = sectionRef.current;
        let isMobile = window.innerWidth <= 768;

        // Set canvas size — skip if unchanged to prevent flicker
        let lastW = 0, lastH = 0;
        const resize = () => {
            isMobile = window.innerWidth <= 768;
            const container = contentRef.current;
            if (!container) return;

            const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
            // Use container dimensions, not window dimensions
            const w = Math.round(container.clientWidth * dpr);
            const h = Math.round(container.clientHeight * dpr);

            if (w === lastW && h === lastH) return;
            lastW = w;
            lastH = h;
            canvas.width = w;
            canvas.height = h;
            // Remove manual style setting so CSS (w-full h-full) controls it
            // canvas.style.width = window.innerWidth + 'px';
            // canvas.style.height = window.innerHeight + 'px';
            if (framesRef.current.length > 0) {
                drawFrame(currentFrameRef.current);
            }
        };
        resize();
        window.addEventListener('resize', resize);

        // Draw frame directly — no clearing needed, cover mode fills entire canvas
        // Draw frame directly — no clearing needed, cover mode fills entire canvas
        const drawFrame = (index) => {
            const frame = framesRef.current[index];
            if (!frame) return;
            currentFrameRef.current = index;

            const cw = canvas.width;
            const ch = canvas.height;

            // Clear canvas to prevent "ghosting" or overlapping artifacts when shifting
            ctx.clearRect(0, 0, cw, ch);

            const fw = frame.width;
            const fh = frame.height;

            const scale = Math.max(cw / fw, ch / fh);
            const w = fw * scale;
            const h = fh * scale;

            // Center normally, but shift left on mobile
            // Check width directly to ensure fresh state on initial draw
            const isMobileView = window.innerWidth <= 768;
            let x = (cw - w) / 2;
            if (isMobileView) {
                x -= 100; // Shift left by 100px on mobile
            }

            const y = (ch - h) / 2;

            ctx.drawImage(frame, x, y, w, h);
        };

        // Preload frames — on mobile, skip every other frame to halve memory
        const preloadFrames = async () => {
            const frames = [];
            const step = isMobile ? 2 : 1;
            const paths = framePaths.filter((_, i) => i % step === 0);

            for (let i = 0; i < paths.length; i++) {
                const img = new Image();
                img.crossOrigin = 'anonymous';

                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = paths[i];
                });

                const bitmap = await createImageBitmap(img);
                frames.push(bitmap);

                setLoadProgress(Math.round(((i + 1) / paths.length) * 100));
            }

            framesRef.current = frames;
            return frames;
        };

        // Cleanup references
        let rafId = null;
        let st = null;

        // Start preloading
        preloadFrames().then((frames) => {
            setIsReady(true);

            // Apple-style: raw rAF loop + lerp for buttery smooth frame scrubbing
            let targetFrame = 0;
            let currentFrame = 0;
            let lastDrawnFrame = -1;
            let isRunning = false;
            const LERP_FACTOR = 0.1;

            const tick = () => {
                const diff = targetFrame - currentFrame;

                // Stop if close enough
                if (Math.abs(diff) < 0.05) {
                    currentFrame = targetFrame;
                    isRunning = false;

                    const idx = Math.round(currentFrame);
                    if (idx !== lastDrawnFrame) {
                        lastDrawnFrame = idx;
                        drawFrame(idx);
                    }
                    return;
                }

                currentFrame += diff * LERP_FACTOR;

                const idx = Math.round(currentFrame);
                if (idx !== lastDrawnFrame) {
                    lastDrawnFrame = idx;
                    drawFrame(idx);
                }

                rafId = requestAnimationFrame(tick);
            };

            const startLoop = () => {
                if (!isRunning) {
                    isRunning = true;
                    tick();
                }
            };

            // Create ScrollTrigger (no pinning — use CSS sticky for better stability)
            st = ScrollTrigger.create({
                trigger: section,
                start: 'top top',
                end: 'bottom bottom',
                pin: false,
                onUpdate: (self) => {
                    targetFrame = self.progress * (frames.length - 1);
                    startLoop();

                    // Fade out check
                    if (contentRef.current) {
                        // Sudden fade: Start fading at 95% scroll (much later) and fade quickly
                        const fadeStart = 0.95;
                        if (self.progress > fadeStart) {
                            const opacity = Math.max(0, 1 - (self.progress - fadeStart) * 20); // 20 = 1 / 0.05
                            contentRef.current.style.opacity = opacity;
                        } else {
                            contentRef.current.style.opacity = 1;
                        }
                    }
                },
                onRefresh: (self) => {
                    // Force update on refresh/resize
                    const progress = self.progress;
                    const frame = Math.round(progress * (frames.length - 1));
                    targetFrame = frame;
                    currentFrame = frame;
                    lastDrawnFrame = frame;
                    drawFrame(frame);

                    // Initial opacity check
                    if (contentRef.current) {
                        const fadeStart = 0.95;
                        if (progress > fadeStart) {
                            const opacity = Math.max(0, 1 - (progress - fadeStart) * 20);
                            contentRef.current.style.opacity = opacity;
                        } else {
                            contentRef.current.style.opacity = 1;
                        }
                    }
                },
            });

            // Initial draw
            drawFrame(0);
        });

        return () => {
            window.removeEventListener('resize', resize);
            framesRef.current.forEach(b => b.close && b.close());
            framesRef.current = [];
            if (rafId) cancelAnimationFrame(rafId);
            if (st) st.kill();
        };
    }, []);

    return (
        <div ref={sectionRef} className="h-[300vh] bg-black relative">
            <div ref={contentRef} className="sticky top-0 w-full h-screen overflow-hidden transition-opacity duration-100 ease-linear">
                {!isReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black gap-6">
                        <p className="text-neonCyan text-sm tracking-[0.5em] uppercase animate-pulse">
                            Initializing System
                        </p>
                        <div className="w-48 h-[2px] bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-400 to-cyan-200 transition-all duration-200"
                                style={{ width: `${loadProgress}%` }}
                            />
                        </div>
                        <p className="text-gray-600 text-xs">{loadProgress}%</p>
                    </div>
                )}

                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
                <div className="absolute inset-0 bg-black/40 pointer-events-none" />

                <div ref={textRef} className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none mix-blend-difference">
                    <h1 className="text-6xl md:text-9xl font-bold text-white tracking-widest opacity-80"
                        style={{ textShadow: '0 0 20px rgba(0,255,217,0.5)' }}>
                        AWAKEN
                    </h1>
                </div>

                <div className="absolute bottom-10 w-full text-center text-neonCyan animate-pulse z-20 pointer-events-none">
                    <p className="text-xs md:text-sm tracking-[0.5em] uppercase opacity-90 drop-shadow-[0_0_10px_rgba(0,255,217,0.8)]">
                        Use Headphones For Best Experience
                    </p>
                </div>
            </div>
        </div>
    );
};

export default HeroSection;
