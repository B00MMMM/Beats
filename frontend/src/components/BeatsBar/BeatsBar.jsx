import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import styles from './BeatsBar.module.css';

const BeatsBar = () => {
    const canvasRef = useRef(null);
    const { analyser, isPlaying } = usePlayer();

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width = canvas.offsetWidth * window.devicePixelRatio;
            canvas.height = canvas.offsetHeight * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        resize();
        window.addEventListener('resize', resize);

        const barCount = 60;
        const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
        let animationId;

        const draw = () => {
            animationId = requestAnimationFrame(draw);

            const width = canvas.offsetWidth;
            const height = canvas.offsetHeight;

            ctx.clearRect(0, 0, width, height);

            if (!analyser || !dataArray || !isPlaying) {
                // Idle animation
                for (let i = 0; i < barCount; i++) {
                    const barWidth = width / barCount - 2;
                    const x = i * (width / barCount);
                    const idleHeight = 2 + Math.sin(Date.now() * 0.003 + i * 0.2) * 2;

                    const gradient = ctx.createLinearGradient(0, height - idleHeight, 0, height);
                    gradient.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
                    gradient.addColorStop(1, 'rgba(255, 0, 255, 0.3)');

                    ctx.fillStyle = gradient;
                    ctx.fillRect(x, height - idleHeight, barWidth, idleHeight);
                }
                return;
            }

            analyser.getByteFrequencyData(dataArray);

            for (let i = 0; i < barCount; i++) {
                const dataIndex = Math.floor(i * dataArray.length / barCount);
                const value = dataArray[dataIndex] / 255;

                const barWidth = width / barCount - 2;
                const barHeight = value * height * 0.8;
                const x = i * (width / barCount);

                // Gradient based on frequency
                const hue = (i / barCount) * 60 + 270; // Purple to cyan
                const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
                gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.8)`);
                gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0.3)`);

                ctx.fillStyle = gradient;
                ctx.fillRect(x, height - barHeight, barWidth, barHeight);

                // Glow effect
                ctx.shadowBlur = 10;
                ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.5)`;
            }

            ctx.shadowBlur = 0;
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }, [analyser, isPlaying]);

    return <canvas ref={canvasRef} className={styles.beatsBar} />;
};

export default BeatsBar;
