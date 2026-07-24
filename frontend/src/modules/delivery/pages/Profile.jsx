import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  Phone,
  Truck,
  CreditCard,
  ClipboardCheck,
  LifeBuoy,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Bell,
  Settings,
  Wallet,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion } from "framer-motion";
import Button from "@/shared/components/ui/Button";
import { useAuth } from "@core/context/AuthContext";
import { useSettings } from "@core/context/SettingsContext";
import axiosInstance from '@core/api/axios';
import { useEffect } from 'react';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import DeliveryFooter from "../components/DeliveryFooter";

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const [faqs, setFaqs] = useState([]);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const response = await axiosInstance.get('/public/faqs', { params: { category: 'Delivery', status: 'published' } });
        setFaqs(response.data.results || []);
      } catch (error) {
        console.error("Error fetching FAQs:", error);
      }
    };
    fetchFaqs();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <div className="bg-white min-h-screen pb-24">
      {/* Header */}
      <div className="pt-12 pb-8 px-6 relative bg-transparent">
        <h1 className="text-center text-gray-900 text-[16px] font-bold mb-8 tracking-wide">Profile</h1>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-[60px] h-[60px] rounded-full flex-shrink-0 p-0.5 border border-gray-100 bg-white overflow-hidden shadow-sm">
              <img
                src={user?.profileImage || user?.avatar || "/placeholder-avatar.png"}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div>
              <h2 className="font-bold text-[15px] text-gray-900">{user?.name || "Delivery Partner"}</h2>
              <p className="text-gray-400 text-[13px] mt-0.5 font-medium">
                Delivery Partner
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <span className="font-bold text-gray-900 text-[13px]">{user?.rating || "4.8"}</span>
            <span className="text-yellow-400 text-[14px]">★</span>
          </div>
        </div>
      </div>

      {/* Menu Options */}
      <motion.div
        className="px-6 space-y-6 max-w-lg mx-auto pb-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible">
        
        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <div className="divide-y divide-slate-100">
                <MenuItem
                    icon={User}
                    label="Personal Details"
                    sub="Name, Address, Email"
                    path="/delivery/profile/personal-details"
                    badgeBg="bg-blue-50/80 border-blue-100/70 text-blue-700"
                />
                <MenuItem
                    icon={ClipboardCheck}
                    label="Document Verification"
                    sub="View and update your documents"
                    path="/delivery/profile/documents"
                    badgeBg="bg-purple-50/80 border-purple-100/70 text-purple-700"
                />
                <MenuItem
                    icon={Truck}
                    label="Vehicle Information"
                    sub="Bike, License, Insurance"
                    path="/delivery/profile/vehicle-info"
                    badgeBg="bg-orange-50/80 border-orange-100/70 text-orange-700"
                />
                <MenuItem
                    icon={CreditCard}
                    label="Bank Account"
                    sub="Manage your linked bank account"
                    path="/delivery/profile/bank-account"
                    badgeBg="bg-amber-50/80 border-amber-100/70 text-amber-700"
                />
                <MenuItem
                    icon={Wallet}
                    label="Money Request"
                    sub="Withdraw your earnings"
                    path="/delivery/profile/withdrawals"
                    badgeBg="bg-teal-50/80 border-teal-100/70 text-teal-700"
                />
                <MenuItem
                    icon={ShieldCheck}
                    label="Safety & Privacy"
                    sub="Emergency contacts, App permissions"
                    path="/delivery/profile/safety-privacy"
                    badgeBg="bg-red-50/80 border-red-100/70 text-red-700"
                />
                <MenuItem
                    icon={Settings}
                    label="Settings"
                    sub="Notifications, Language, Theme"
                    path="/delivery/profile/settings"
                    badgeBg="bg-gray-50/80 border-gray-100/70 text-gray-700"
                />
                <MenuItem
                    icon={LifeBuoy}
                    label="Help & Support"
                    sub="FAQs, Chat support"
                    path="/delivery/profile/help-support"
                    badgeBg="bg-emerald-50/80 border-emerald-100/70 text-emerald-700"
                />
            </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-hidden">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">Delivery Partner FAQs</p>
          <div className="divide-y divide-gray-50">
            {faqs.length > 0 ? (
              faqs.map((faq) => (
                <DeliveryFAQItem
                  key={faq._id}
                  question={faq.question}
                  answer={faq.answer}
                />
              ))
            ) : (
              <div className="py-4 text-center text-xs text-gray-400">No FAQs available</div>
            )}
          </div>
        </div>

        <motion.div variants={itemVariants} className="pt-2 pb-6">
          <Button
            onClick={logout}
            variant="ghost"
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50/50 font-medium py-3 px-4">
            <LogOut size={20} className="mr-4 text-red-500" strokeWidth={2} /> Logout
          </Button>
        </motion.div>
      </motion.div>
      <DeliveryFooter />
    </div>
  );
};

const DeliveryFAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="py-4 px-2 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setIsOpen(!isOpen)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">{question}</h3>
        {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </div>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-2 text-xs text-gray-500 font-medium leading-relaxed"
        >
          {answer}
        </motion.div>
      )}
    </div>
  );
};

const MenuItem = ({ icon: Icon, label, sub, path, onClick = undefined, badgeBg }) => {
    const Component = onClick ? 'button' : Link;
    return (
        <Component to={path || undefined} onClick={onClick} className="w-full text-left px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 cursor-pointer transition-colors group">
            <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-full border flex items-center justify-center shadow-2xs group-hover:scale-108 transition-transform flex-shrink-0", badgeBg || "bg-slate-50 border-slate-100 text-slate-600")}>
                    <Icon size={18} strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800 leading-tight">{label}</h3>
                    {sub && <p className="text-[11px] font-medium text-slate-500 mt-0.5">{sub}</p>}
                </div>
            </div>
            <div className="p-1.5 rounded-full group-hover:bg-slate-100 transition-colors">
                <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600 transition-all group-hover:translate-x-0.5" />
            </div>
        </Component>
    );
};

export default Profile;
