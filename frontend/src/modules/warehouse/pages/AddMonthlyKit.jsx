import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import warehouseApi from '../../../core/api/axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    ArrowLeft, Loader2, Save, Upload, Plus, Trash2,
    Tag, Image as ImageIcon, Sparkles, FolderOpen, Layers, Package
} from 'lucide-react';

const PRESET_HIGHLIGHT_ICONS = [
    { id: "leaf", emoji: "🌿", name: "Natural / Organic" },
    { id: "avocado", emoji: "🥑", name: "Farm Fresh" },
    { id: "zap", emoji: "⚡", name: "High Protein" },
    { id: "sprout", emoji: "🌱", name: "Source of Fiber" },
    { id: "shield", emoji: "🛡️", name: "Quality / Certified" },
    { id: "heart", emoji: "❤️", name: "Healthy / Low Fat" },
    { id: "star", emoji: "⭐", name: "Premium Quality" },
    { id: "truck", emoji: "🚚", name: "Fast Express Delivery" },
    { id: "wheat", emoji: "🌾", name: "Whole Grain / Pure" },
    { id: "sugarfree", emoji: "🍬", name: "Sugar Free" },
    { id: "sun", emoji: "☀️", name: "Sun Dried" },
    { id: "smile", emoji: "😊", name: "Chemical Free" },
    { id: "box", emoji: "📦", name: "Monthly Supply" },
    { id: "family", emoji: "👨‍👩‍👧‍👦", name: "Family Pack" },
    { id: "value", emoji: "💰", name: "Best Value" },
];

