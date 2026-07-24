import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, ChevronRight } from 'lucide-react';
import { customerApi } from '../services/customerApi';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';
import { useSettings } from '@core/context/SettingsContext';

const CategoriesPage = () => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const { settings } = useSettings();

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            // Try tree first for better organization
            const res = await customerApi.getCategories({ tree: true });
            if (res.data.success) {
                const tree = res.data.results || res.data.result || [];
                const flatCats = [];
                tree.forEach(header => {
                    if ((header.name || '').trim().toLowerCase() !== 'all') {
                        (header.children || []).forEach(cat => {
                            flatCats.push({
                                id: cat._id,
                                name: cat.name,
                                image: cat.image || "https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=270/layout-engine/2022-11/Slice-1_9.png",
                                productCount: cat.productCount || 0,
                            });
                        });
                    }
                });
                
                if (flatCats.length > 0) {
                    setCategories(flatCats);
                    setIsLoading(false);
                    return;
                }
            }

            // Fallback: use flat list
            const flatRes = await customerApi.getCategories();
            if (flatRes.data.success) {
                const all = flatRes.data.results || flatRes.data.result || [];
                const cats = all.filter(c => c.type === 'category');
                
                const formattedCats = cats.map(cat => ({
                    id: cat._id,
                    name: cat.name,
                    image: cat.image || "https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=270/layout-engine/2022-11/Slice-1_9.png",
                    productCount: cat.productCount || 0,
                }));
                setCategories(formattedCats);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const banner = settings?.categoriesBanner || {
        image: '',
        badgeText: 'KIRANA STORE',
        title: 'Everything you need, in one place',
        buttonText: 'Shop Now',
        buttonLink: '/',
        isVisible: true,
    };

    return (
        <div className="min-h-screen bg-white pb-16 md:pt-[80px] font-sans">
            {/* Header Area */}
            <div className="sticky top-0 z-30 bg-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1 -ml-1 hover:bg-slate-50 rounded-full transition-all"
                    >
                        <ChevronLeft size={24} className="text-gray-900" />
                    </button>
                    <h1 className="text-[22px] font-black text-gray-900 tracking-tight">Categories</h1>
                </div>
                <button
                    onClick={() => navigate('/search')}
                    className="p-1.5 hover:bg-slate-50 rounded-full transition-all"
                >
                    <Search size={22} className="text-gray-900" strokeWidth={2.5} />
                </button>
            </div>

            <div className="max-w-[600px] mx-auto px-4 space-y-5">
                {/* Promotional Banner - Hidden on Desktop (md:hidden), Visible only on Mobile */}
                {banner?.isVisible && banner?.image && (
                    <div className="block md:hidden w-full overflow-hidden rounded-2xl">
                        <img
                            src={banner.image}
                            alt="Categories Banner"
                            className="w-full h-auto object-contain block"
                        />
                    </div>
                )}

                {/* Categories List */}
                <div className="space-y-1">
                    {isLoading && (
                        <div className="space-y-4 py-4">
                            {[...Array(6)].map((_, idx) => (
                                <div key={idx} className="flex items-center justify-between py-4 px-2">
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 bg-slate-50/50 rounded-xl animate-pulse" />
                                        <div className="space-y-2">
                                            <div className="h-4 w-28 bg-slate-50 rounded animate-pulse" />
                                            <div className="h-3 w-16 bg-slate-50 rounded animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="h-4 w-4 bg-slate-50 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    )}

                    {!isLoading && categories.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="text-6xl mb-4">🛒</div>
                            <h2 className="text-xl font-bold text-gray-700 mb-2">No Categories Found</h2>
                            <p className="text-gray-400 text-sm">Add categories from the admin panel to see them here.</p>
                        </div>
                    )}

                    {!isLoading && categories.length > 0 && (
                        <div className="divide-y divide-slate-100/80">
                            {categories.map((category) => (
                                <Link
                                    key={category.id}
                                    to={`/category/${category.id}`}
                                    className="flex items-center justify-between py-2 hover:bg-slate-50/40 transition-colors px-2"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 flex items-center justify-center flex-shrink-0">
                                            <img
                                                src={applyCloudinaryTransform(category.image)}
                                                alt={category.name}
                                                loading="lazy"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[15px] text-slate-800 leading-tight">
                                                {category.name}
                                            </span>
                                            <span className="text-[12px] font-bold text-slate-400 mt-1 uppercase tracking-wide">
                                                {category.productCount || 0} {category.productCount === 1 ? 'item' : 'items'}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-400" strokeWidth={2.5} />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategoriesPage;
