import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, CalendarCheck, Wallet, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '../../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import ViewCartPill from '../shared/ViewCartPill';

const isRouteActive = (itemPath, currentPath) => {
    if (itemPath === '/') {
        return currentPath === '/' || currentPath === '/offers' || currentPath === '/search';
    }
    if (itemPath === '/categories') {
        return currentPath.startsWith('/categories') || currentPath.startsWith('/category');
    }
    if (itemPath === '/orders') {
        return currentPath.startsWith('/orders') || currentPath.startsWith('/payment-status');
    }
    if (itemPath === '/wallet') {
        return currentPath.startsWith('/wallet');
    }
    if (itemPath === '/profile') {
        return (
            currentPath.startsWith('/profile') ||
            currentPath.startsWith('/addresses') ||
            currentPath.startsWith('/settings') ||
            currentPath.startsWith('/help') ||
            currentPath.startsWith('/support') ||
            currentPath.startsWith('/about') ||
            currentPath.startsWith('/privacy') ||
            currentPath.startsWith('/wishlist') ||
            currentPath.startsWith('/transactions')
        );
    }
    return currentPath === itemPath || (itemPath !== '/' && currentPath.startsWith(itemPath));
};

const BottomNav = () => {
    const location = useLocation();
    const { cartCount } = useCart();

    const leftNavItems = [
        { label: 'Home', icon: Home, path: '/' },
        { label: 'Categories', icon: LayoutGrid, path: '/categories' },
        { label: 'Orders', icon: CalendarCheck, path: '/orders' },
    ];

    const rightNavItems = [
        { label: 'Wallet', icon: Wallet, path: '/wallet' },
        { label: 'Account', icon: User, path: '/profile' },
    ];

    return (
        <div 
            className="fixed bottom-0 left-0 right-0 z-[500] bg-white border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden pointer-events-auto"
            style={{ paddingBottom: "calc(0.4rem + env(safe-area-inset-bottom, 0px))" }}
        >
            <div className="max-w-lg mx-auto px-2 pt-1.5 pb-1 flex items-center justify-between relative">

                {/* View cart pill (shown when cart has items) */}
                <AnimatePresence>
                    {cartCount > 0 && (
                        <motion.div
                            initial={{ y: 30, opacity: 0, x: '-50%' }}
                            animate={{ y: 0, opacity: 1, x: '-50%' }}
                            exit={{ y: 30, opacity: 0, x: '-50%' }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            className="absolute left-1/2 bottom-full mb-3 z-20"
                        >
                            <ViewCartPill />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 5 Icons */}
                <div className="flex items-center justify-between w-full">
                    {[...leftNavItems, ...rightNavItems].map((item) => {
                        const isActive = isRouteActive(item.path, location.pathname);

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-0.5 px-1 py-1 rounded-xl transition-all duration-200 flex-1 min-w-0",
                                    isActive
                                        ? "text-[#ff5500] font-extrabold"
                                        : "text-slate-500 hover:text-slate-700 font-medium"
                                )}
                            >
                                <motion.div
                                    animate={{ scale: isActive ? 1.15 : 1, y: isActive ? -1 : 0 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                    className={cn(
                                        "flex items-center justify-center p-1 rounded-xl transition-colors",
                                        isActive ? "bg-[#fff0e6]" : ""
                                    )}
                                >
                                    <item.icon
                                        size={18}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={cn("transition-colors shrink-0", isActive ? "text-[#ff5500]" : "text-slate-500")}
                                    />
                                </motion.div>
                                <span className={cn("text-[10px] whitespace-nowrap leading-none", isActive ? "text-[#ff5500] font-black" : "text-slate-500 font-medium")}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>

            </div>
        </div>
    );
};

export default BottomNav;

