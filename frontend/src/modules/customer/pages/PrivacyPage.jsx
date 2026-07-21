import React from 'react';
import { ChevronLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const PrivacyPage = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const appName = settings?.appName || 'App';
    return (
        <div className="min-h-screen bg-white font-['Outfit',_sans-serif] pb-10">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 pt-4 pb-3 border-b border-slate-100 mb-4 flex items-center gap-2">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors -ml-1"
                >
                    <ChevronLeft size={22} className="text-slate-800" />
                </button>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Privacy Policy</h1>
            </div>

            <div className="px-4 pt-1 max-w-3xl mx-auto space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-indigo-50/80 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-2xs shrink-0">
                            <span className="text-xl">🛡️</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-800">Privacy Policy</h2>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">Last updated: Oct 2025</p>
                        </div>
                    </div>

                    <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-4">
                        <p>
                            At {appName}, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">1. Information We Collect</h3>
                        <p>
                            We collect information you provide directly, such as your name, address, phone number, and payment details. We also collect usage data automatically.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">2. How We Use Information</h3>
                        <p>
                            We use your data to process orders, improve our services, and communicate with you about promotions and updates.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">3. Data Security</h3>
                        <p>
                            We implement industry-standard security measures to protect your data. However, no method of transmission is 100% secure.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">4. Sharing of Information</h3>
                        <p>
                            We do not sell your personal data. We may share data with service providers (e.g., delivery partners) as necessary to fulfill your orders.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">5. Your Rights</h3>
                        <p>
                            You have the right to access, correct, or delete your personal data. Contact our support team for assistance.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPage;

