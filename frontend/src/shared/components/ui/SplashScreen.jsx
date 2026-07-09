import React, { useState, useEffect } from 'react';

const SplashScreen = ({ children }) => {
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        // Only show once per session
        const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
        
        // We also want to check if it's mobile view. A simple check:
        const isMobile = window.innerWidth <= 768;

        if (hasSeenSplash || !isMobile) {
            setShowSplash(false);
            return;
        }

        const timer = setTimeout(() => {
            setShowSplash(false);
            sessionStorage.setItem('hasSeenSplash', 'true');
        }, 4000); // 4 seconds

        return () => clearTimeout(timer);
    }, []);

    if (showSplash) {
        let splashImage = "/init page .png";
        if (window.location.pathname.startsWith('/delivery')) {
            splashImage = "/driverinit page .png";
        }
        
        return (
            <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center overflow-hidden lg:hidden">
                <img 
                    src={splashImage} 
                    alt="App Init" 
                    className="w-full h-full object-cover"
                />
            </div>
        );
    }

    return children;
};

export default SplashScreen;
