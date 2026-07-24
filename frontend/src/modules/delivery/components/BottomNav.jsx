import React from "react";
import { NavLink } from "react-router-dom";
import { Home, ClipboardList, CircleDollarSign, Inbox, User } from "lucide-react";
import { motion } from "framer-motion";

const BottomNav = () => {
  const navItems = [
    { path: "/delivery/dashboard", label: "Home", icon: Home, hasNotification: false },
    { path: "/delivery/history", label: "Orders", icon: ClipboardList, hasNotification: true },
    { path: "/delivery/earnings", label: "Earnings", icon: CircleDollarSign, hasNotification: false },
    { path: "/delivery/profile", label: "Profile", icon: User, hasNotification: false },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-3 px-4 flex justify-between items-center z-40 max-w-md mx-auto">
      {navItems.map(({ path, label, icon: Icon, hasNotification }) => (
        <NavLink
          key={label}
          to={path}
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center space-y-1 w-full h-10 transition-colors duration-200 ${
              isActive ? "text-[#ff8200]" : "text-gray-500 hover:text-gray-700"
            }`
          }>
          {({ isActive }) => (
            <>
              <motion.div
                className="relative"
                animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Icon 
                  size={24} 
                  strokeWidth={isActive ? 2.5 : 2} 
                  fill={isActive ? "currentColor" : "none"} 
                />
                {hasNotification && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#ff5722] rounded-full border-2 border-white shadow-sm" />
                )}
              </motion.div>
              <span
                className={`text-[10px] font-bold ${isActive ? "opacity-100 text-[#ff8200]" : "opacity-80"}`}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
};

export default BottomNav;
