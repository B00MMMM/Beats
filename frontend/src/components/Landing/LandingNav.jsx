import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/Beats-logo.png';

const LandingNav = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-md py-3' : 'bg-transparent py-5'}`}>
            <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <img src={logo} alt="Beats" className="w-8 h-8 object-contain" />
                    <span className="text-xl font-bold tracking-tighter text-white">BEATS</span>
                </div>
                <Link to="/sign-in">
                    <button className="px-6 py-2 rounded-full border border-white/20 hover:border-cyan-400 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all duration-300 text-sm font-medium tracking-wide text-white">
                        SIGN IN
                    </button>
                </Link>
            </div>
        </nav>
    );
};

export default LandingNav;
