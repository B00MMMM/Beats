import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const genres = [
    { name: 'Electronic', gradient: 'from-cyan-600 to-cyan-900' },
    { name: 'Hip-Hop', gradient: 'from-gray-600 to-gray-900' },
    { name: 'Lo-Fi', gradient: 'from-cyan-800 to-gray-900' },
    { name: 'Ambient', gradient: 'from-gray-700 to-black' },
    { name: 'Future Bass', gradient: 'from-cyan-500 to-gray-800' },
    { name: 'Synthwave', gradient: 'from-gray-800 to-cyan-900' },
];

const ShowcaseSection = () => {
    const sectionRef = useRef(null);
    const trackRef = useRef(null);
    const headingRef = useRef(null);

    useEffect(() => {
        const section = sectionRef.current;
        const track = trackRef.current;

        const ctx = gsap.context(() => {
            // Heading fade in
            gsap.fromTo(headingRef.current,
                { y: 40, opacity: 0 },
                {
                    y: 0, opacity: 1, duration: 1, ease: 'power3.out',
                    scrollTrigger: {
                        trigger: section,
                        start: 'top 80%',
                    }
                }
            );

            // Horizontal scroll: only on desktop
            if (window.innerWidth > 768) {
                gsap.to(track, {
                    xPercent: -50,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: section,
                        pin: true,
                        scrub: 0.5,
                        end: '+=2000',
                    }
                });
            }
        }, section);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={sectionRef} className="h-screen bg-black overflow-hidden flex flex-col justify-center relative">
            {/* Subtle top gradient */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none" />

            <h3 ref={headingRef} className="text-3xl md:text-5xl text-white font-bold px-10 md:px-20 mb-10 relative z-20">
                Explore <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200">Genres</span>
            </h3>

            <div ref={trackRef} className="flex gap-6 px-10 md:px-20 w-fit">
                {genres.map((genre, idx) => (
                    <div
                        key={idx}
                        className={`w-[70vw] md:w-[400px] h-[50vh] md:h-[400px] shrink-0 rounded-3xl
                            bg-gradient-to-br ${genre.gradient}
                            flex items-end p-8
                            border border-white/5
                            hover:border-cyan-400/30 transition-all duration-500
                            hover:scale-[1.02] cursor-pointer
                            shadow-xl shadow-black/50`}
                    >
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">Genre</p>
                            <h4 className="text-3xl md:text-4xl font-bold text-white">{genre.name}</h4>
                        </div>
                    </div>
                ))}
            </div>

            {/* Subtle bottom gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none" />
        </section>
    );
};

export default ShowcaseSection;
