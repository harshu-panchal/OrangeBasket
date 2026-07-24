import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ParticleBurst = ({ isActive, color = "#ef4444", count = 6 }) => {
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <AnimatePresence>
                {isActive && (
                    <div className="relative w-full h-full flex items-center justify-center">
                        {[...Array(count)].map((_, i) => {
                            const angle = (i * (360 / count)) * (Math.PI / 180);
                            const distance = 45; // Spread distance
                            const x = Math.cos(angle) * distance;
                            const y = Math.sin(angle) * distance;

                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                                    animate={{ opacity: 0, scale: 1.5, x, y }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.7, ease: "easeOut" }}
                                    className="absolute w-2 h-2 rounded-full"
                                    style={{ backgroundColor: color }}
                                />
                            );
                        })}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ParticleBurst;
