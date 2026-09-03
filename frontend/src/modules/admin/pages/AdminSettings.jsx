import React, { useEffect, useRef, useState } from 'react';
import Card from '@shared/components/ui/Card';
import {
    Save,
    Settings,
    Globe,
    Building2,
    Share2,
    Smartphone,
    Search,
    Upload,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    Facebook,
    Twitter,
    Instagram,
    Linkedin,
    Youtube,
    Loader2,
    X,
    CloudRain,
    Sun,
    Snowflake,
    Cloud,
    CloudLightning,
    Wind,
    Smile
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@shared/components/ui/Toast';
import { adminApi } from '../services/adminApi';
import { useSettings } from '@core/context/SettingsContext';

import { EMOJIS } from '@shared/utils/emojis';

const AdminSettings = () => {
    const normalizeProductApprovalConfig = (raw) => {
        const config = raw?.productApproval || raw || {};
        return {
            sellerCreateRequiresApproval: Boolean(config.sellerCreateRequiresApproval),
            sellerEditRequiresApproval: Boolean(config.sellerEditRequiresApproval),
        };
    };

    const { refetch } = useSettings();
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');
    const [logoUploading, setLogoUploading] = useState(false);
    const [faviconUploading, setFaviconUploading] = useState(false);
    const logoInputRef = useRef(null);
    const faviconInputRef = useRef(null);

    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
    const [emojiPickerPos, setEmojiPickerPos] = useState({ top: 0, left: 0 });
    const emojiBtnRef = useRef(null);
    const emojiPopoverRef = useRef(null);
    const emojiInputRef = useRef(null);

    /** @type {any} */
    const defaultSettings = {
        appName: '',
        supportEmail: '',
        supportPhone: '',
        currencySymbol: '₹',
        currencyCode: 'INR',
        timezone: 'Asia/Kolkata',
        logoUrl: '',
        faviconUrl: '',
        primaryColor: 'var(--primary)',
        secondaryColor: '#64748b',
        companyName: '',
        taxId: '',
        address: '',
        facebook: '',
        twitter: '',
        instagram: '',
        linkedin: '',
        youtube: '',
        playStoreLink: '',
        appStoreLink: '',
        metaTitle: '',
        metaDescription: '',
        metaKeywords: '',
        keywords: [],
        footerMessage: 'Sab kuchh ek basket mein',
        footerEmoji: '❤️',
        returnDeliveryCommission: 0,
        lowStockAlertsEnabled: true,
        productApproval: {
            sellerCreateRequiresApproval: false,
            sellerEditRequiresApproval: false,
        },
        categoriesBanner: {
            image: '',
            badgeText: 'KIRANA STORE',
            title: 'Everything you need, in one place',
            buttonText: 'Shop Now',
            buttonLink: '/',
            isVisible: true,
        },
        homeVideoBanner: {
            videoUrl: '',
            isVisible: false,
        },
        weather: {
            isEnabled: true,
            condition: 'Rain',
            icon: 'CloudRain',
        },
    };
    const [settings, setSettings] = useState(defaultSettings);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await adminApi.getSettings();
                const data = res.data?.result ?? res.data;
                if (data) {
                    setSettings(prev => ({
                        ...prev,
                        ...data,
                        productApproval: normalizeProductApprovalConfig(data || {}),
                        keywords: Array.isArray(data.keywords) ? data.keywords : (data.metaKeywords ? data.metaKeywords.split(',').map(k => k.trim()).filter(Boolean) : []),
                        returnDeliveryCommission: data.returnDeliveryCommission ?? 0,
                        categoriesBanner: {
                            ...prev.categoriesBanner,
                            ...(data.categoriesBanner || {}),
                        },
                        homeVideoBanner: {
                            ...prev.homeVideoBanner,
                            ...(data.homeVideoBanner || {}),
                        },
                        weather: {
                            ...prev.weather,
                            ...(data.weather || {}),
                        },
                    }));
                }
            } catch (error) {
                console.error("Failed to load settings", error);
                showToast('Failed to load settings', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, [showToast]);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const payload = {
                ...settings,
                keywords: Array.isArray(settings.keywords) ? settings.keywords : (settings.metaKeywords ? settings.metaKeywords.split(',').map(k => k.trim()).filter(Boolean) : []),
            };
            const res = await adminApi.updateSettings(payload);
            const updatedData = res.data?.result ?? res.data;
            
            if (updatedData) {
                setSettings(prev => ({
                    ...prev,
                    ...updatedData,
                    productApproval: normalizeProductApprovalConfig(updatedData),
                }));
            }
            await refetch({ forceRefresh: true });
            showToast('Settings updated successfully', 'success');
        } catch (error) {
            console.error("Failed to update settings", error);
            showToast('Failed to update settings', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleProductApprovalToggle = (field) => {
        setSettings((prev) => ({
            ...prev,
            productApproval: {
                ...(prev.productApproval || {}),
                [field]: !Boolean(prev.productApproval?.[field]),
            },
        }));
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file (PNG, JPG, etc.)', 'error');
            return;
        }
        setLogoUploading(true);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await adminApi.uploadSettingsImage(fd, 'logo');
            const url = res.data?.result?.url || res.data?.url;
            if (url) {
                handleInputChange('logoUrl', url);
                showToast('Logo uploaded. Click Save Changes to apply.', 'success');
            } else throw new Error('No URL returned');
        } catch (err) {
            console.error(err);
            showToast(err.response?.data?.message || 'Failed to upload logo', 'error');
        } finally {
            setLogoUploading(false);
            e.target.value = '';
        }
    };

    const handleFaviconUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file (PNG, ICO, etc.)', 'error');
            return;
        }
        setFaviconUploading(true);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await adminApi.uploadSettingsImage(fd, 'favicon');
            const url = res.data?.result?.url || res.data?.url;
            if (url) {
                handleInputChange('faviconUrl', url);
                showToast('Favicon uploaded. Click Save Changes to apply.', 'success');
            } else throw new Error('No URL returned');
        } catch (err) {
            console.error(err);
            showToast(err.response?.data?.message || 'Failed to upload favicon', 'error');
        } finally {
            setFaviconUploading(false);
            e.target.value = '';
        }
    };

    const [bannerUploadingIndex, setBannerUploadingIndex] = useState(null);
    const bannerInputRef = useRef(null);
    const currentUploadIndexRef = useRef(null);

    const handleBannerChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            categoriesBanner: {
                ...(prev.categoriesBanner || {}),
                [field]: value
            }
        }));
    };

    const handleBannerItemChange = (index, field, value) => {
        setSettings(prev => {
            const currentBanners = prev.categoriesBanner?.banners || [];
            const newBanners = [...currentBanners];
            newBanners[index] = { ...newBanners[index], [field]: value };
            return {
                ...prev,
                categoriesBanner: {
                    ...(prev.categoriesBanner || {}),
                    banners: newBanners
                }
            };
        });
    };

    const addBanner = () => {
        setSettings(prev => {
            const currentBanners = prev.categoriesBanner?.banners || [];
            return {
                ...prev,
                categoriesBanner: {
                    ...(prev.categoriesBanner || {}),
                    banners: [
                        ...currentBanners,
                        { image: '', badgeText: 'KIRANA STORE', title: '', buttonText: 'Shop Now', buttonLink: '/' }
                    ]
                }
            };
        });
    };

    const removeBanner = (index) => {
        setSettings(prev => {
            const currentBanners = prev.categoriesBanner?.banners || [];
            const newBanners = currentBanners.filter((_, i) => i !== index);
            return {
                ...prev,
                categoriesBanner: {
                    ...(prev.categoriesBanner || {}),
                    banners: newBanners
                }
            };
        });
    };

    const triggerBannerUpload = (index) => {
        currentUploadIndexRef.current = index;
        bannerInputRef.current?.click();
    };

    const handleBannerUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file (PNG, JPG, etc.)', 'error');
            return;
        }
        const index = currentUploadIndexRef.current;
        if (index === null || index === undefined) return;

        setBannerUploadingIndex(index);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await adminApi.uploadSettingsImage(fd, 'categoriesBanner');
            const url = res.data?.result?.url || res.data?.url;
            if (url) {
                handleBannerItemChange(index, 'image', url);
                showToast('Banner image uploaded. Click Save Changes to apply.', 'success');
            } else throw new Error('No URL returned');
        } catch (err) {
            console.error(err);
            showToast(err.response?.data?.message || 'Failed to upload banner image', 'error');
        } finally {
            setBannerUploadingIndex(null);
            currentUploadIndexRef.current = null;
            e.target.value = '';
        }
    };

    const [videoBannerUploading, setVideoBannerUploading] = useState(false);
    const videoBannerInputRef = useRef(null);

    const handleVideoBannerChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            homeVideoBanner: {
                ...(prev.homeVideoBanner || {}),
                [field]: value
            }
        }));
    };

    const handleVideoBannerUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('video/')) {
            showToast('Please select a video file (MP4, WebM, etc.)', 'error');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast('Video size exceeds 10 MB limit', 'error');
            return;
        }
        setVideoBannerUploading(true);
        try {
            const fd = new FormData();
            fd.append('image', file); // Multer uses 'image' or 'file' in settings API
            const res = await adminApi.uploadSettingsImage(fd, 'homeVideoBanner');
            const url = res.data?.result?.url || res.data?.url;
            if (url) {
                handleVideoBannerChange('videoUrl', url);
                showToast('Video banner uploaded. Click Save Changes to apply.', 'success');
            } else throw new Error('No URL returned');
        } catch (err) {
            console.error(err);
            showToast(err.response?.data?.message || 'Failed to upload video', 'error');
        } finally {
            setVideoBannerUploading(false);
            e.target.value = '';
        }
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'branding', label: 'Branding', icon: Globe },
        { id: 'legal', label: 'Legal & Contact', icon: Building2 },
        { id: 'social', label: 'Social & Apps', icon: Share2 },
        { id: 'seo', label: 'SEO & Meta', icon: Search },
        { id: 'categoriesBanner', label: 'Categories Banner', icon: Smartphone },
        { id: 'homeVideoBanner', label: 'Video Banner', icon: Youtube },
        { id: 'weather', label: 'Weather Widget', icon: CloudRain },
    ];

    const handleWeatherChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            weather: {
                ...(prev.weather || {}),
                [field]: value
            }
        }));
    };

    const closeEmojiPicker = () => setEmojiPickerOpen(false);

    const openEmojiPicker = () => {
        if (emojiPickerOpen) {
            closeEmojiPicker();
            return;
        }
        setEmojiPickerOpen(true);

        const btn = emojiBtnRef.current;
        if (!btn || typeof btn.getBoundingClientRect !== 'function' || typeof window === 'undefined') return;

        const rect = btn.getBoundingClientRect();
        const popoverWidth = 280;
        const padding = 12;
        const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
        const left = clamp(rect.right - popoverWidth, padding, window.innerWidth - popoverWidth - padding);
        const top = rect.bottom + 10;
        setEmojiPickerPos({ top, left });
    };

    useEffect(() => {
        if (!emojiPickerOpen) return;

        const onKeyDown = (e) => {
            if (e.key === 'Escape') closeEmojiPicker();
        };

        const onPointerDown = (e) => {
            const target = e.target;
            if (!target) return;
            if (emojiPopoverRef.current?.contains(target)) return;
            if (emojiBtnRef.current?.contains(target)) return;
            closeEmojiPicker();
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('pointerdown', onPointerDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('pointerdown', onPointerDown);
        };
    }, [emojiPickerOpen]);

    const insertEmoji = (emoji) => {
        const nextEmoji = String(emoji || '');
        if (!nextEmoji) return;

        const el = emojiInputRef.current;
        const value = settings.footerEmoji || '';
        
        const start = typeof el?.selectionStart === 'number' ? el.selectionStart : value.length;
        const end = typeof el?.selectionEnd === 'number' ? el.selectionEnd : value.length;
        const next = `${value.slice(0, start)}${nextEmoji}${value.slice(end)}`;

        handleInputChange('footerEmoji', next);

        requestAnimationFrame(() => {
            try {
                el?.focus?.();
                const caret = start + nextEmoji.length;
                el?.setSelectionRange?.(caret, caret);
            } catch {
                // ignore
            }
        });
    };

    return (
        <div className="ds-section-spacing animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1">
                <div>
                    <h1 className="ds-h1 flex items-center gap-3">
                        Platform Settings
                        <div className="p-2 bg-slate-100 rounded-xl">
                            <Settings className="h-5 w-5 text-slate-600" />
                        </div>
                    </h1>
                    <p className="ds-description mt-1">Manage global configurations, branding, and legal information.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={cn(
                            "flex items-center gap-2 px-8 py-4 bg-black text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-brand-200 hover:shadow-brand-300 active:scale-95 active:shadow-inner",
                            isSaving ? "opacity-70 cursor-wait" : "hover:bg-brand-700"
                        )}
                    >
                        {isSaving ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Save className="h-5 w-5" />
                        )}
                        {isSaving ? 'Updating...' : 'Save All Changes'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-3 space-y-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                                activeTab === tab.id
                                    ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200 shadow-sm"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                            )}
                        >
                            <tab.icon className={cn("h-4 w-4", activeTab === tab.id ? "text-brand-600" : "text-slate-400")} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="lg:col-span-9 space-y-6">

                    {isLoading && (
                        <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl overflow-hidden">
                            <div className="p-8 flex items-center justify-center">
                                <div className="h-8 w-8 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                            </div>
                        </Card>
                    )}

                    {/* General Settings */}
                    {activeTab === 'general' && (
                        <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl overflow-hidden">
                            <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                    General Information
                                </h3>
                            </div>
                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">App Name</label>
                                    <input
                                        type="text"
                                        value={settings.appName}
                                        onChange={(e) => handleInputChange('appName', e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Support Email</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            type="email"
                                            value={settings.supportEmail}
                                            onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Support Phone</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={settings.supportPhone}
                                            onChange={(e) => handleInputChange('supportPhone', e.target.value)}
                                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Currency Symbol</label>
                                    <input
                                        type="text"
                                        value={settings.currencySymbol}
                                        onChange={(e) => handleInputChange('currencySymbol', e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                    />
                                </div>
                                <div className="md:col-span-2 rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-black text-slate-900">Auto Low Stock Alerts</p>
                                        <p className="text-xs font-bold text-slate-500 mt-1">
                                            Automatically notify sellers when any product stock drops to its low-stock threshold.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={settings.lowStockAlertsEnabled}
                                        onClick={() => handleInputChange('lowStockAlertsEnabled', !settings.lowStockAlertsEnabled)}
                                        className={cn(
                                            "relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200",
                                            settings.lowStockAlertsEnabled ? "bg-emerald-500" : "bg-slate-300"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform duration-200",
                                                settings.lowStockAlertsEnabled ? "translate-x-7" : "translate-x-1"
                                            )}
                                        />
                                    </button>
                                </div>
                                <div className="md:col-span-2 rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-black text-slate-900">Require approval for new seller products</p>
                                        <p className="text-xs font-bold text-slate-500 mt-1">
                                            When enabled, newly added seller products remain hidden until approved by admin.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={Boolean(settings.productApproval?.sellerCreateRequiresApproval)}
                                        onClick={() => handleProductApprovalToggle('sellerCreateRequiresApproval')}
                                        className={cn(
                                            "relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200",
                                            settings.productApproval?.sellerCreateRequiresApproval ? "bg-emerald-500" : "bg-slate-300"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform duration-200",
                                                settings.productApproval?.sellerCreateRequiresApproval ? "translate-x-7" : "translate-x-1"
                                            )}
                                        />
                                    </button>
                                </div>
                                <div className="md:col-span-2 rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-black text-slate-900">Require approval for seller product edits</p>
                                        <p className="text-xs font-bold text-slate-500 mt-1">
                                            When enabled, seller changes to existing products remain hidden until approved by admin.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={Boolean(settings.productApproval?.sellerEditRequiresApproval)}
                                        onClick={() => handleProductApprovalToggle('sellerEditRequiresApproval')}
                                        className={cn(
                                            "relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200",
                                            settings.productApproval?.sellerEditRequiresApproval ? "bg-emerald-500" : "bg-slate-300"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform duration-200",
                                                settings.productApproval?.sellerEditRequiresApproval ? "translate-x-7" : "translate-x-1"
                                            )}
                                        />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Branding Settings */}
                    {activeTab === 'branding' && (
                        <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl overflow-hidden">
                            <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                    Visual Identity
                                </h3>
                            </div>
                            <div className="p-8 space-y-8">
                                <input type="file" ref={logoInputRef} accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                <input type="file" ref={faviconInputRef} accept="image/*" className="hidden" onChange={handleFaviconUpload} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">App Logo <span className="font-semibold text-slate-400 normal-case tracking-normal">(Recommended: 512 × 512 px)</span></label>
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => !logoUploading && logoInputRef.current?.click()}
                                            onKeyDown={(e) => e.key === 'Enter' && !logoUploading && logoInputRef.current?.click()}
                                            className={cn(
                                                "h-40 w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all group overflow-hidden",
                                                settings.logoUrl ? "border-slate-200 bg-slate-50/50" : "border-slate-200 hover:border-brand-500/50 hover:bg-brand-50/10 cursor-pointer"
                                            )}
                                        >
                                            {logoUploading ? (
                                                <Loader2 className="h-10 w-10 text-brand-600 animate-spin" />
                                            ) : settings.logoUrl ? (
                                                <>
                                                    <img src={settings.logoUrl} alt="App logo" className="max-h-24 w-auto object-contain" />
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-500">Click to replace</span>
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleInputChange('logoUrl', ''); }} className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600" title="Remove logo"><X className="h-4 w-4" /></button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <Upload className="h-5 w-5 text-slate-400 group-hover:text-brand-600" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-400 group-hover:text-brand-600">Click to upload logo</span>
                                                </>
                                            )}
                                        </div>
                                        <input type="url" value={settings.logoUrl} onChange={(e) => handleInputChange('logoUrl', e.target.value)} placeholder="Or paste logo URL" className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Favicon <span className="font-semibold text-slate-400 normal-case tracking-normal">(Recommended: 192 × 192 px)</span></label>
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => !faviconUploading && faviconInputRef.current?.click()}
                                            onKeyDown={(e) => e.key === 'Enter' && !faviconUploading && faviconInputRef.current?.click()}
                                            className={cn(
                                                "h-40 w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all group overflow-hidden",
                                                settings.faviconUrl ? "border-slate-200 bg-slate-50/50" : "border-slate-200 hover:border-brand-500/50 hover:bg-brand-50/10 cursor-pointer"
                                            )}
                                        >
                                            {faviconUploading ? (
                                                <Loader2 className="h-10 w-10 text-brand-600 animate-spin" />
                                            ) : settings.faviconUrl ? (
                                                <>
                                                    <img src={settings.faviconUrl} alt="Favicon" className="max-h-16 w-auto object-contain" />
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-500">Click to replace</span>
                                                        <button type="button" onClick={(e) => { e.stopPropagation(); handleInputChange('faviconUrl', ''); }} className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600" title="Remove favicon"><X className="h-4 w-4" /></button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <Upload className="h-5 w-5 text-slate-400 group-hover:text-brand-600" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-400 group-hover:text-brand-600">Click to upload favicon</span>
                                                </>
                                            )}
                                        </div>
                                        <input type="url" value={settings.faviconUrl} onChange={(e) => handleInputChange('faviconUrl', e.target.value)} placeholder="Or paste favicon URL" className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Brand Color</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="color"
                                            value={settings.primaryColor}
                                            onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                                            className="h-12 w-24 rounded-lg cursor-pointer bg-transparent"
                                        />
                                        <input
                                            type="text"
                                            value={settings.primaryColor}
                                            onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                                            className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secondary Brand Color</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="color"
                                            value={settings.secondaryColor}
                                            onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                                            className="h-12 w-24 rounded-lg cursor-pointer bg-transparent"
                                        />
                                        <input
                                            type="text"
                                            value={settings.secondaryColor}
                                            onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                                            className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Footer Message</label>
                                    <input
                                        type="text"
                                        value={settings.footerMessage ?? 'Sab kuchh ek basket mein'}
                                        onChange={(e) => handleInputChange('footerMessage', e.target.value)}
                                        className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                        placeholder="Sab kuchh ek basket mein"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Footer Emoji</label>
                                        <button
                                            ref={emojiBtnRef}
                                            type="button"
                                            onClick={openEmojiPicker}
                                            className={cn(
                                                "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all ring-1",
                                                emojiPickerOpen
                                                    ? "bg-brand-50 text-brand-600 ring-brand-200"
                                                    : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100 hover:text-slate-700"
                                            )}
                                            aria-label="Add emoji"
                                            title="Add emoji"
                                        >
                                            <Smile className="h-4 w-4" />
                                            Emoji
                                        </button>
                                    </div>
                                    <input
                                        ref={emojiInputRef}
                                        type="text"
                                        value={settings.footerEmoji ?? '❤️'}
                                        onChange={(e) => handleInputChange('footerEmoji', e.target.value)}
                                        className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                        placeholder="❤️"
                                        maxLength={10}
                                    />
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Legal Settings */}
                    {activeTab === 'legal' && (
                        <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl overflow-hidden">
                            <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                    Legal Entity & Contact
                                </h3>
                            </div>
                            <div className="p-8 grid grid-cols-1 gap-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Legal Name</label>
                                        <input
                                            type="text"
                                            value={settings.companyName}
                                            onChange={(e) => handleInputChange('companyName', e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax ID / GSTIN / VAT</label>
                                        <div className="relative group">
                                            <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={settings.taxId}
                                                onChange={(e) => handleInputChange('taxId', e.target.value)}
                                                className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registered Office Address</label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-5 top-6 h-4 w-4 text-slate-400" />
                                        <textarea
                                            rows={3}
                                            value={settings.address}
                                            onChange={(e) => handleInputChange('address', e.target.value)}
                                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Return delivery commission input moved to Fees & Charges → Delivery Fee Settings */}
                            </div>
                        </Card>
                    )}

                    {/* Social & Apps */}
                    {activeTab === 'social' && (
                        <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl overflow-hidden">
                            <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                    Social Media & App Links
                                </h3>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facebook URL</label>
                                        <div className="relative group">
                                            <Facebook className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-600" />
                                            <input
                                                type="url"
                                                value={settings.facebook}
                                                onChange={(e) => handleInputChange('facebook', e.target.value)}
                                                className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Twitter / X URL</label>
                                        <div className="relative group">
                                            <Twitter className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-500" />
                                            <input
                                                type="url"
                                                value={settings.twitter}
                                                onChange={(e) => handleInputChange('twitter', e.target.value)}
                                                className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instagram URL</label>
                                        <div className="relative group">
                                            <Instagram className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-600" />
                                            <input
                                                type="url"
                                                value={settings.instagram}
                                                onChange={(e) => handleInputChange('instagram', e.target.value)}
                                                className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">YouTube URL</label>
                                        <div className="relative group">
                                            <Youtube className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-red-600" />
                                            <input
                                                type="url"
                                                value={settings.youtube}
                                                onChange={(e) => handleInputChange('youtube', e.target.value)}
                                                className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Play Store Link (Android)</label>
                                        <div className="relative group">
                                            <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-600" />
                                            <input
                                                type="url"
                                                value={settings.playStoreLink}
                                                onChange={(e) => handleInputChange('playStoreLink', e.target.value)}
                                                className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">App Store Link (iOS)</label>
                                        <div className="relative group">
                                            <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-800" />
                                            <input
                                                type="url"
                                                value={settings.appStoreLink}
                                                onChange={(e) => handleInputChange('appStoreLink', e.target.value)}
                                                className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* SEO Settings */}
                    {activeTab === 'seo' && (
                        <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl overflow-hidden">
                            <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                    SEO & Meta Information
                                </h3>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Default Meta Title</label>
                                    <input
                                        type="text"
                                        value={settings.metaTitle}
                                        onChange={(e) => handleInputChange('metaTitle', e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Default Meta Description</label>
                                    <textarea
                                        rows={3}
                                        value={settings.metaDescription}
                                        onChange={(e) => handleInputChange('metaDescription', e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
                                    />
                                    <p className="text-[10px] font-bold text-slate-400 italic text-right">Recommended length: 150-160 characters</p>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta Keywords</label>
                                    <input
                                        type="text"
                                        value={settings.metaKeywords}
                                        onChange={(e) => handleInputChange('metaKeywords', e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                        placeholder="keyword1, keyword2, keyword3"
                                    />
                                    <p className="text-[10px] font-bold text-slate-400 italic text-right">Separate keywords with commas</p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Categories Banner Settings */}
                    {activeTab === 'categoriesBanner' && (
                        <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl overflow-hidden animate-in fade-in duration-300">
                            <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                        Categories Promotional Banner
                                    </h3>
                                    <p className="text-xs text-slate-400 font-semibold mt-1">Upload and toggle the promotional banner visible to customers in mobile view.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500">Visible to Users</span>
                                    <button
                                        type="button"
                                        onClick={() => handleBannerChange('isVisible', !settings.categoriesBanner?.isVisible)}
                                        className={cn(
                                            "w-12 h-6 rounded-full transition-all relative flex items-center p-0.5",
                                            settings.categoriesBanner?.isVisible ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"
                                        )}
                                    >
                                        <div className="w-5 h-5 bg-white rounded-full shadow-md" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-8 space-y-6">
                                {/* Hidden Input for uploads */}
                                <input
                                    type="file"
                                    ref={bannerInputRef}
                                    onChange={handleBannerUpload}
                                    className="hidden"
                                    accept="image/*"
                                />

                                {(settings.categoriesBanner?.banners || []).map((banner, index) => (
                                    <div key={index} className="p-4 border border-slate-200 rounded-2xl relative bg-slate-50/50">
                                        <button 
                                            onClick={() => removeBanner(index)}
                                            className="absolute -top-3 -right-3 h-8 w-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 shadow-sm transition-colors z-10"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Banner Image {index + 1} <span className="font-semibold text-slate-400 normal-case tracking-normal">(Recommended: 600 × 250 px)</span></label>
                                                <div
                                                    onClick={() => triggerBannerUpload(index)}
                                                    className={cn(
                                                        "border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-brand-500 hover:bg-slate-50/50 transition-all relative flex flex-col items-center justify-center min-h-[150px]",
                                                        bannerUploadingIndex === index && "pointer-events-none opacity-60"
                                                    )}
                                                >
                                                    {bannerUploadingIndex === index ? (
                                                        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                                                    ) : banner.image ? (
                                                        <div className="relative w-full h-[120px] rounded-lg overflow-hidden bg-slate-100">
                                                            <img
                                                                src={banner.image}
                                                                alt={`Banner ${index + 1}`}
                                                                className="w-full h-full object-contain"
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                                                                Change Image
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <Upload className="h-6 w-6 text-slate-400 mx-auto" />
                                                            <p className="text-xs font-bold text-slate-500">Upload Banner</p>
                                                            <p className="text-[10px] text-slate-400 font-semibold uppercase">600 x 250 px</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-4 pt-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Link URL</label>
                                                    <input 
                                                        type="text" 
                                                        value={banner.buttonLink} 
                                                        onChange={(e) => handleBannerItemChange(index, 'buttonLink', e.target.value)}
                                                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
                                                        placeholder="/category/some-id or /"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button 
                                    onClick={addBanner}
                                    className="w-full py-4 border-2 border-dashed border-brand-200 rounded-2xl flex items-center justify-center gap-2 text-brand-600 font-bold hover:bg-brand-50 transition-colors"
                                >
                                    <Upload className="h-5 w-5" />
                                    Add New Banner
                                </button>
                            </div>
                        </Card>
                    )}

                    {/* Home Video Banner Settings */}
                    {activeTab === 'homeVideoBanner' && (
                        <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl overflow-hidden animate-in fade-in duration-300">
                            <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                        Home Video Banner
                                    </h3>
                                    <p className="text-xs text-slate-400 font-semibold mt-1">Upload and toggle a video banner on the home page. Max size 10MB.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500">Visible to Users</span>
                                    <button
                                        type="button"
                                        onClick={() => handleVideoBannerChange('isVisible', !settings.homeVideoBanner?.isVisible)}
                                        className={cn(
                                            "w-12 h-6 rounded-full transition-all relative flex items-center p-0.5",
                                            settings.homeVideoBanner?.isVisible ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"
                                        )}
                                    >
                                        <div className="w-5 h-5 bg-white rounded-full shadow-md" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="max-w-md mx-auto space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Video File</label>
                                    <input
                                        type="file"
                                        ref={videoBannerInputRef}
                                        onChange={handleVideoBannerUpload}
                                        className="hidden"
                                        accept="video/mp4,video/webm"
                                    />
                                    <div
                                        onClick={() => videoBannerInputRef.current?.click()}
                                        className={cn(
                                            "border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center cursor-pointer hover:border-brand-500 hover:bg-slate-50/50 transition-all relative flex flex-col items-center justify-center min-h-[200px]",
                                            videoBannerUploading && "pointer-events-none opacity-60"
                                        )}
                                    >
                                        {videoBannerUploading ? (
                                            <div className="space-y-3">
                                                <Loader2 className="h-8 w-8 animate-spin text-brand-500 mx-auto" />
                                                <p className="text-xs font-bold text-slate-500">Uploading Video...</p>
                                            </div>
                                        ) : settings.homeVideoBanner?.videoUrl ? (
                                            <div className="relative w-full rounded-xl overflow-hidden bg-slate-100 group">
                                                <video
                                                    src={settings.homeVideoBanner.videoUrl}
                                                    className="w-full h-auto object-cover max-h-[300px]"
                                                    muted
                                                    loop
                                                    autoPlay
                                                    playsInline
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                                                    Change Video
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                                                <p className="text-xs font-bold text-slate-500">Upload Video</p>
                                                <p className="text-[10px] text-slate-400 font-semibold uppercase">Max size: 10 MB (MP4, WebM) <span className="normal-case">| Recommended: 1920×1080 px (16:9)</span></p>
                                            </div>
                                        )}
                                    </div>
                                    {settings.homeVideoBanner?.videoUrl && (
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase text-center">
                                            Video successfully uploaded
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Weather Widget Settings */}
                    {activeTab === 'weather' && (
                        <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl overflow-hidden animate-in fade-in duration-300">
                            <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                        Weather Widget
                                    </h3>
                                    <p className="text-xs text-slate-400 font-semibold mt-1">Configure the weather widget shown in the home page header.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500">Enable Widget</span>
                                    <button
                                        type="button"
                                        onClick={() => handleWeatherChange('isEnabled', !settings.weather?.isEnabled)}
                                        className={cn(
                                            "w-12 h-6 rounded-full transition-all relative flex items-center p-0.5",
                                            settings.weather?.isEnabled ? "bg-emerald-500 justify-end" : "bg-slate-300 justify-start"
                                        )}
                                    >
                                        <div className="w-5 h-5 bg-white rounded-full shadow-md" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="max-w-md mx-auto space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weather Condition Text</label>
                                        <input
                                            type="text"
                                            value={settings.weather?.condition || ''}
                                            onChange={(e) => handleWeatherChange('condition', e.target.value)}
                                            placeholder="e.g. Rain, Summer, Winter"
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weather Icon</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { id: 'CloudRain', icon: CloudRain, label: 'Rain' },
                                                { id: 'Sun', icon: Sun, label: 'Sun' },
                                                { id: 'Snowflake', icon: Snowflake, label: 'Snow' },
                                                { id: 'Cloud', icon: Cloud, label: 'Cloud' },
                                                { id: 'CloudLightning', icon: CloudLightning, label: 'Lightning' },
                                                { id: 'Wind', icon: Wind, label: 'Wind' },
                                            ].map(item => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleWeatherChange('icon', item.id)}
                                                    className={cn(
                                                        "cursor-pointer flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                                                        settings.weather?.icon === item.id 
                                                            ? "border-brand-500 bg-brand-50 text-brand-700"
                                                            : "border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <item.icon className="h-6 w-6 mb-2" />
                                                    <span className="text-[10px] font-bold uppercase">{item.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}
                    {emojiPickerOpen && (
                        <div
                            ref={emojiPopoverRef}
                            className="fixed z-[999999] w-[280px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-3"
                            style={{ top: emojiPickerPos.top, left: emojiPickerPos.left }}
                            role="dialog"
                            aria-label="Emoji picker"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Add Emoji
                                </p>
                                <button
                                    type="button"
                                    onClick={closeEmojiPicker}
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900"
                                >
                                    Close
                                </button>
                            </div>
                            <div className="grid grid-cols-10 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                                {EMOJIS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => insertEmoji(emoji)}
                                        className="h-8 w-8 rounded-xl hover:bg-slate-50 transition-colors text-lg flex items-center justify-center"
                                        aria-label={`Insert ${emoji}`}
                                        title={`Insert ${emoji}`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-2 text-[10px] font-bold text-slate-400">
                                Tip: click inside the text field, then pick emojis.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;

