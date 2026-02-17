import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const features = [
    {
        title: 'Real-Time',
        highlight: 'Chat System',
        desc: 'Message friends, share songs, and create group conversations — all without leaving the music.',
        icon: (
            <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12 md:w-16 md:h-16">
                <path d="M8 12C8 9.79 9.79 8 12 8H36C38.21 8 40 9.79 40 12V28C40 30.21 38.21 32 36 32H20L12 40V32H12C9.79 32 8 30.21 8 28V12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="18" cy="20" r="2" fill="currentColor" />
                <circle cx="24" cy="20" r="2" fill="currentColor" />
                <circle cx="30" cy="20" r="2" fill="currentColor" />
            </svg>
        ),
    },
    {
        title: 'Activity',
        highlight: 'Broadcasting',
        desc: 'See what your friends are listening to in real-time. Share your vibe, discover theirs.',
        icon: (
            <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12 md:w-16 md:h-16">
                <circle cx="24" cy="24" r="4" fill="currentColor" />
                <path d="M16 16C12.7 19.3 12.7 28.7 16 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M32 16C35.3 19.3 35.3 28.7 32 32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M10 10C4 16 4 32 10 38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M38 10C44 16 44 32 38 38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        title: 'Reactive',
        highlight: 'Visualizer',
        desc: 'Music-reactive bars and neon effects that pulse with every beat. Your music, visualized.',
        icon: (
            <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12 md:w-16 md:h-16">
                <rect x="6" y="20" width="4" height="12" rx="2" fill="currentColor" opacity="0.6" />
                <rect x="14" y="14" width="4" height="24" rx="2" fill="currentColor" opacity="0.8" />
                <rect x="22" y="8" width="4" height="36" rx="2" fill="currentColor" />
                <rect x="30" y="16" width="4" height="20" rx="2" fill="currentColor" opacity="0.8" />
                <rect x="38" y="22" width="4" height="8" rx="2" fill="currentColor" opacity="0.6" />
            </svg>
        ),
    },
    {
        title: 'Hybrid',
        highlight: 'Playback',
        desc: 'Preview tracks instantly. Upgrade to unlock full songs with lossless streaming.',
        icon: (
            <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12 md:w-16 md:h-16">
                <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="2" />
                <path d="M20 16V32L34 24L20 16Z" fill="currentColor" />
                <path d="M24 6V10M24 38V42M6 24H10M38 24H42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
    },
];

const FeaturesSection = () => {
    const sectionRef = useRef(null);
    const panelsRef = useRef([]);

    useEffect(() => {
        const section = sectionRef.current;
        const panels = panelsRef.current;

        const ctx = gsap.context(() => {
            // Single master timeline tied to one ScrollTrigger — guarantees perfect sync
            const masterTL = gsap.timeline({
                scrollTrigger: {
                    trigger: section,
                    start: 'top top',
                    end: `+=${features.length * 80}%`,
                    pin: true,
                    scrub: 0.3,
                },
            });

            panels.forEach((panel, i) => {
                // Fade in
                masterTL.fromTo(panel,
                    { opacity: 0, y: 80, scale: 0.95 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
                );
                // Hold visible
                masterTL.to({}, { duration: 0.25 });
                // Fade out (except last)
                if (i < features.length - 1) {
                    masterTL.to(panel,
                        { opacity: 0, y: -60, scale: 1.02, duration: 0.3, ease: 'power2.in' }
                    );
                }
            });
        }, section);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={sectionRef} className="h-screen bg-black relative overflow-hidden">
            {/* Background grid lines */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(0,255,217,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,217,0.3) 1px, transparent 1px)',
                    backgroundSize: '60px 60px'
                }}
            />

            {features.map((feature, idx) => (
                <div
                    key={idx}
                    ref={el => panelsRef.current[idx] = el}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
                    style={{ opacity: 0 }}
                >
                    {/* Feature number */}
                    <span className="text-cyan-400/10 text-[120px] md:text-[200px] font-bold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
                        0{idx + 1}
                    </span>

                    <div className="relative z-10 flex flex-col items-center">
                        {/* Icon */}
                        <div className="text-cyan-400 mb-6 drop-shadow-[0_0_20px_rgba(0,255,217,0.4)]">
                            {feature.icon}
                        </div>

                        <h3 className="text-5xl md:text-8xl font-bold text-white tracking-tight leading-none">
                            {feature.title}
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200">
                                {feature.highlight}
                            </span>
                        </h3>
                        <p className="mt-6 text-lg md:text-2xl text-gray-400 max-w-lg mx-auto leading-relaxed">
                            {feature.desc}
                        </p>
                    </div>
                </div>
            ))}

            {/* Progress dots */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
                {features.map((_, idx) => (
                    <div key={idx} className="w-2 h-2 rounded-full bg-gray-600" />
                ))}
            </div>
        </section>
    );
};

export default FeaturesSection;
