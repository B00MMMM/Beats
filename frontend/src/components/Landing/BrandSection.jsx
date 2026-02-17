import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import logo from '../../assets/Beats-logo.png';

gsap.registerPlugin(ScrollTrigger);

const BrandSection = () => {
    const sectionRef = useRef(null);
    const logoRef = useRef(null);
    const headlineRef = useRef(null);
    const taglineRef = useRef(null);
    const lineRef = useRef(null);

    useEffect(() => {
        const section = sectionRef.current;
        const ctx = gsap.context(() => {
            // Pin the section
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: section,
                    start: 'top top',
                    end: '+=150%',
                    pin: true,
                    scrub: true,
                }
            });

            // Logo scales down and fades, headline enters
            tl.fromTo(logoRef.current,
                { scale: 1.5, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.3 }
            )
                .fromTo(lineRef.current,
                    { scaleX: 0 },
                    { scaleX: 1, duration: 0.2 },
                    0.15
                )
                .fromTo(headlineRef.current,
                    { y: 60, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.3 },
                    0.2
                )
                .fromTo(taglineRef.current,
                    { y: 40, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.3 },
                    0.35
                )
                // Hold everything visible
                .to({}, { duration: 0.2 })
                // Then fade everything out as user scrolls on
                .to([logoRef.current, lineRef.current, headlineRef.current, taglineRef.current],
                    { opacity: 0, y: -30, duration: 0.2, stagger: 0.03 }
                );
        }, section);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={sectionRef} className="h-screen bg-black flex flex-col justify-center items-center relative overflow-hidden">
            {/* Subtle radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,217,0.04),transparent_70%)] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl">
                <img
                    ref={logoRef}
                    src={logo}
                    alt="Beats Logo"
                    className="w-24 h-24 md:w-32 md:h-32 mb-8 object-contain"
                />

                <div ref={lineRef} className="w-16 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent mb-10 origin-center" />

                <h2 ref={headlineRef} className="text-5xl md:text-8xl font-bold text-white tracking-tight leading-none mb-6">
                    Feel The Future
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200">
                        of Sound
                    </span>
                </h2>

                <p ref={taglineRef} className="text-lg md:text-xl text-gray-400 max-w-xl leading-relaxed">
                    High-fidelity streaming. Intelligent curation.
                    <span className="text-gray-300"> Sound tailored to your soul.</span>
                </p>
            </div>
        </section>
    );
};

export default BrandSection;
