import React from 'react';
import { useLocation } from 'react-router-dom';
import rotateIcon from '../assets/screen_rotate_warn.png';

const RotateWarning = () => {
    const location = useLocation();

    // Do not show on admin panel
    if (location.pathname.startsWith('/admin')) {
        return null;
    }

    return (
        <div className="rotate-warning fixed inset-0 z-[9999] bg-black flex-col items-center justify-center text-center p-8 hidden">
            <div className="relative w-24 h-24 mb-8">
                <img
                    src={rotateIcon}
                    alt="Rotate Device"
                    className="w-full h-full object-contain animate-spin-slow"
                    style={{ animationDuration: '3s' }}
                />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 tracking-wider">PLEASE ROTATE</h2>
            <p className="text-neonCyan text-sm tracking-[0.2em] uppercase opacity-80 animate-pulse">
                Portrait Mode Required
            </p>

            <style>{`
                /* Only show on mobile landscape */
                @media screen and (max-width: 900px) and (orientation: landscape) and (max-height: 500px) {
                    .rotate-warning {
                        display: flex !important;
                    }
                    /* Lock scroll when warning is visible */
                    body {
                        overflow: hidden;
                    }
                }
                
                @keyframes spin-slow {
                    0% { transform: rotate(90deg); }
                    20% { transform: rotate(0deg); }
                    80% { transform: rotate(0deg); }
                    100% { transform: rotate(90deg); }
                }

                @keyframes spin-reverse-slow {
                    0% { transform: rotate(-90deg); }
                    100% { transform: rotate(0deg); }
                }
                
                .animate-spin-slow {
                    animation: spin-slow 4s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default RotateWarning;
