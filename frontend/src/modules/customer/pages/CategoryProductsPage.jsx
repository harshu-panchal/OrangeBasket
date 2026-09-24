import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Heart, Search, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '@shared/components/ui/Toast';
import { cn } from '@/lib/utils';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';

import ProductCard from '../components/shared/ProductCard';
import ProductDetailSheet from '../components/shared/ProductDetailSheet';
import { useProductDetail } from '../context/ProductDetailContext';
import { customerApi } from '../services/customerApi';
import MiniCart from '../components/shared/MiniCart';
import SectionRenderer from "../components/experience/SectionRenderer";
import { useLocation as useAppLocation } from '../context/LocationContext';
import { useSettings } from '@core/context/SettingsContext';
import Lottie from 'lottie-react';
import { VirtuosoGrid } from 'react-virtuoso';
import { useInfiniteQuery } from '@tanstack/react-query';

const CategoryProductsPage = () => {
    const { categoryName: catId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { currentLocation } = useAppLocation();
    const { settings } = useSettings();
    const initialSubcategoryId = location.state?.activeSubcategoryId || 'all';
    const { isOpen: isProductDetailOpen } = useProductDetail();
    const [selectedSubCategory, setSelectedSubCategory] = useState(initialSubcategoryId);
    const [category, setCategory] = useState(null);
    const [subCategories, setSubCategories] = useState([{ id: 'all', name: 'All', icon: 'https://cdn-icons-png.flaticon.com/128/2321/2321831.png' }]);
    const [queryKey, setQueryKey] = useState(null);

    const [noServiceData, setNoServiceData] = useState(null);

    // Dynamically load no-service Lottie on mount
    useEffect(() => {
        import('@/assets/lottie/animation.json')
            .then((m) => setNoServiceData(m.default))
            .catch(() => {});
    }, []);

    // 1. Fetch Category Tree when catId changes
    useEffect(() => {
        let mounted = true;
        const fetchTree = async () => {
            try {
                const catRes = await customerApi.getCategories({ tree: true });
                if (!mounted) return;
                let qk = 'categoryId';
                let currentCat = null;
                let subCategoriesList = [{ id: 'all', name: 'All', icon: 'https://cdn-icons-png.flaticon.com/128/2321/2321831.png' }];

                if (catRes.data.success) {
                    const tree = catRes.data.results || catRes.data.result || [];
                    for (const header of tree) {
                        if (header._id === catId || header.id === catId) {
                            currentCat = header;
                            qk = 'headerId';
                            break;
                        }
                        const found = (header.children || []).find(c => c._id === catId || c.id === catId);
                        if (found) {
                            currentCat = found;
                            break;
                        }
                    }

                    if (currentCat) {
                        setCategory(currentCat);
                        const subs = (currentCat.children || []).map(s => ({
                            id: s._id || s.id,
                            name: s.name,
                            icon: s.image || 'https://cdn-icons-png.flaticon.com/128/2321/2321801.png'
                        }));
                        subCategoriesList = [...subCategoriesList, ...subs];
                        setSubCategories(subCategoriesList);
                    }
                }
                setQueryKey(qk);
            } catch (err) {
                console.error("Error fetching category tree:", err);
                if (mounted) setQueryKey('categoryId');
            }
        };
        fetchTree();
        return () => { mounted = false; };
    }, [catId]);

    // Reset subcategories is handled automatically by query keys in React Query

    // 2. Fetch Products with Pagination using React Query
    const hasValidLocation = Number.isFinite(currentLocation?.latitude) && Number.isFinite(currentLocation?.longitude);
    
    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage: hasMore,
        isFetchingNextPage: isFetchingMore,
        isLoading,
    } = useInfiniteQuery({
        queryKey: ['categoryProducts', catId, queryKey, selectedSubCategory, currentLocation?.latitude, currentLocation?.longitude],
        queryFn: async ({ pageParam = 1 }) => {
            const params = {
                limit: 24,
                page: pageParam,
                lat: currentLocation?.latitude,
                lng: currentLocation?.longitude,
            };
            
            if (selectedSubCategory !== 'all') {
                params.subcategoryId = selectedSubCategory;
            } else if (queryKey) {
                params[queryKey] = catId;
            }

            const prodRes = await customerApi.getProducts(params);
            
            if (!prodRes.data.success) {
                if (prodRes.data.message === "No products available in your area") {
                    throw new Error("NO_SERVICE");
                }
                return { items: [], totalPages: 1 };
            }
            
            const rawResult = prodRes.data.result;
            const dbProds = Array.isArray(prodRes.data.results)
                ? prodRes.data.results
                : Array.isArray(rawResult?.items)
                ? rawResult.items
                : Array.isArray(rawResult)
                ? rawResult
                : [];

            const items = dbProds.map(p => ({
                ...p,
                id: p._id || p.id,
                image: p.mainImage || p.image || "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400&h=400",
                price: p.salePrice || p.price,
                originalPrice: p.price,
                weight: p.weight || "1 unit",
                deliveryTime: "8-15 mins"
            }));
            
            return {
                items,
                totalPages: rawResult?.totalPages || 1
            };
        },
        getNextPageParam: (lastPage, allPages) => {
            if (allPages.length < lastPage.totalPages) {
                return allPages.length + 1;
            }
            return undefined;
        },
        enabled: !!queryKey && hasValidLocation,
        staleTime: 5 * 60 * 1000, // cache for 5 minutes
    });

    const serviceUnavailable = !hasValidLocation || infiniteData?.pages[0]?.error === "NO_SERVICE";
    const products = infiniteData ? infiniteData.pages.flatMap(page => page.items) : [];
    const observer = React.useRef(); // Kept for reference but not needed if using Virtuoso
    
    const loadMoreProducts = React.useCallback(() => {
        if (hasMore && !isFetchingMore && !isLoading) {
            fetchNextPage();
        }
    }, [hasMore, isFetchingMore, isLoading, fetchNextPage]);

    const safeProducts = Array.isArray(products) ? products : [];

    const productsById = React.useMemo(() => {
        const map = {};
        safeProducts.forEach(p => {
            map[p._id || p.id] = p;
        });
        return map;
    }, [safeProducts]);

    return (
        <div className="bg-white min-h-screen w-full max-w-md mx-auto relative font-sans pb-24">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-gray-100 h-14 flex items-center justify-center px-4">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute left-4 p-1 hover:bg-gray-50 rounded-full transition-colors flex items-center justify-center"
                >
                    <ChevronLeft size={24} className="text-gray-900" />
                </button>
                <h1 className="text-base font-bold text-gray-800 tracking-tight truncate px-8">
                    {category?.name || catId}
                </h1>
            </header>

            {(safeProducts.length === 0 && !isLoading) ? (
                serviceUnavailable ? (
                    <div className="w-full flex-1 py-20 px-8 flex flex-col items-center justify-center text-center">
                        <div className="w-64 h-64 mb-6">
                            {noServiceData ? (
                                <Lottie animationData={noServiceData} loop={true} />
                            ) : (
                                <div className="w-64 h-64" />
                            )}
                        </div>
                        <h3 className="text-3xl font-[1000] text-slate-800 tracking-tighter mb-4 uppercase">
                            Service <span className="text-primary">Unavailable</span>
                        </h3>
                        <p className="text-slate-500 font-bold text-sm max-w-[280px] mb-8 leading-relaxed">
                            {settings?.appName || 'Our service'} is not available in your area yet. We're expanding fast!
                        </p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-black/10"
                        >
                            Try Refreshing
                        </button>
                    </div>
                ) : (
                    <div className="w-full flex-1 py-20 px-8 flex flex-col items-center justify-center text-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <Search size={40} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                            No Products Found
                        </h3>
                        <p className="text-slate-500 text-sm max-w-[280px]">
                            We couldn't find any products in this category at your current location.
                        </p>
                    </div>
                )
            ) : (
                <div>
                    {/* Horizontal Tabs */}
                    <div className="sticky top-14 z-40 bg-white border-b border-gray-100 shadow-sm px-4 py-2.5 flex overflow-x-auto hide-scrollbar gap-3 w-full">
                                {subCategories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedSubCategory(cat.id)}
                                        className={cn(
                                            "flex items-center px-5 py-2 rounded-xl whitespace-nowrap font-bold text-sm transition-all duration-200",
                                            selectedSubCategory === cat.id
                                                ? "bg-slate-800 text-white shadow-md shadow-slate-200 scale-[1.02]"
                                                : "bg-gray-100/80 text-gray-600 hover:bg-gray-200"
                                        )}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                    {/* Products Grid */}
                    <div className="pt-4 w-full h-[600px] md:h-[800px] flex flex-col">
                        <VirtuosoGrid
                            useWindowScroll
                            totalCount={safeProducts.length}
                            overscan={200}
                            endReached={loadMoreProducts}
                            listClassName="px-3 w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-8"
                            itemContent={(index) => {
                                const product = safeProducts[index];
                                return <ProductCard key={product.id || index} product={product} layout="grid" />;
                            }}
                        />
                    </div>
                    
                    {/* Loading indicator for pagination */}
                    {isFetchingMore && (
                        <div className="w-full flex justify-center py-6">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
            )}

            <MiniCart />
            <ProductDetailSheet />

            <style dangerouslySetInnerHTML={{
                __html: `
                    .hide-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .hide-scrollbar {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}} />
        </div>
    );
};

export default CategoryProductsPage;

