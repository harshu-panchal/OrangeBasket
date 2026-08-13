import React, { useState, useEffect } from 'react';
import { ChevronLeft, ScrollText, Shield, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';
import axiosInstance from '@core/api/axios';

const ICONS = {
    terms: ScrollText,
    privacy: Shield,
};

const DEFAULTS = {
    terms: {
        title: 'Terms & Conditions',
        content: `<p>Welcome to our platform. By accessing or using our mobile application and services, you agree to be bound by these Terms and Conditions.</p>
        <h3>1. Acceptance of Terms</h3><p>By creating an account or using our services, you agree to comply with these terms. If you do not agree, you may not use our services.</p>
        <h3>2. Use of Service</h3><p>You must be at least 18 years old to use our services. You agree to provide accurate information during registration and to keep your account secure.</p>
        <h3>3. Orders and Payments</h3><p>All orders are subject to availability. Prices are subject to change without notice. We reserve the right to cancel orders at our discretion.</p>
        <h3>4. Intellectual Property</h3><p>All content, trademarks, and data on this app are the property of the company and are protected by law.</p>
        <h3>5. Termination</h3><p>We reserve the right to end or suspend your account at any time for violation of these terms.</p>`,
    },
    privacy: {
        title: 'Privacy Policy',
        content: `<p>We take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information.</p>
        <h3>1. Information We Collect</h3><p>We collect information you provide directly, such as your name, address, phone number, and payment details. We also collect usage data automatically.</p>
        <h3>2. How We Use Information</h3><p>We use your data to process orders, improve our services, and communicate with you about promotions and updates.</p>
        <h3>3. Data Security</h3><p>We implement industry-standard security measures to protect your data. However, no method of transmission is 100% secure.</p>
        <h3>4. Sharing of Information</h3><p>We do not sell your personal data. We may share data with service providers (e.g., delivery partners) as necessary to fulfill your orders.</p>
        <h3>5. Your Rights</h3><p>You have the right to access, correct, or delete your personal data. Contact our support team for assistance.</p>`,
    },
};

const DynamicLegalPage = ({ type = 'terms', audience = 'customer' }) => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const appName = settings?.appName || 'App';

    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPage = async () => {
            try {
                setLoading(true);
                const res = await axiosInstance.get('/legal', { params: { type, audience } });
                const data = res.data?.result || res.data?.data || {};
                if (data.exists && data.content) {
                    setPage(data);
                } else {
                    setPage(null);
                }
            } catch {
                setPage(null);
            } finally {
                setLoading(false);
            }
        };
        fetchPage();
    }, [type, audience]);

    const Icon = ICONS[type] || ScrollText;
    const defaults = DEFAULTS[type] || DEFAULTS.terms;
    const title = page?.title || defaults.title;
    const content = page?.content || defaults.content;
    const lastUpdated = page?.updatedAt
        ? new Date(page.updatedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
        : null;

    return (
        <div className="min-h-screen bg-slate-50 font-['Outfit',_sans-serif] pb-12 lg:pb-20">
            {/* Header Area */}
            <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors -ml-2 shrink-0 text-slate-600 hover:text-slate-900"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight truncate">{title}</h1>
                </div>
            </div>

            <div className="px-4 pt-8 lg:pt-12 max-w-5xl mx-auto">
                {loading ? (
                    <div className="bg-white rounded-3xl p-12 flex flex-col items-center justify-center border border-slate-200/60 shadow-xl shadow-slate-200/20 min-h-[400px]">
                        <Loader2 size={36} className="animate-spin text-orange-500 mb-4" />
                        <p className="text-slate-500 font-medium">Loading {title.toLowerCase()}...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/30 border border-slate-200/60 overflow-hidden">
                        {/* Card Header */}
                        <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 p-6 lg:p-10 border-b border-orange-100/60 flex items-start sm:items-center gap-5 sm:gap-6 flex-col sm:flex-row">
                            <div className="w-14 h-14 rounded-2xl bg-white shadow-md shadow-orange-200/50 flex items-center justify-center text-orange-600 shrink-0">
                                <Icon size={28} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                                    {title}
                                </h2>
                                {lastUpdated && (
                                    <div className="inline-flex items-center gap-1.5 mt-3 bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-500 border border-slate-200 shadow-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        Last updated: {lastUpdated}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content Body */}
                        <div className="p-6 lg:p-10">
                            <div
                                className="prose prose-slate max-w-none 
                                    prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900
                                    prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                                    prose-p:text-slate-600 prose-p:leading-relaxed prose-p:font-medium
                                    prose-a:text-orange-600 prose-a:font-bold prose-a:no-underline hover:prose-a:underline
                                    prose-li:text-slate-600 prose-li:font-medium
                                    prose-strong:font-bold prose-strong:text-slate-900
                                    break-words break-all sm:break-normal overflow-wrap-anywhere"
                                dangerouslySetInnerHTML={{ __html: content }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DynamicLegalPage;
