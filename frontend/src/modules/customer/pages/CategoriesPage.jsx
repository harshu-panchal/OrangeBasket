import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { customerApi } from '../services/customerApi';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';

const CategoriesPage = () => {
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

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

    return (
        <div className="min-h-screen bg-white pb-24 md:pt-[120px]">
            {/* Top Bar for Mobile */}
            <div className="flex items-center px-4 py-3 bg-white sticky top-0 z-10 md:hidden">
                <button onClick={() => navigate(-1)} className="p-1 -ml-1">
                    <ChevronLeft className="w-6 h-6 text-gray-800" />
                </button>
                <h1 className="flex-1 text-center text-[17px] font-bold text-gray-800 mr-6">Categories</h1>
            </div>

            <div className="max-w-[1280px] mx-auto pt-2 px-2 md:px-4">
                {/* Desktop Title */}
                <h1 className="hidden md:block text-2xl font-bold text-gray-800 mb-6 px-2">All Categories</h1>

                {isLoading && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-y-8 gap-x-2 p-2">
                        {[...Array(12)].map((_, j) => (
                            <div key={j} className="flex flex-col items-center gap-2">
                                <div className="w-[90px] h-[90px] bg-gray-100 rounded-xl animate-pulse" />
                                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                )}

                {!isLoading && categories.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="text-6xl mb-4">🛒</div>
                        <h2 className="text-xl font-bold text-gray-700 mb-2">No Categories Found</h2>
                        <p className="text-gray-400 text-sm">Add categories from the admin panel to see them here.</p>
                    </div>
                )}

                {!isLoading && categories.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-y-6 gap-x-2 py-4 px-2">
                        {categories.map((category) => (
                            <Link
                                key={category.id}
                                to={`/category/${category.id}`}
                                className="flex flex-col items-center group cursor-pointer"
                            >
                                <div className="w-[100px] h-[100px] md:w-[120px] md:h-[120px] mb-2 flex items-center justify-center bg-transparent transition-transform duration-300 group-hover:scale-105">
                                    <img
                                        src={applyCloudinaryTransform(category.image)}
                                        alt={category.name}
                                        loading="lazy"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <span className="text-center text-[13px] md:text-sm font-semibold text-gray-800 leading-snug px-2">
                                    {category.name}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CategoriesPage;
