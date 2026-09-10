import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation as useRouterLocation } from 'react-router-dom';
import { Search, Mic, ArrowLeft, X, TrendingUp, ChevronRight, History, SlidersHorizontal, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { customerApi } from '../services/customerApi';
import ProductCard from '../components/shared/ProductCard';
import { useProductDetail } from '../context/ProductDetailContext';
import { useSettings } from '@core/context/SettingsContext';
import { cn } from '@/lib/utils';
import { useLocation as useAppLocation } from '../context/LocationContext';
import { getJSON, setJSON, STORAGE_KEYS } from '@core/utils/storage';
import Lottie from 'lottie-react';

const SearchPage = () => {
    const navigate = useNavigate();
    const location = useRouterLocation();
    const { isOpen: isProductDetailOpen } = useProductDetail();
    const { settings } = useSettings();
    const { currentLocation } = useAppLocation();
    const appName = settings?.appName || 'App';

    const initialQuery = location.state?.query || new URLSearchParams(location.search).get('q') || '';

    const [query, setQuery] = useState(initialQuery);
    const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
    
    // Search Pagination & State
    const [searchResults, setSearchResults] = useState([]);
    const [searchPage, setSearchPage] = useState(1);
    const [hasMoreSearch, setHasMoreSearch] = useState(false);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    
    // Lowest Price Section State
    const [lowestPriceProducts, setLowestPriceProducts] = useState([]);
    const [isLowestPriceLoading, setIsLowestPriceLoading] = useState(false);

    // Filter & Sort State
    const [sort, setSort] = useState('relevance');
    const [inStockOnly, setInStockOnly] = useState(false);
    const [brand, setBrand] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Suggestions State
    const [suggestions, setSuggestions] = useState({ products: [], categories: [], brands: [] });
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);

    const [isListening, setIsListening] = useState(false);
    const [noServiceData, setNoServiceData] = useState(null);

    // Manage Recent Searches with LocalStorage
    const [pastSearches, setPastSearches] = useState(() => {
        const saved = getJSON(STORAGE_KEYS.RECENT_SEARCHES, []);
        return Array.isArray(saved) ? saved.filter((s) => typeof s === 'string') : [];
    });

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Debounce Logic & Reset
    useEffect(() => {
        // Clear results immediately when user starts typing a new query
        if (query !== debouncedQuery) {
            setSearchResults([]);
            setSearchPage(1);
            setHasMoreSearch(false);
        }
        
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
            setShowSuggestions(false);
        }, 400);
        return () => clearTimeout(timer);
    }, [query, debouncedQuery]);

    // Filter changes reset pagination
    useEffect(() => {
        setSearchResults([]);
        setSearchPage(1);
        setHasMoreSearch(false);
    }, [sort, inStockOnly, brand, minPrice, maxPrice]);

    // Fetch Suggestions
    useEffect(() => {
        if (!query.trim() || query.trim().length < 2) {
            setSuggestions({ products: [], categories: [], brands: [] });
            return;
        }

        const fetchSuggestions = async () => {
            const hasValidLocation =
                Number.isFinite(currentLocation?.latitude) &&
                Number.isFinite(currentLocation?.longitude);
            if (!hasValidLocation) return;

            setIsSuggestionsLoading(true);
            try {
                const params = {
                    search: query.trim(),
                    lat: currentLocation.latitude,
                    lng: currentLocation.longitude,
                };
                const response = await customerApi.getSearchSuggestions(params);
                if (response.data.success) {
                    setSuggestions(response.data.result);
                }
            } catch (error) {
                console.error("Error fetching suggestions:", error);
            } finally {
                setIsSuggestionsLoading(false);
            }
        };

        const timer = setTimeout(() => {
            fetchSuggestions();
        }, 200);

        return () => clearTimeout(timer);
    }, [query, currentLocation?.latitude, currentLocation?.longitude]);

    // Voice Search Logic (Enhanced)
    const handleVoiceSearch = () => {
        const SpeechRecognition = window.SpeechRecognition || window['webkitSpeechRecognition'];
        if (!SpeechRecognition) {
            alert('Voice search is not supported in your browser. Please try Chrome.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
            setIsListening(true);
            setQuery(''); // Clear previous search if starting fresh
        };

        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }

            if (transcript) {
                setQuery(transcript);
                // Save to history only if it's the final result
                if (event.results[event.results.length - 1].isFinal) {
                    saveSearch(transcript);
                }
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            if (event.error === 'not-allowed') {
                alert('Microphone access denied. Please enable it in your browser settings.');
            } else {
                console.warn('Voice recognition stopped due to error:', event.error);
            }
        };

        try {
            recognition.start();
        } catch (e) {
            console.error('Recognition start error:', e);
            setIsListening(false);
        }
    };

    // Intersection Observer for Infinite Scroll
    const observer = React.useRef(null);
    const lastProductElementRef = React.useCallback(node => {
        if (isSearchLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMoreSearch) {
                setSearchPage(prev => prev + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [isSearchLoading, hasMoreSearch]);

    // Fetch Search Results
    useEffect(() => {
        if (!debouncedQuery.trim()) return;

        const fetchSearchResults = async () => {
            const hasValidLocation =
                Number.isFinite(currentLocation?.latitude) &&
                Number.isFinite(currentLocation?.longitude);
            if (!hasValidLocation) return;

            setIsSearchLoading(true);
            try {
                const params = {
                    limit: 24, // Infinite scroll page size
                    page: searchPage,
                    lat: currentLocation.latitude,
                    lng: currentLocation.longitude,
                    search: debouncedQuery.trim(),
                    sort: sort
                };
                if (inStockOnly) params.inStockOnly = true;
                if (brand) params.brand = brand;
                if (minPrice) params.minPrice = minPrice;
                if (maxPrice) params.maxPrice = maxPrice;

                const response = await customerApi.getProducts(params);
                if (response.data.success) {
                    const rawResult = response.data.result;
                    const dbProds = Array.isArray(response.data.results)
                        ? response.data.results
                        : Array.isArray(rawResult?.items)
                            ? rawResult.items
                            : Array.isArray(rawResult)
                                ? rawResult
                                : [];
                    const formattedProds = dbProds.map(p => ({
                        ...p,
                        id: p._id,
                        image: p.mainImage || p.image || "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400&h=400",
                        price: p.salePrice || p.price,
                        originalPrice: p.price,
                        weight: p.weight || '1 unit',
                        deliveryTime: '8-15 mins'
                    }));
                    
                    setSearchResults(prev => searchPage === 1 ? formattedProds : [...prev, ...formattedProds]);
                    
                    const totalPages = rawResult?.totalPages || 1;
                    setHasMoreSearch(searchPage < totalPages);
                }
            } catch (error) {
                console.error('Error fetching search results:', error);
            } finally {
                setIsSearchLoading(false);
            }
        };
        fetchSearchResults();
    }, [currentLocation?.latitude, currentLocation?.longitude, debouncedQuery, searchPage, sort, inStockOnly, brand, minPrice, maxPrice]);

    // Fetch Lowest Price Products (Only when no query is present)
    useEffect(() => {
        if (lowestPriceProducts.length > 0 || query.trim() || debouncedQuery.trim()) return;

        const fetchLowestPrice = async () => {
            const hasValidLocation =
                Number.isFinite(currentLocation?.latitude) &&
                Number.isFinite(currentLocation?.longitude);
            if (!hasValidLocation) return;

            setIsLowestPriceLoading(true);
            try {
                const params = {
                    limit: 10,
                    sort: 'price-asc',
                    lat: currentLocation.latitude,
                    lng: currentLocation.longitude,
                };
                const response = await customerApi.getProducts(params);
                if (response.data.success) {
                    const rawResult = response.data.result;
                    const dbProds = Array.isArray(response.data.results)
                        ? response.data.results
                        : Array.isArray(rawResult?.items)
                            ? rawResult.items
                            : Array.isArray(rawResult)
                                ? rawResult
                                : [];
                    const formattedProds = dbProds.map(p => ({
                        ...p,
                        id: p._id,
                        image: p.mainImage || p.image || "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=400&h=400",
                        price: p.salePrice || p.price,
                        originalPrice: p.price,
                        weight: p.weight || '1 unit',
                        deliveryTime: '8-15 mins'
                    }));
                    setLowestPriceProducts(formattedProds);
                }
            } catch (error) {
                console.error('Error fetching lowest price products:', error);
            } finally {
                setIsLowestPriceLoading(false);
            }
        };
        fetchLowestPrice();
    }, [currentLocation?.latitude, currentLocation?.longitude, query, debouncedQuery, lowestPriceProducts.length]);

    // Save search term to history
    const saveSearch = (term) => {
        if (!term.trim()) return;
        const updated = [term, ...pastSearches.filter(s => s !== term)].slice(0, 10);
        setPastSearches(updated);
        setJSON(STORAGE_KEYS.RECENT_SEARCHES, updated);
    };

    // Remove specific search term
    const handleRemoveSearch = (e, term) => {
        e.stopPropagation();
        const updated = pastSearches.filter(s => s !== term);
        setPastSearches(updated);
        setJSON(STORAGE_KEYS.RECENT_SEARCHES, updated);
    };

    // Trigger save on Enter or clicking a result
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && query.trim()) {
            saveSearch(query);
        }
    };

    const handleClear = () => {
        setQuery('');
        setSearchResults([]);
        setSearchPage(1);
    };

    return (
        <div className="min-h-screen bg-white font-outfit">
            {/* Header / Search Input */}
            <div className={cn(
                "sticky top-0 z-50 bg-linear-to-r from-primary to-[var(--brand-400)] shadow-[0_4px_20px_rgba(0,0,0,0.12)] relative overflow-hidden",
                isProductDetailOpen && "hidden md:block"
            )}>
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 blur-xl pointer-events-none" />

                <div className="px-4 pt-5 pb-6 flex items-center md:justify-center gap-3 relative z-10">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-md border border-white/10 transition-all flex-shrink-0 shadow-sm active:scale-90"
                    >
                        <ArrowLeft size={22} strokeWidth={2.5} />
                    </button>

                    <div className="flex-1 relative md:flex-none md:w-[500px] lg:w-[600px]">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                            <Search size={18} strokeWidth={3} className="text-slate-400" />
                        </div>
                        <input
                            autoFocus
                            type="text"
                            placeholder='Search items, categories...'
                            value={query}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setShowSuggestions(true)}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setShowSuggestions(true);
                            }}
                            className="w-full h-12 bg-white rounded-2xl pl-11 pr-14 shadow-xl shadow-black/10 border-none outline-none text-slate-800 font-bold placeholder:text-slate-400 placeholder:font-medium focus:ring-4 focus:ring-white/20 transition-all"
                        />

                        {/* Integrated Actions inside Search Input */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1">
                            {query && (
                                <button
                                    onClick={handleClear}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                                >
                                    <X size={12} strokeWidth={3} className="text-slate-600" />
                                </button>
                            )}
                            <div className="w-[1px] h-6 bg-slate-100 mx-1" />
                            <button
                                onClick={handleVoiceSearch}
                                className={cn(
                                    "p-2 transition-all rounded-full relative",
                                    isListening ? "text-red-500 bg-red-50 scale-110" : "text-slate-400 hover:text-primary hover:bg-slate-50"
                                )}
                            >
                                <Mic size={20} strokeWidth={2.5} className={cn(isListening && "animate-pulse")} />
                                {isListening && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                )}
                            </button>
                        </div>

                        {/* Live Suggestions Dropdown */}
                        <AnimatePresence>
                            {showSuggestions && query.trim().length >= 2 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 max-h-[60vh] overflow-y-auto"
                                >
                                    {isSuggestionsLoading ? (
                                        <div className="p-4 text-center text-slate-400 font-medium">Searching...</div>
                                    ) : (
                                        <div className="p-2 space-y-4">
                                            {suggestions.categories?.length > 0 && (
                                                <div>
                                                    <div className="text-xs font-black text-slate-400 uppercase tracking-wider px-3 mb-2">Categories</div>
                                                    {suggestions.categories.map(cat => (
                                                        <div 
                                                            key={cat.id} 
                                                            className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                                                            onClick={() => { setQuery(cat.name); setShowSuggestions(false); }}
                                                        >
                                                            <Search size={14} className="text-slate-400" />
                                                            <span className="font-bold text-slate-700">{cat.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {suggestions.brands?.length > 0 && (
                                                <div>
                                                    <div className="text-xs font-black text-slate-400 uppercase tracking-wider px-3 mb-2">Brands</div>
                                                    <div className="flex flex-wrap gap-2 px-3">
                                                        {suggestions.brands.map(b => (
                                                            <div 
                                                                key={b} 
                                                                className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600 cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                                                                onClick={() => { setQuery(b); setShowSuggestions(false); }}
                                                            >
                                                                {b}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {suggestions.products?.length > 0 && (
                                                <div>
                                                    <div className="text-xs font-black text-slate-400 uppercase tracking-wider px-3 mb-2">Products</div>
                                                    {suggestions.products.map(prod => (
                                                        <div 
                                                            key={prod.id} 
                                                            className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                                                            onClick={() => { setQuery(prod.name); setShowSuggestions(false); }}
                                                        >
                                                            <img src={prod.image} alt={prod.name} className="w-10 h-10 object-contain rounded-md bg-white border border-slate-100" />
                                                            <div>
                                                                <div className="font-bold text-slate-800 text-sm">{prod.name}</div>
                                                                <div className="font-semibold text-slate-500 text-xs">₹{prod.price}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {!suggestions.products?.length && !suggestions.categories?.length && !suggestions.brands?.length && (
                                                <div className="p-4 text-center text-slate-500 font-medium">No direct matches found</div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <div className="p-5 space-y-10 pb-24 max-w-7xl mx-auto">
                {/* Search Results List */}
                {query ? (
                    <div className="flex flex-col md:flex-row gap-6 relative">
                        {/* Filters Sidebar (Desktop) */}
                        <div className={cn(
                            "w-full md:w-64 shrink-0 space-y-6 md:block",
                            showFilters ? "block" : "hidden"
                        )}>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm sticky top-24">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-black text-slate-800">Filters</h3>
                                    {isMobile && <button onClick={() => setShowFilters(false)}><X size={18} className="text-slate-500" /></button>}
                                </div>
                                
                                {/* Availability Filter */}
                                <div className="mb-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={inStockOnly} 
                                            onChange={(e) => setInStockOnly(e.target.checked)}
                                            className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                                        />
                                        <span className="font-bold text-slate-700 text-sm">In Stock Only</span>
                                    </label>
                                </div>

                                {/* Price Filter */}
                                <div className="mb-6">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Price Range</h4>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            placeholder="Min" 
                                            value={minPrice} 
                                            onChange={(e) => setMinPrice(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                                        />
                                        <span className="text-slate-400">-</span>
                                        <input 
                                            type="number" 
                                            placeholder="Max" 
                                            value={maxPrice} 
                                            onChange={(e) => setMaxPrice(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>

                                {/* Brand Filter */}
                                <div>
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Brand</h4>
                                    <input 
                                        type="text" 
                                        placeholder="Search brand..." 
                                        value={brand} 
                                        onChange={(e) => setBrand(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                                    />
                                </div>
                                
                                {(brand || minPrice || maxPrice || inStockOnly) && (
                                    <button 
                                        onClick={() => { setBrand(''); setMinPrice(''); setMaxPrice(''); setInStockOnly(false); }}
                                        className="w-full mt-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-600 text-sm transition-colors"
                                    >
                                        Clear Filters
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Main Results Grid */}
                        <section className="flex-1 min-w-0">
                            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                        Search Results
                                    </h2>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{searchResults.length} found</span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <button 
                                        className="md:hidden p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600"
                                        onClick={() => setShowFilters(!showFilters)}
                                    >
                                        <Filter size={18} />
                                    </button>
                                    <select 
                                        value={sort}
                                        onChange={(e) => setSort(e.target.value)}
                                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none"
                                        style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em', paddingRight: '2.5rem' }}
                                    >
                                        <option value="relevance">Relevance</option>
                                        <option value="popular">Popularity</option>
                                        <option value="price-asc">Price: Low to High</option>
                                        <option value="price-desc">Price: High to Low</option>
                                        <option value="discount">Better Discount</option>
                                    </select>
                                </div>
                            </div>

                        {isSearchLoading && searchResults.length === 0 || debouncedQuery !== query ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-3 md:gap-x-4 gap-y-6 md:gap-y-10">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="w-full h-64 bg-slate-50/50 border border-slate-100 rounded-3xl animate-pulse flex flex-col p-3">
                                        <div className="w-full aspect-square bg-slate-100/50 rounded-2xl mb-4" />
                                        <div className="h-4 bg-slate-100/50 rounded-md w-3/4 mb-2" />
                                        <div className="h-3 bg-slate-100/50 rounded-md w-1/2" />
                                    </div>
                                ))}
                            </div>
                        ) : searchResults.length > 0 ? (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-3 md:gap-x-4 gap-y-6 md:gap-y-10">
                                    {searchResults.map((product, index) => (
                                        <div 
                                            key={product.id} 
                                            onClick={() => saveSearch(query)} 
                                            className="h-full w-full"
                                            ref={index === searchResults.length - 1 ? lastProductElementRef : null}
                                        >
                                            <ProductCard product={product} compact={isMobile} className="w-full" />
                                        </div>
                                    ))}
                                </div>
                                {isSearchLoading && searchResults.length > 0 && (
                                    <div className="flex justify-center pt-8 pb-4">
                                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-16 flex flex-col items-center text-center">
                                <div className="w-48 h-48 md:w-64 md:h-64 mb-6">
                                    {noServiceData ? (
                                        <Lottie animationData={noServiceData} loop={true} />
                                    ) : (
                                        <div className="w-48 h-48 md:w-64 md:h-64" />
                                    )}
                                </div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">No items found</h3>
                                <p className="text-slate-500 font-medium max-w-xs">We couldn't find anything for "{query}". Try different keywords!</p>
                            </div>
                        )}
                    </section>
                    </div>
                ) : (
                    <>
                        {/* 1. Recently Searched Item Section */}
                        {pastSearches.length > 0 && (
                            <section>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Recently Searched</h3>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                    {pastSearches.map((term) => (
                                        <div
                                            key={term}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 shadow-sm rounded-full whitespace-nowrap active:scale-95 transition-transform cursor-pointer"
                                            onClick={() => setQuery(term)}
                                        >
                                            <div className="h-5 w-5 rounded flex items-center justify-center" style={{ backgroundColor: (settings?.primaryColor || 'var(--primary)') + '20' }}>
                                                <History size={12} style={{ color: settings?.primaryColor || 'var(--primary)' }} />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">{term}</span>
                                            <button
                                                onClick={(e) => handleRemoveSearch(e, term)}
                                                className="ml-1 p-0.5 hover:bg-slate-100 rounded-full transition-colors"
                                            >
                                                <X size={12} className="text-slate-400 hover:text-red-500" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* 2. Lowest Price Ever Section */}
                        <section>
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Lowest Price Ever!</h2>
                                <button
                                    className="flex items-center gap-1 md:gap-1.5 px-3 py-1 md:px-4 md:py-1.5 bg-slate-50 hover:bg-slate-100 rounded-full text-xs md:text-sm font-black transition-all"
                                    style={{ color: settings?.primaryColor || 'var(--primary)' }}
                                    onClick={() => navigate('/category/all')}
                                >
                                    See All <ChevronRight size={14} strokeWidth={3} />
                                </button>
                            </div>
                            <div className="flex gap-2 md:gap-4 overflow-x-auto no-scrollbar -mx-5 px-5 pb-3 snap-x">
                                {isLowestPriceLoading && lowestPriceProducts.length === 0 ? (
                                    [...Array(4)].map((_, i) => (
                                        <div key={i} className="min-w-[126px] sm:min-w-[136px] md:min-w-[148px] h-52 md:h-64 bg-slate-50 rounded-2xl animate-pulse" />
                                    ))
                                ) : lowestPriceProducts.map((product) => (
                                    <div key={product.id} className="min-w-[126px] sm:min-w-[136px] md:min-w-[148px] snap-start h-full">
                                        <ProductCard product={product} compact={isMobile} className="h-full w-full" />
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default SearchPage;

