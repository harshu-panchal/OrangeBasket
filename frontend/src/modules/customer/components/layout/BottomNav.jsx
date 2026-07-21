import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, CalendarCheck, Wallet, User, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '../../context/CartContext';
import { motion } from 'framer-motion';

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
            currentPath.startsWith('/support') ||
            currentPath.startsWith('/about') ||
            currentPath.startsWith('/privacy') ||
            currentPath.startsWith('/terms') ||
            currentPath.startsWith('/wishlist') ||
            currentPath.startsWith('/transactions')
        );
    }
    return currentPath === itemPath || (itemPath !== '/' && currentPath.startsWith(itemPath));
};

const BottomNav = () => {
    const location = useLocation();
    const navigate = useNavigate();
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
        <div className="fixed bottom-3 left-1.5 right-1.5 z-[500] max-w-lg mx-auto md:hidden pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-md rounded-full border border-slate-100 shadow-[0_12px_36px_rgba(15,23,42,0.12)] px-1.5 py-1 flex items-center justify-between relative">
                
                {/* Left Side Items */}
                <div className="flex items-center justify-around flex-1 min-w-0">
                    {leftNavItems.map((item) => {
                        const isActive = isRouteActive(item.path, location.pathname);

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-300 shrink-0",
                                    isActive 
                                        ? "bg-[#fff0e6] text-[#ff5500] font-extrabold shadow-2xs" 
                                        : "text-slate-500 hover:text-slate-700 font-medium"
                                )}
                            >
                                <item.icon
                                    size={17}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={cn("transition-colors shrink-0", isActive ? "text-[#ff5500]" : "text-slate-500")}
                                />
                                <span className={cn("text-[10.5px] whitespace-nowrap leading-none", isActive ? "text-[#ff5500] font-extrabold" : "text-slate-600 font-semibold")}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* Center Elevated Floating Cart Button */}
                <div className="relative mx-1.5 flex items-center justify-center shrink-0 z-20">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate(cartCount > 0 ? '/checkout' : '/orders')}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#ff5500] to-[#ff7700] text-white flex items-center justify-center -mt-18 sm:-mt-20 border-[4px] border-white shadow-[0_16px_34px_rgba(255,85,0,0.65)] transition-all cursor-pointer hover:scale-105 active:scale-95"
                        title="View Cart"
                    >
                        <ShoppingCart size={24} className="text-white" strokeWidth={2.3} />
                    </motion.button>
                    {cartCount > 0 && (
                        <div className="absolute -top-18 -right-1 bg-red-500 text-white font-black text-[10px] w-5.5 h-5.5 rounded-full border-2 border-white flex items-center justify-center shadow-md pointer-events-none animate-in zoom-in">
                            {cartCount > 99 ? '99+' : cartCount}
                        </div>
                    )}
                </div>

                {/* Right Side Items */}
                <div className="flex items-center justify-around flex-1 min-w-0">
                    {rightNavItems.map((item) => {
                        const isActive = isRouteActive(item.path, location.pathname);

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded-full transition-all duration-300 shrink-0",
                                    isActive 
                                        ? "bg-[#fff0e6] text-[#ff5500] font-extrabold shadow-2xs" 
                                        : "text-slate-500 hover:text-slate-700 font-medium"
                                )}
                            >
                                <item.icon
                                    size={17}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={cn("transition-colors shrink-0", isActive ? "text-[#ff5500]" : "text-slate-500")}
                                />
                                <span className={cn("text-[10.5px] whitespace-nowrap leading-none", isActive ? "text-[#ff5500] font-extrabold" : "text-slate-600 font-semibold")}>
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

