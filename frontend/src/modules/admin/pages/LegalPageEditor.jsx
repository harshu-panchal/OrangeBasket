import React, { useState, useEffect, useCallback } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { ScrollText, Shield, Save, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { adminApi } from '../services/api/index';
import { toast } from 'sonner';

const TABS = [
    { key: 'terms', label: 'Terms & Conditions', icon: ScrollText, defaultTitle: 'Terms & Conditions' },
    { key: 'privacy', label: 'Privacy Policy', icon: Shield, defaultTitle: 'Privacy Policy' },
];

const AUDIENCES = [
    { key: 'customer', label: 'Customer' },
    { key: 'seller', label: 'Seller' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'delivery', label: 'Delivery' },
];

const quillModules = {
    toolbar: [
        [{ header: [1, 2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        [{ align: [] }],
        ['blockquote'],
        ['link'],
        ['clean'],
    ],
};

const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'indent', 'align',
    'blockquote', 'link',
];

const LegalPageEditor = () => {
    const [activeTab, setActiveTab] = useState('terms');
    const [activeAudience, setActiveAudience] = useState('customer');
    const [pages, setPages] = useState({
        terms: { title: '', content: '', isPublished: true, loaded: false },
        privacy: { title: '', content: '', isPublished: true, loaded: false },
    });
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchPage = useCallback(async (type, audience) => {
        try {
            setLoading(true);
            const res = await adminApi.getLegalPage({ type, audience });
            const data = res.data?.result || res.data?.data || {};
            setPages(prev => ({
                ...prev,
                [type]: {
                    title: data.title || '',
                    content: data.content || '',
                    isPublished: data.isPublished !== undefined ? data.isPublished : true,
                    loaded: true,
                },
            }));
        } catch {
            // Page doesn't exist yet, that's fine
            setPages(prev => ({
                ...prev,
                [type]: { ...prev[type], loaded: true },
            }));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!pages[activeTab].loaded) {
            fetchPage(activeTab, activeAudience);
        }
    }, [activeTab, activeAudience, pages, fetchPage]);

    // Load both on mount or audience change
    useEffect(() => {
        setPages(prev => ({
            ...prev,
            terms: { ...prev.terms, loaded: false },
            privacy: { ...prev.privacy, loaded: false },
        }));
        fetchPage('terms', activeAudience);
        fetchPage('privacy', activeAudience);
    }, [activeAudience, fetchPage]);

    const handleSave = async () => {
        const current = pages[activeTab];
        const tab = TABS.find(t => t.key === activeTab);
        try {
            setSaving(true);
            await adminApi.upsertLegalPage({
                type: activeTab,
                audience: activeAudience,
                title: current.title || tab.defaultTitle,
                content: current.content,
                isPublished: current.isPublished,
            });
            toast.success(`${tab.label} saved successfully!`);
        } catch (err) {
            toast.error('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field, value) => {
        setPages(prev => ({
            ...prev,
            [activeTab]: { ...prev[activeTab], [field]: value },
        }));
    };

    const currentPage = pages[activeTab];
    const activeTabInfo = TABS.find(t => t.key === activeTab);

    return (
        <div className="space-y-6 font-['Outfit']">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Legal Pages</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        Manage your Terms & Conditions and Privacy Policy content
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setPreview(!preview)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                    >
                        {preview ? <EyeOff size={16} /> : <Eye size={16} />}
                        {preview ? 'Edit Mode' : 'Preview'}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Audience and Tabs Row */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                    {AUDIENCES.map(aud => (
                        <button
                            key={aud.key}
                            onClick={() => setActiveAudience(aud.key)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                activeAudience === aud.key
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                        >
                            {aud.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); setPreview(false); }}
                            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                                isActive
                                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                            {pages[tab.key].loaded && pages[tab.key].content && (
                                <CheckCircle size={14} className={isActive ? 'text-emerald-400' : 'text-emerald-500'} />
                            )}
                        </button>
                    );
                })}
                </div>
            </div>

            {/* Content Area */}
            {loading && !currentPage.loaded ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-20 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin text-slate-400" />
                </div>
            ) : preview ? (
                /* Preview Mode */
                <div className="bg-white rounded-2xl border border-slate-200 p-8">
                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <activeTabInfo.icon size={24} className="text-slate-700" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900">
                                {currentPage.title || activeTabInfo.defaultTitle}
                            </h2>
                            <p className="text-xs text-slate-500 font-medium mt-1">Preview Mode</p>
                        </div>
                    </div>
                    <div
                        className="prose prose-slate prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: currentPage.content || '<p class="text-slate-400">No content yet. Switch to Edit Mode to add content.</p>' }}
                    />
                </div>
            ) : (
                /* Edit Mode */
                <div className="space-y-4">
                    {/* Title Input */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                            Page Title
                        </label>
                        <input
                            type="text"
                            value={currentPage.title}
                            onChange={(e) => updateField('title', e.target.value)}
                            placeholder={activeTabInfo.defaultTitle}
                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>

                    {/* Published Toggle */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                                Published Status
                            </label>
                            <p className="text-xs text-slate-500 mt-1">
                                {currentPage.isPublished ? 'This page is visible to all users' : 'This page is hidden from users'}
                            </p>
                        </div>
                        <button
                            onClick={() => updateField('isPublished', !currentPage.isPublished)}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                                currentPage.isPublished ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                                    currentPage.isPublished ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Rich Text Editor */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">
                            Page Content
                        </label>
                        <div className="legal-editor-wrapper">
                            <ReactQuill
                                theme="snow"
                                value={currentPage.content}
                                onChange={(val) => updateField('content', val)}
                                modules={quillModules}
                                formats={quillFormats}
                                placeholder={`Write your ${activeTabInfo.label} content here...`}
                                style={{ minHeight: '400px' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Quill Styles */}
            <style>{`
                .legal-editor-wrapper .ql-toolbar {
                    border: none !important;
                    background: #f8fafc;
                    border-radius: 12px 12px 0 0;
                    padding: 12px 16px !important;
                }
                .legal-editor-wrapper .ql-container {
                    border: none !important;
                    font-family: 'Outfit', sans-serif;
                    font-size: 14px;
                    border-radius: 0 0 12px 12px;
                    background: #f8fafc;
                    min-height: 400px;
                }
                .legal-editor-wrapper .ql-editor {
                    min-height: 400px;
                    padding: 20px 24px;
                    color: #334155;
                    line-height: 1.8;
                }
                .legal-editor-wrapper .ql-editor.ql-blank::before {
                    color: #94a3b8;
                    font-style: normal;
                }
                .legal-editor-wrapper .ql-snow .ql-picker {
                    font-family: 'Outfit', sans-serif;
                }
                .legal-editor-wrapper .ql-toolbar .ql-stroke {
                    stroke: #64748b;
                }
                .legal-editor-wrapper .ql-toolbar .ql-fill {
                    fill: #64748b;
                }
                .legal-editor-wrapper .ql-toolbar button:hover .ql-stroke,
                .legal-editor-wrapper .ql-toolbar .ql-picker-label:hover .ql-stroke {
                    stroke: #0f172a;
                }
                .legal-editor-wrapper .ql-toolbar button:hover .ql-fill,
                .legal-editor-wrapper .ql-toolbar .ql-picker-label:hover .ql-fill {
                    fill: #0f172a;
                }
                .legal-editor-wrapper .ql-toolbar button.ql-active .ql-stroke {
                    stroke: #0f172a;
                }
                .legal-editor-wrapper .ql-toolbar button.ql-active .ql-fill {
                    fill: #0f172a;
                }
            `}</style>
        </div>
    );
};

export default LegalPageEditor;
