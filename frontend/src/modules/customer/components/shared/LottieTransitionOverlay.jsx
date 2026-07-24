import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import animationData from '../../../../assets/Thanksgiving basket.json';

const LottieTransitionOverlay = ({ isVisible, isNetworkLoading, onComplete }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.3 } }}
                    className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white"
                    style={{ pointerEvents: 'auto' }}
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="w-64 h-64 md:w-80 md:h-80 flex flex-col items-center justify-center"
                    >
                        <Lottie 
                            animationData={animationData} 
                            loop={isNetworkLoading} 
                            autoplay={true} 
                            onComplete={onComplete}
                            className="w-full h-full"
                        />
                        {isNetworkLoading && (
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="mt-4 text-slate-600 font-bold tracking-widest uppercase text-sm animate-pulse"
                            >
                                Loading...
                            </motion.p>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LottieTransitionOverlay;
