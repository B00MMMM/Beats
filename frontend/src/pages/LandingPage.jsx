import React, { useEffect } from 'react';
import HeroSection from '../components/Landing/HeroSection';
import BrandSection from '../components/Landing/BrandSection';
import FeaturesSection from '../components/Landing/FeaturesSection';

import CTASection from '../components/Landing/CTASection';
import LandingNav from '../components/Landing/LandingNav';

const LandingPage = () => {
    useEffect(() => {
        document.body.classList.add('landing-active');
        return () => document.body.classList.remove('landing-active');
    }, []);

    return (
        <div className="bg-cyberBlack min-h-screen">
            <LandingNav />
            <HeroSection />
            <BrandSection />
            <FeaturesSection />

            <CTASection />

            <footer className="py-8 text-center text-gray-500 bg-black text-sm">
                &copy; {new Date().getFullYear()} Beats. All rights reserved.
            </footer>
        </div>
    );
};

export default LandingPage;