const TIER_PRESETS = [
    { name: 'Basic Kit', price: 3999, color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { name: 'Standard Kit', price: 5999, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { name: 'Premium Kit', price: 7999, color: 'bg-amber-50 border-amber-200 text-amber-700' },
    { name: 'Family Kit', price: 9999, color: 'bg-purple-50 border-purple-200 text-purple-700' },
];

const makeSku = (name, index = 1) => {
    const prefix = String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "kit";
    return `KIT-${prefix}-${String(index).padStart(3, "0")}`;
};

const AddMonthlyKit = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        salePrice: '',
        stock: '',
        lowStockAlert: 5,
        brand: '',
        sku: '',
        weight: '',
        tags: '',
        categoryId: '',
        status: 'active',
        mainImage: null,
        mainImageFile: null,
        galleryImages: [],
        galleryFiles: [],
        highlights: [
            { icon: "box", label: "Monthly Supply" },
            { icon: "truck", label: "Free Delivery" },
            { icon: "star", label: "Premium Quality" },
            { icon: "value", label: "Best Value" },
        ],
        variants: [
            { id: Date.now(), name: '', price: '', salePrice: '', stock: '', sku: '' },
        ],
    });

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await warehouseApi.get('/categories');
                const allCats = response.data.results || response.data.result || [];
                const kitCats = allCats.filter(c => c.isKitCategory);
                setCategories(kitCats.length > 0 ? kitCats : allCats);
                if (kitCats.length > 0) {
                    setFormData(prev => ({ ...prev, categoryId: kitCats[0]._id }));
                } else if (allCats.length > 0) {
                    setFormData(prev => ({ ...prev, categoryId: allCats[0]._id }));
                }
            } catch (error) {
                console.error("Failed to fetch categories", error);
            }
        };
        fetchCategories();
    }, []);

    // Auto-generate SKU when name changes
    useEffect(() => {
        setFormData(prev => {
            if (!prev.name) return prev;
            const autoSku = makeSku(prev.name, 1);
            const shouldAutoUpdate = !prev.sku || prev.sku.startsWith('KIT-');
            return shouldAutoUpdate ? { ...prev, sku: autoSku } : prev;
        });
    }, [formData.name]);

    const applyTierPreset = (tier) => {
        setFormData(prev => ({
            ...prev,
            name: tier.name,
            price: tier.price.toString(),
            salePrice: tier.price.toString(),
        }));
    };

    const handleImageUpload = (e, type) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'main') {
                    setFormData(prev => ({ 
                        ...prev, 
                        mainImage: reader.result,
                        mainImageFile: file 
                    }));
                } else {
                    setFormData(prev => ({
                        ...prev,
                        galleryImages: [...prev.galleryImages, reader.result],
                        galleryFiles: [...(prev.galleryFiles || []), file]
                    }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const removeGalleryImage = (index) => {
        setFormData(prev => ({
            ...prev,
            galleryImages: prev.galleryImages.filter((_, i) => i !== index),
            galleryFiles: prev.galleryFiles.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.price || !formData.stock || !formData.categoryId) {
            toast.error("Please fill in Name, Price, Stock and Category");
            return;
        }

        setLoading(true);
        try {
            const data = new FormData();

            data.append("name", formData.name);
            data.append("description", formData.description);
            data.append("brand", formData.brand);
            data.append("sku", formData.sku);
            data.append("weight", formData.weight);
            data.append("status", formData.status);
            data.append("categoryId", formData.categoryId);
            data.append("price", Number(formData.price));
            data.append("salePrice", Number(formData.salePrice) || Number(formData.price));
            data.append("stock", Number(formData.stock));
            data.append("lowStockAlert", Number(formData.lowStockAlert) || 5);

            if (formData.tags) {
                const tagsArr = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
                data.append("tags", JSON.stringify(tagsArr));
            }

            const validVariants = formData.variants.filter(v => v.name).map(v => ({
                name: v.name,
                price: Number(v.price) || 0,
                salePrice: Number(v.salePrice) || 0,
                stock: Number(v.stock) || 0,
                sku: v.sku || '',
            }));
            data.append("variants", JSON.stringify(validVariants));
            data.append("highlights", JSON.stringify(formData.highlights || []));

            if (formData.mainImageFile) {
                data.append("mainImage", formData.mainImageFile);
            }

            if (formData.galleryFiles && formData.galleryFiles.length > 0) {
                formData.galleryFiles.forEach(file => {
                    data.append("galleryImages", file);
                });
            }

            await warehouseApi.post('/kits/warehouse', data);
            toast.success('Monthly Kit created! Pending admin approval.');
            navigate('/warehouse/monthly-kits');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to create kit');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'general', label: 'General Info', icon: Tag },
        { id: 'variants', label: 'Kit Variants', icon: Layers },
        { id: 'category', label: 'Category', icon: FolderOpen },
        { id: 'highlights', label: 'Highlights', icon: Sparkles },
        { id: 'media', label: 'Photos', icon: ImageIcon },
    ];

    const inputClass = "w-full px-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-semibold outline-none ring-primary/5 focus:ring-2 transition-all";
    const labelClass = "text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1";

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900">Create Monthly Kit</h1>
                        <p className="text-xs font-medium text-slate-500">Add a new subscription basket</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate(-1)} className="px-5 py-2.5 border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-black text-sm rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {loading ? 'Submitting...' : 'Submit for Approval'}
                    </button>
                </div>
            </div>

            {/* Tier Presets */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {TIER_PRESETS.map(tier => (
                    <button
                        key={tier.name}
                        type="button"
                        onClick={() => applyTierPreset(tier)}
                        className={cn(
                            "flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-105 active:scale-95",
                            formData.name === tier.name
                                ? tier.color + " ring-2 ring-offset-1 ring-primary/30"
                                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                    >
                        <Package className="h-3.5 w-3.5 inline mr-1.5" />
                        {tier.name} — ₹{tier.price.toLocaleString()}
                    </button>
                ))}
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[550px] border border-slate-100">
                {/* Sidebar Tabs */}
                <div className="md:w-56 bg-slate-50/50 border-r border-slate-100 p-3 space-y-1 overflow-y-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left",
                                activeTab === tab.id
                                    ? "bg-white text-primary shadow-sm ring-1 ring-slate-100"
                                    : "text-slate-600 hover:bg-slate-100"
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            <span>{tab.label}</span>
                        </button>
                    ))}

                    {/* Status */}
                    <div className="pt-6 px-3">
                        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                            <p className="text-[9px] font-bold text-orange-600 uppercase tracking-widest mb-1">Status</p>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg text-xs font-bold outline-none cursor-pointer"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto">

                    {/* ===== GENERAL INFO TAB ===== */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="space-y-1.5">
                                <label className={labelClass}>Kit Name</label>
                                <input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className={inputClass}
                                    placeholder="e.g. Premium Monthly Basket"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className={labelClass}>About this Kit</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className={cn(inputClass, "min-h-[140px] max-h-[240px] resize-none rounded-2xl")}
                                    placeholder="Describe what's included in this monthly basket..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className={labelClass}>Brand Name</label>
                                    <input
                                        value={formData.brand}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        className={inputClass}
                                        placeholder="e.g. Orange Basket"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelClass}>Product Code (SKU)</label>
                                    <input
                                        value={formData.sku}
                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                        className={cn(inputClass, "font-mono")}
                                        placeholder="AUTO-GENERATED"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-1.5">
                                    <label className={labelClass}>Price (₹) <span className="text-rose-500">*</span></label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className={inputClass}
                                        placeholder="3999"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={cn(labelClass, "text-emerald-600")}>Sale Price</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.salePrice}
                                        onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                                        className={cn(inputClass, "bg-emerald-50 text-emerald-700")}
                                        placeholder="3499"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelClass}>Stock <span className="text-rose-500">*</span></label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                        className={inputClass}
                                        placeholder="100"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelClass}>Low Stock Alert</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.lowStockAlert}
                                        onChange={(e) => setFormData({ ...formData, lowStockAlert: e.target.value })}
                                        className={inputClass}
                                        placeholder="5"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className={labelClass}>Weight / Size</label>
                                    <input
                                        value={formData.weight}
                                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                        className={inputClass}
                                        placeholder="e.g. Monthly Supply, 5kg, etc."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelClass}>Tags (comma separated)</label>
                                    <input
                                        value={formData.tags}
                                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                        className={inputClass}
                                        placeholder="monthly, essentials, organic"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== VARIANTS TAB ===== */}
                    {activeTab === 'variants' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">Kit Variants</h4>
                                    <p className="text-xs text-slate-500 font-medium">Add different sizes or durations (e.g. 1-Month, 3-Month)</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({
                                        ...prev,
                                        variants: [
                                            ...prev.variants,
                                            { id: Date.now(), name: '', price: '', salePrice: '', stock: '', sku: makeSku(prev.name, prev.variants.length + 1) }
                                        ]
                                    }))}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-all"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>ADD VARIANT</span>
                                </button>
                            </div>

                            <div className="space-y-3">
                                {formData.variants.map((variant, index) => (
                                    <div key={variant.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-end group relative">
                                        <div className="col-span-12 md:col-span-3 space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">Variant Name</label>
                                            <input
                                                value={variant.name}
                                                onChange={(e) => {
                                                    const newVariants = [...formData.variants];
                                                    newVariants[index].name = e.target.value;
                                                    setFormData({ ...formData, variants: newVariants });
                                                }}
                                                placeholder="e.g. 1-Month Supply"
                                                className="w-full px-3 py-2 bg-white ring-1 ring-slate-200 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/10"
                                            />
                                        </div>
                                        <div className="col-span-6 md:col-span-2 space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">Price</label>
                                            <input
                                                type="number" min="0"
                                                value={variant.price}
                                                onChange={(e) => {
                                                    const newVariants = [...formData.variants];
                                                    newVariants[index].price = e.target.value;
                                                    setFormData({ ...formData, variants: newVariants });
                                                }}
                                                placeholder="3999"
                                                className="w-full px-3 py-2 bg-white ring-1 ring-slate-200 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10"
                                            />
                                        </div>
                                        <div className="col-span-6 md:col-span-2 space-y-1">
                                            <label className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest ml-1">Sale</label>
                                            <input
                                                type="number" min="0"
                                                value={variant.salePrice}
                                                onChange={(e) => {
                                                    const newVariants = [...formData.variants];
                                                    newVariants[index].salePrice = e.target.value;
                                                    setFormData({ ...formData, variants: newVariants });
                                                }}
                                                placeholder="3499"
                                                className="w-full px-3 py-2 bg-emerald-50 ring-1 ring-emerald-100 border-none rounded-xl text-xs font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-200"
                                            />
                                        </div>
                                        <div className="col-span-6 md:col-span-2 space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">Stock</label>
                                            <input
                                                type="number" min="0"
                                                value={variant.stock}
                                                onChange={(e) => {
                                                    const newVariants = [...formData.variants];
                                                    newVariants[index].stock = e.target.value;
                                                    setFormData({ ...formData, variants: newVariants });
                                                }}
                                                placeholder="50"
                                                className="w-full px-3 py-2 bg-white ring-1 ring-slate-200 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10"
                                            />
                                        </div>
                                        <div className="col-span-6 md:col-span-2 space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">SKU</label>
                                            <input
                                                value={variant.sku}
                                                onChange={(e) => {
                                                    const newVariants = [...formData.variants];
                                                    newVariants[index].sku = e.target.value;
                                                    setFormData({ ...formData, variants: newVariants });
                                                }}
                                                placeholder="AUTO"
                                                className="w-full px-3 py-2 bg-white ring-1 ring-slate-200 border-none rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary/10"
                                            />
                                        </div>
                                        <div className="col-span-12 md:col-span-1 flex justify-end">
                                            {formData.variants.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({
                                                        ...prev,
                                                        variants: prev.variants.filter((_, i) => i !== index)
                                                    }))}
                                                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ===== CATEGORY TAB ===== */}
                    {activeTab === 'category' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 mb-1">Kit Category</h4>
                                <p className="text-xs text-slate-500 font-medium">Select the category for this monthly basket kit.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label className={labelClass}>Category <span className="text-rose-500">*</span></label>
                                <select
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    className={cn(inputClass, "cursor-pointer")}
                                >
                                    <option value="" disabled>Select a category</option>
                                    {categories.map(cat => (
                                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            {categories.length === 0 && (
                                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                                    <p className="text-sm font-bold text-amber-800">No Kit Categories Found</p>
                                    <p className="text-xs text-amber-600 mt-1">Ask your admin to create Kit Categories first.</p>
                                </div>
                            )}

                            {formData.categoryId && (
                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500 rounded-xl">
                                        <FolderOpen className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-800">Selected Category</p>
                                        <p className="text-sm font-black text-emerald-900">
                                            {categories.find(c => c._id === formData.categoryId)?.name || 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===== HIGHLIGHTS TAB ===== */}
                    {activeTab === 'highlights' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">
                                    Kit Highlight Badges (4 Slots)
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Select icons and enter custom labels to show on the product page.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[0, 1, 2, 3].map((slotIdx) => {
                                    const currentHighlight = formData.highlights?.[slotIdx] || { icon: "leaf", label: "" };
                                    return (
                                        <div key={slotIdx} className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                    Highlight #{slotIdx + 1}
                                                </span>
                                                <span className="text-xl">
                                                    {PRESET_HIGHLIGHT_ICONS.find(i => i.id === currentHighlight.icon)?.emoji || "🌿"}
                                                </span>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                                    Select Icon
                                                </label>
                                                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200">
                                                    {PRESET_HIGHLIGHT_ICONS.map(ic => (
                                                        <button
                                                            key={ic.id}
                                                            type="button"
                                                            onClick={() => {
                                                                const nextHL = [...(formData.highlights || [])];
                                                                nextHL[slotIdx] = { ...currentHighlight, icon: ic.id };
                                                                setFormData({ ...formData, highlights: nextHL });
                                                            }}
                                                            className={cn(
                                                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                                                currentHighlight.icon === ic.id
                                                                    ? "bg-orange-50 border-primary text-primary shadow-xs"
                                                                    : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                                                            )}
                                                        >
                                                            <span>{ic.emoji}</span>
                                                            <span className="text-[10px] hidden md:inline">{ic.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                                    Label Text
                                                </label>
                                                <input
                                                    type="text"
                                                    value={currentHighlight.label}
                                                    onChange={(e) => {
                                                        const nextHL = [...(formData.highlights || [])];
                                                        nextHL[slotIdx] = { ...currentHighlight, label: e.target.value };
                                                        setFormData({ ...formData, highlights: nextHL });
                                                    }}
                                                    placeholder="e.g. Monthly Supply"
                                                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/10"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ===== PHOTOS TAB ===== */}
                    {activeTab === 'media' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            {/* Main Image */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                                    Main Cover Photo
                                </label>
                                <div className="flex flex-col md:flex-row items-start gap-6">
                                    <div className="w-48 aspect-square rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center group hover:border-primary hover:bg-primary/5 transition-all cursor-pointer overflow-hidden relative">
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'main')}
                                        />
                                        {formData.mainImage ? (
                                            <img src={formData.mainImage} className="w-full h-full object-cover" alt="Main" />
                                        ) : (
                                            <>
                                                <Upload className="h-10 w-10 text-slate-200 group-hover:text-primary transition-colors" />
                                                <p className="text-[9px] font-bold text-slate-600 mt-2 uppercase tracking-widest group-hover:text-primary">
                                                    Upload Cover
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2 pt-2">
                                        <p className="text-xs font-bold text-slate-900">Choose a primary image</p>
                                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                            This image will be shown on the home page and kit listing. Make sure it's clear and vibrant.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Gallery */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                                    Gallery Photos (Max 5)
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    {[0, 1, 2, 3, 4].map(i => (
                                        <div
                                            key={i}
                                            className="aspect-square rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center group hover:border-primary hover:bg-primary/5 transition-all cursor-pointer relative overflow-hidden"
                                        >
                                            {formData.galleryImages[i] ? (
                                                <>
                                                    <img src={formData.galleryImages[i]} className="w-full h-full object-cover" alt={`Gallery ${i + 1}`} />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeGalleryImage(i)}
                                                        className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full z-20 hover:bg-rose-600 shadow-lg"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <input
                                                        type="file"
                                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                        accept="image/*"
                                                        onChange={(e) => handleImageUpload(e, 'gallery')}
                                                    />
                                                    <Plus className="h-5 w-5 text-slate-200 group-hover:text-primary transition-colors" />
                                                    <p className="text-[8px] font-bold text-slate-600 mt-1 uppercase tracking-widest group-hover:text-primary">
                                                        Add
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <p className="text-xs text-slate-600 font-medium italic text-center pt-4 border-t border-slate-50">
                                Tip: Use WebP format at 800×800px for the best performance.
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AddMonthlyKit;
