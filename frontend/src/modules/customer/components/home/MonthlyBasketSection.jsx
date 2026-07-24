import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerApi } from '../../services/customerApi';
import { Sparkles, Package, ChevronRight } from 'lucide-react';
import ProductCard from '../shared/ProductCard';

const MonthlyBasketSection = () => {
    const [kitData, setKitData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchKits = async () => {
            try {
                const response = await customerApi.getKitHomeData();
                if (response?.data?.success) {
                    setKitData(response.data.result);
                }
            } catch (err) {
                console.error("Error fetching kit home data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchKits();
    }, []);

    if (loading) return null;
    if (!kitData || (!kitData.banners?.length && !kitData.categories?.length && !kitData.kits?.length)) {
        return null;
    }

    return (
        <div className="w-full py-6 my-4">
            <div className="container mx-auto px-4 md:px-8 lg:px-[50px]">
                
                {/* Section Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg shadow-orange-500/25">
                            <Package className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                                Monthly Baskets
                            </h2>
                            <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-orange-500" />
                                Subscribe & save on essentials
                            </p>
                        </div>
                    </div>
                    {kitData.kits?.length > 0 && (
                        <button 
                            onClick={() => navigate('/monthly-baskets')}
                            className="flex items-center gap-1 text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors"
                        >
                            View All <ChevronRight className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Banner Carousel */}
                {kitData.banners?.length > 0 && (
                    <div className="mb-6 overflow-x-auto no-scrollbar flex gap-3 snap-x snap-mandatory scroll-smooth -mx-4 px-4">
                        {kitData.banners.map((banner, idx) => (
                            <div 
                                key={idx} 
                                className="flex-shrink-0 w-[85%] md:w-[48%] lg:w-full rounded-2xl overflow-hidden shadow-md snap-start cursor-pointer group"
                            >
                                <img 
                                    src={banner.imageUrl} 
                                    alt={`Monthly Basket Banner ${idx + 1}`} 
                                    className="w-full h-40 md:h-52 lg:h-56 object-cover group-hover:scale-105 transition-transform duration-700" 
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Kit Categories */}
                {kitData.categories?.length > 0 && (
                    <div className="mb-6">
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 snap-x snap-mandatory scroll-smooth">
                            {kitData.categories.map((cat) => (
                                <div 
                                    key={cat._id} 
                                    onClick={() => navigate(`/monthly-baskets?category=${cat._id}`)}
                                    className="flex-shrink-0 snap-start cursor-pointer group"
                                >
                                    <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-white group-hover:shadow-lg group-hover:-translate-y-1 transition-all duration-300">
                                        {cat.image ? (
                                            <img 
                                                src={cat.image} 
                                                alt={cat.name} 
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
                                                <Package className="h-8 w-8 text-orange-400" />
                                            </div>
                                        )}
                                        {/* Gradient overlay for text readability */}
                                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
                                    </div>
                                    <p className="mt-2 text-center text-xs font-bold text-slate-700 truncate max-w-[96px] md:max-w-[112px]">
                                        {cat.name}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Kit Grid */}
                {kitData.kits?.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                        {kitData.kits.slice(0, 4).map((kit) => (
                            <ProductCard 
                                key={kit._id} 
                                product={kit} 
                                onClick={() => navigate(`/kit/${kit._id}`)}
                            />
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
};

export default MonthlyBasketSection;
