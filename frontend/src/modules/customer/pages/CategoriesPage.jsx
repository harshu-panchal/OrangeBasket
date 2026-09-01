import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, ChevronRight, ChevronDown, ShoppingBasket, Leaf, Milk, Wheat, CookingPot, Cookie, CupSoda, UtensilsCrossed, Droplets, SprayCan, Baby, Snowflake, Sparkles, Dog, Activity, Home, Shirt, Luggage, Gift, LayoutGrid } from 'lucide-react';
import { customerApi } from '../services/customerApi';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';
import { useSettings } from '@core/context/SettingsContext';

const CATEGORY_THEMES = [
    { bg: 'bg-orange-50/70', border: 'border-orange-100', iconBg: 'bg-orange-500', iconColor: 'text-white', arrowColor: 'text-orange-500', icon: ShoppingBasket },
    { bg: 'bg-green-50/70', border: 'border-green-100', iconBg: 'bg-green-500', iconColor: 'text-white', arrowColor: 'text-green-500', icon: Leaf },
    { bg: 'bg-blue-50/70', border: 'border-blue-100', iconBg: 'bg-blue-500', iconColor: 'text-white', arrowColor: 'text-blue-500', icon: Milk },
    { bg: 'bg-amber-50/70', border: 'border-amber-100', iconBg: 'bg-amber-600', iconColor: 'text-white', arrowColor: 'text-amber-600', icon: Wheat },
    { bg: 'bg-red-50/70', border: 'border-red-100', iconBg: 'bg-red-500', iconColor: 'text-white', arrowColor: 'text-red-500', icon: CookingPot },
    { bg: 'bg-purple-50/70', border: 'border-purple-100', iconBg: 'bg-purple-500', iconColor: 'text-white', arrowColor: 'text-purple-500', icon: Cookie },
    { bg: 'bg-teal-50/70', border: 'border-teal-100', iconBg: 'bg-teal-500', iconColor: 'text-white', arrowColor: 'text-teal-500', icon: CupSoda },
    { bg: 'bg-rose-50/70', border: 'border-rose-100', iconBg: 'bg-rose-500', iconColor: 'text-white', arrowColor: 'text-rose-500', icon: UtensilsCrossed },
    { bg: 'bg-sky-50/70', border: 'border-sky-100', iconBg: 'bg-sky-500', iconColor: 'text-white', arrowColor: 'text-sky-500', icon: Droplets },
    { bg: 'bg-emerald-50/70', border: 'border-emerald-100', iconBg: 'bg-emerald-500', iconColor: 'text-white', arrowColor: 'text-emerald-500', icon: SprayCan },
    { bg: 'bg-pink-50/70', border: 'border-pink-100', iconBg: 'bg-pink-400', iconColor: 'text-white', arrowColor: 'text-pink-400', icon: Baby },
    { bg: 'bg-cyan-50/70', border: 'border-cyan-100', iconBg: 'bg-cyan-500', iconColor: 'text-white', arrowColor: 'text-cyan-500', icon: Snowflake },
    { bg: 'bg-fuchsia-50/70', border: 'border-fuchsia-100', iconBg: 'bg-fuchsia-500', iconColor: 'text-white', arrowColor: 'text-fuchsia-500', icon: Sparkles },
    { bg: 'bg-amber-100/70', border: 'border-amber-200', iconBg: 'bg-amber-500', iconColor: 'text-white', arrowColor: 'text-amber-500', icon: Dog },
    { bg: 'bg-lime-50/70', border: 'border-lime-100', iconBg: 'bg-lime-500', iconColor: 'text-white', arrowColor: 'text-lime-500', icon: Activity },
];

const DEFAULT_THEME = { bg: 'bg-slate-50', border: 'border-slate-100', iconBg: 'bg-slate-500', iconColor: 'text-white', arrowColor: 'text-slate-500', icon: LayoutGrid };

const getCategoryTheme = (index) => {
    return CATEGORY_THEMES[index % CATEGORY_THEMES.length] || DEFAULT_THEME;
};

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
                    (header.children || []).forEach(cat => {
                        flatCats.push({
                            id: cat._id,
                            name: cat.name,
                            image: cat.image || "https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=270/layout-engine/2022-11/Slice-1_9.png",
                            productCount: cat.productCount || 0,
                            subcategories: cat.children || [],
                            sortOrder: cat.sortOrder || 0
                        });
                    });
                });

                // Sort globally by sortOrder, then by name
                flatCats.sort((a, b) => {
                    const orderA = a.sortOrder || 0;
                    const orderB = b.sortOrder || 0;
                    if (orderA !== orderB) return orderA - orderB;
                    return a.name.localeCompare(b.name);
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
                    sortOrder: cat.sortOrder || 0
                }));

                // Sort globally by sortOrder, then by name
                formattedCats.sort((a, b) => {
                    const orderA = a.sortOrder || 0;
                    const orderB = b.sortOrder || 0;
                    if (orderA !== orderB) return orderA - orderB;
                    return a.name.localeCompare(b.name);
                });

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
            <div className="sticky top-0 z-30 bg-white px-5 py-3 flex items-center justify-between border-b border-gray-100">
                <button
                    onClick={() => navigate(-1)}
                    className="p-1 -ml-1 hover:bg-slate-50 rounded-full transition-all"
                >
                    <ChevronLeft size={24} className="text-gray-900" />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">All Categories</h1>
                    <span className="text-[11px] text-gray-500 font-medium">Find everything you need</span>
                </div>
                <button
                    onClick={() => navigate('/search')}
                    className="p-1.5 -mr-1 hover:bg-slate-50 rounded-full transition-all"
                >
                    <Search size={22} className="text-gray-900" strokeWidth={2.5} />
                </button>
            </div>

            <div className="max-w-[600px] mx-auto px-2 pt-4">
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
                <div className="mt-2">
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
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pb-8">
                            {categories.map((category, index) => {
                                const theme = getCategoryTheme(index);
                                const IconComponent = theme.icon;
                                return (
                                    <Link
                                        to={`/category/${category.id}`}
                                        key={category.id}
                                        className={`flex flex-col items-center p-2 rounded-[40px] border ${theme.border} ${theme.bg} shadow-sm transition-transform active:scale-95 h-full`}
                                    >
                                        <div className={`w-8 h-8 rounded-full ${theme.iconBg} flex items-center justify-center mb-2 z-10 -mt-1 shadow-sm flex-shrink-0`}>
                                            <IconComponent size={16} className={theme.iconColor} strokeWidth={2.5} />
                                        </div>
                                        
                                        <div className="w-16 h-16 sm:w-20 sm:h-20 mb-2 flex items-center justify-center flex-shrink-0">
                                            <img
                                                src={applyCloudinaryTransform(category.image)}
                                                alt={category.name}
                                                loading="lazy"
                                                className="w-full h-full object-contain mix-blend-multiply"
                                            />
                                        </div>
                                        
                                        <div className="flex flex-col items-center justify-start text-center w-full px-1 flex-grow">
                                            <span className="font-bold text-[12px] leading-[1.1] text-slate-800 line-clamp-2 min-h-[26px] flex items-center justify-center">
                                                {category.name}
                                            </span>
                                            <span className="text-[10px] font-medium text-slate-500 mt-1 whitespace-nowrap">
                                                {category.productCount || 0}+ Items
                                            </span>
                                        </div>
                                        
                                        <div className="mt-2 pb-1">
                                            <ChevronDown size={14} className={theme.arrowColor} strokeWidth={3} />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategoriesPage;
