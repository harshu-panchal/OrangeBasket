import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    ClipboardList,
    Box,
    Wallet,
    MoreHorizontal,
    ChevronDown,
    X
} from 'lucide-react';

import { useAuth } from '@core/context/AuthContext';

const BottomNav = ({ navItems }) => {
    const { role } = useAuth();
    const location = useLocation();

    // Define the primary bottom nav items based on user role
    const primaryItems = role === 'admin' ? [
        { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, end: true },
        { label: 'Orders', path: '/admin/orders/all', icon: ClipboardList },
        { label: 'Products', path: '/admin/products', icon: Box },
        { label: 'Wallet', path: '/admin/wallet', icon: Wallet },
    ] : [
        { label: 'Dashboard', path: '/seller', icon: LayoutDashboard, end: true },
        { label: 'Orders', path: '/seller/orders', icon: ClipboardList },
        { label: 'Products', path: '/seller/products', icon: Box },
        { label: 'Earnings', path: '/seller/earnings', icon: Wallet },
    ];

    const getBadgeCount = (label) => {
        if (!navItems || !Array.isArray(navItems)) return 0;
        let count = 0;
        for (const item of navItems) {
            if (item.label === label) count += (item.badgeCount || 0);
            if (item.children) {
                const child = item.children.find(c => c.label === label || c.label === 'New Orders' || c.label === 'All Orders');
                if (child && label === 'Orders') {
                    // For orders, find New Orders badge
                    const newOrders = item.children.find(c => c.label === 'New Orders' || c.label === 'Orders');
                    if (newOrders) count += (newOrders.badgeCount || 0);
                }
            }
        }
        return count;
    };

    return (
        <div 
            className="fixed bottom-0 left-0 right-0 bg-[#0a0c10] border-t border-white/5 z-[60] md:hidden px-2 flex items-center justify-around shadow-[0_-10px_30px_rgba(0,0,0,0.4)]"
            style={{
                height: "calc(4rem + env(safe-area-inset-bottom, 0px))",
                paddingBottom: "env(safe-area-inset-bottom, 0px)"
            }}
        >
            {primaryItems.map((item) => {
                const badgeCount = getBadgeCount(item.label);
                return (
                <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) => cn(
                        "relative flex flex-col items-center justify-center space-y-1 w-16 transition-all duration-300",
                        isActive ? "text-primary" : "text-gray-500 hover:text-gray-300"
                    )}
                >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
                    {badgeCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-[#0a0c10]">
                            {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                    )}
                </NavLink>
                );
            })}
        </div>
    );
};

export default BottomNav;
