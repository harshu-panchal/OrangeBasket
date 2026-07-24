import React, { useState, useEffect } from 'react';
import adminApi from '../../../core/api/axios';
import { toast } from 'sonner';
import { Plus, Image as ImageIcon, Loader2, Save, Trash2, Upload } from 'lucide-react';

const MonthlyBasketBanners = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Fetch existing configuration for Monthly Basket Hero
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await adminApi.get('/admin/experience/hero?pageType=monthly_basket');
                if (response.data?.result?.banners?.items) {
                    setBanners(response.data.result.banners.items);
                }
            } catch (error) {
                console.error(error);
                toast.error('Failed to load banner configuration');
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await adminApi.post('/admin/experience/upload-banner', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            const url = response.data.result.url;
            setBanners(prev => [...prev, { imageUrl: url, linkType: 'none', linkValue: '', order: prev.length }]);
            toast.success("Image uploaded!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = (index) => {
        setBanners(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await adminApi.put('/admin/experience/hero', {
                pageType: 'monthly_basket',
                banners: { items: banners.map((b, idx) => ({ ...b, order: idx })) }
            });
            toast.success('Banners saved successfully');
        } catch (error) {
            console.error('Error saving banners:', error.response?.data || error.message);
            toast.error(error.response?.data?.message || "Failed to save banners");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Monthly Basket Banners</h1>
                    <p className="text-slate-500 font-medium">Manage promotional banners for the subscription kits</p>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    Save Changes
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-primary" />
                        Banner Images
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {banners.map((banner, index) => (
                            <div key={index} className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 aspect-[21/9]">
                                <img src={banner.imageUrl} alt={`Banner ${index}`} className="w-full h-full object-cover" />
                                
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button 
                                        onClick={() => handleRemove(index)}
                                        className="bg-white/20 hover:bg-rose-500 text-white p-3 rounded-xl backdrop-blur-sm transition-colors"
                                    >
                                        <Trash2 className="h-6 w-6" />
                                    </button>
                                </div>
                                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-slate-800 text-xs font-black px-3 py-1 rounded-full shadow-sm">
                                    Banner {index + 1}
                                </div>
                            </div>
                        ))}

                        <label className="flex flex-col items-center justify-center w-full aspect-[21/9] border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                            {isUploading ? (
                                <div className="flex flex-col items-center text-primary">
                                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                    <span className="font-bold text-sm">Uploading...</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-slate-400">
                                    <Upload className="h-8 w-8 mb-2" />
                                    <span className="font-bold text-sm text-slate-500">Upload New Banner</span>
                                    <span className="text-xs mt-1">Recommended: 1200x400px</span>
                                </div>
                            )}
                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />
                        </label>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-xl text-sm text-orange-800 font-medium">
                        <strong>Note:</strong> These banners will appear specifically in the "Monthly Baskets" section of the customer home page.
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonthlyBasketBanners;
