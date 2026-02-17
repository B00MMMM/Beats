import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CTASection = () => {
    const sectionRef = useRef(null);
    const contentRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        const section = sectionRef.current;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: section,
                    start: 'top 70%',
                    end: 'top 20%',
                    scrub: true,
                }
            });

            tl.fromTo(contentRef.current,
                { y: 100, opacity: 0, scale: 0.9 },
                { y: 0, opacity: 1, scale: 1, ease: 'power3.out' }
            );

            tl.fromTo(buttonRef.current,
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, ease: 'power3.out' },
                '-=0.3'
            );
        }, section);

        return () => ctx.revert();
    }, []);

    return (
        <section ref={sectionRef} className="min-h-[80vh] bg-black flex flex-col justify-center items-center relative overflow-hidden">
            {/* Glow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-400/10 rounded-full blur-[120px] pointer-events-none" />

            <div ref={contentRef} className="z-10 text-center px-6">
                <h2 className="text-5xl md:text-8xl font-bold text-white mb-4 tracking-tight leading-none">
                    Ready to
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white">
                        Begin?
                    </span>
                </h2>
                <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-md mx-auto">
                    Your sound. Your rules.
                </p>
            </div>

            <div ref={buttonRef} className="z-10">
                <Link to="/sign-in" className="group inline-flex items-center gap-4 px-10 py-5 rounded-full border border-cyan-400/30 bg-black/50 backdrop-blur-sm hover:bg-cyan-400/10 hover:border-cyan-400 transition-all duration-500">
                    <span className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors duration-300">
                        Get Started
                    </span>
                    <span className="text-cyan-400 group-hover:translate-x-1 transition-transform duration-300">
                        &rarr;
                    </span>
                </Link>
            </div>
        </section>
    );
};

export default CTASection;
