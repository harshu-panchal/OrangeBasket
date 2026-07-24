import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import LottieTransitionOverlay from '../components/shared/LottieTransitionOverlay';

export const globalLoadingManager = {
    start: null,
    stop: null
};

const PageTransitionContext = createContext(null);

export const usePageTransition = () => useContext(PageTransitionContext);

export const PageTransitionProvider = ({ children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isNetworkLoading, setIsNetworkLoading] = useState(false);
    const location = useLocation();
    const isFirstMount = useRef(true);

    // Trigger transition on route change
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            setIsVisible(true);
            return;
        }

        setIsVisible(true);
    }, [location.pathname]);

    const handleAnimationComplete = () => {
        // Only hide if it's a page transition (not a network loading state)
        if (!isNetworkLoading) {
            setIsVisible(false);
        }
    };

    useEffect(() => {
        const handleStart = () => {
            setIsNetworkLoading(true);
            setIsVisible(true);
        };
        const handleStop = () => {
            setIsNetworkLoading(false);
            setIsVisible(false);
        };

        globalLoadingManager.start = handleStart;
        globalLoadingManager.stop = handleStop;

        return () => {
            globalLoadingManager.start = null;
            globalLoadingManager.stop = null;
        };
    }, []);

    const startLoading = () => {
        setIsNetworkLoading(true);
        setIsVisible(true);
    };

    const stopLoading = () => {
        setIsNetworkLoading(false);
        setIsVisible(false);
    };

    return (
        <PageTransitionContext.Provider value={{ startLoading, stopLoading }}>
            {children}
            <LottieTransitionOverlay 
                isVisible={isVisible} 
                isNetworkLoading={isNetworkLoading} 
                onComplete={handleAnimationComplete}
            />
        </PageTransitionContext.Provider>
    );
};
