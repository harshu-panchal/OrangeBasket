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
    const [products, setProducts] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [queryKey, setQueryKey] = useState(null);

    const [isLoading, setIsLoading] = useState(true);
    const [noServiceData, setNoServiceData] = useState(null);
    const [serviceUnavailable, setServiceUnavailable] = useState(false);

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

    // Reset pagination when subcategory changes
    useEffect(() => {
        setPage(1);
        setProducts([]);
        setHasMore(false);
    }, [selectedSubCategory, catId]);

    // 2. Fetch Products with Pagination
    useEffect(() => {
        if (!queryKey) return; // Wait for tree

        let mounted = true;
        const fetchProducts = async () => {
            const hasValidLocation =
                Number.isFinite(currentLocation?.latitude) &&
                Number.isFinite(currentLocation?.longitude);

            if (!hasValidLocation) {
                if (mounted) {
                    setProducts([]);
                    setServiceUnavailable(true);
                    setIsLoading(false);
                }
                return;
            }

            if (page === 1) setIsLoading(true);
            else setIsFetchingMore(true);

            try {
                const params = {
                    limit: 24,
                    page: page,
                    lat: currentLocation.latitude,
                    lng: currentLocation.longitude,
                };
                
                if (selectedSubCategory !== 'all') {
                    params.subcategoryId = selectedSubCategory;
                } else {
                    params[queryKey] = catId;
                }

                const prodRes = await customerApi.getProducts(params);
                if (!mounted) return;

                if (prodRes.data.success) {
                    const rawResult = prodRes.data.result;
                    const dbProds = Array.isArray(prodRes.data.results)
                        ? prodRes.data.results
                        : Array.isArray(rawResult?.items)
                        ? rawResult.items
                        : Array.isArray(rawResult)
                        ? rawResult
                        : [];

                    const formattedProds = dbProds.map(p => ({
                        ...p,
                        id: p._id || p.id,
                        image: p.mainImage || p.image || "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400&h=400",
                        price: p.salePrice || p.price,
                        originalPrice: p.price,
                        weight: p.weight || "1 unit",
                        deliveryTime: "8-15 mins"
                    }));

                    setProducts(prev => page === 1 ? formattedProds : [...prev, ...formattedProds]);
                    
                    const totalPages = rawResult?.totalPages || 1;
                    setHasMore(page < totalPages);
                    setServiceUnavailable(prodRes.data.message === "No products available in your area");
                } else {
                    if (page === 1) setProducts([]);
                    setHasMore(false);
                    setServiceUnavailable(false);
                }
            } catch (error) {
                console.error("Error fetching products:", error);
            } finally {
                if (mounted) {
                    setIsLoading(false);
                    setIsFetchingMore(false);
                }
            }
        };

        fetchProducts();
        return () => { mounted = false; };
    }, [catId, queryKey, selectedSubCategory, page, currentLocation?.latitude, currentLocation?.longitude]);

    // Intersection Observer for Infinite Scroll
    const observer = React.useRef();
    const lastProductElementRef = React.useCallback(node => {
        if (isLoading || isFetchingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => prev + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, isFetchingMore, hasMore]);

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
                            onClick={fetchData}
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
                    <div className="px-3 pt-4 w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {safeProducts.map((product, index) => {
                            if (safeProducts.length === index + 1) {
                                return (
                                    <div ref={lastProductElementRef} key={product.id}>
                                        <ProductCard product={product} layout="grid" />
                                    </div>
                                );
                            } else {
                                return <ProductCard key={product.id} product={product} layout="grid" />;
                            }
                        })}
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

