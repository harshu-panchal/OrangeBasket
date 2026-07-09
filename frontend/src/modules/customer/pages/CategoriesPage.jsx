import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { customerApi } from '../services/customerApi';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';

const COLORS = [
    "#F2EEE4", "#EFE7E2", "#EAF1F4", "#F0E8F2",
    "#EAF4EC", "#F5F1E6", "#EEF2F6", "#F2EEF5"
];

const CategoriesPage = () => {
    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [columnsPerRow, setColumnsPerRow] = useState(() => {
        if (typeof window === 'undefined') return 2;
        if (window.innerWidth >= 1024) return 6;
        if (window.innerWidth >= 768) return 4;
        return 2;
    });
    const [flippedCategoryId, setFlippedCategoryId] = useState(null);

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            // Try tree first
            const res = await customerApi.getCategories({ tree: true });
            if (res.data.success) {
                const tree = res.data.results || res.data.result || [];
                const formattedGroups = tree
                    .filter((header) => (header.name || '').trim().toLowerCase() !== 'all')
                    .map((header, idx) => {
                        const categories = (header.children || []).map((cat, cIdx) => ({
                            id: cat._id,
                            name: cat.name,
                            image: cat.image || "https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=270/layout-engine/2022-11/Slice-1_9.png",
                            color: COLORS[(idx + cIdx) % COLORS.length]
                        }));

                        return {
                            title: header.name,
                            categories,
                        };
                    })
                    .filter((group) => group.categories.length > 0);

                if (formattedGroups.length > 0) {
                    setGroups(formattedGroups);
                    return;
                }
            }

            // Fallback: use flat list, group categories by their parent header
            const flatRes = await customerApi.getCategories();
            if (flatRes.data.success) {
                const all = flatRes.data.results || flatRes.data.result || [];
                const headers = all.filter(c => c.type === 'header' && (c.name || '').trim().toLowerCase() !== 'all');
                const cats = all.filter(c => c.type === 'category');

                if (headers.length > 0 && cats.length > 0) {
                    const formattedGroups = headers.map((header, idx) => {
                        const headerCats = cats
                            .filter(c => String(c.parentId) === String(header._id))
                            .map((cat, cIdx) => ({
                                id: cat._id,
                                name: cat.name,
                                image: cat.image || "https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=270/layout-engine/2022-11/Slice-1_9.png",
                                color: COLORS[(idx + cIdx) % COLORS.length]
                            }));
                        return { title: header.name, categories: headerCats };
                    }).filter(g => g.categories.length > 0);

                    if (formattedGroups.length > 0) {
                        setGroups(formattedGroups);
                        return;
                    }
                }

                // Last resort: show all categories (type=category) as one group
                const allCats = cats.map((cat, idx) => ({
                    id: cat._id,
                    name: cat.name,
                    image: cat.image || "https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=270/layout-engine/2022-11/Slice-1_9.png",
                    color: COLORS[idx % COLORS.length]
                }));
                if (allCats.length > 0) {
                    setGroups([{ title: 'All Categories', categories: allCats }]);
                }
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

    useEffect(() => {
        const updateColumnsPerRow = () => {
            if (window.innerWidth >= 1024) setColumnsPerRow(6);
            else if (window.innerWidth >= 768) setColumnsPerRow(4);
            else setColumnsPerRow(2);
        };
        updateColumnsPerRow();
        window.addEventListener('resize', updateColumnsPerRow);
        return () => window.removeEventListener('resize', updateColumnsPerRow);
    }, []);

    const flipRows = useMemo(() => {
        const rows = [];
        groups.forEach((group, groupIndex) => {
            const cats = group.categories || [];
            const isLeftToRightGroup = groupIndex % 2 === 0;
            for (let rowStart = 0; rowStart < cats.length; rowStart += columnsPerRow) {
                const row = cats.slice(rowStart, rowStart + columnsPerRow);
                const rowSequence = isLeftToRightGroup ? row : [...row].reverse();
                const rowIds = rowSequence.map((category) => category.id).filter(Boolean);
                if (rowIds.length) rows.push(rowIds);
            }
        });
        return rows;
    }, [groups, columnsPerRow]);

    useEffect(() => {
        if (!flipRows.length) {
            setFlippedCategoryId(null);
            return;
        }

        let isCancelled = false;
        let activeTimer = null;
        let settleTimer = null;
        let rowCursor = 0;
        const itemCursorByRow = new Array(flipRows.length).fill(0);

        const FLIP_VISIBLE_MS = 620;
        const GAP_BETWEEN_FLIPS_MS = 220;

        const getNextFromRows = () => {
            const totalRows = flipRows.length;
            for (let tries = 0; tries < totalRows; tries += 1) {
                const rowIndex = (rowCursor + tries) % totalRows;
                const rowItems = flipRows[rowIndex] || [];
                if (!rowItems.length) continue;
                const itemIndex = itemCursorByRow[rowIndex] % rowItems.length;
                const nextId = rowItems[itemIndex];
                itemCursorByRow[rowIndex] = (itemIndex + 1) % rowItems.length;
                rowCursor = (rowIndex + 1) % totalRows; // alternate to next row
                return nextId;
            }
            return null;
        };

        const scheduleNextFlip = () => {
            if (isCancelled) return;
            activeTimer = setTimeout(() => {
                if (isCancelled) return;
                const nextId = getNextFromRows();
                if (!nextId) return;
                setFlippedCategoryId(nextId);

                settleTimer = setTimeout(() => {
                    if (isCancelled) return;
                    setFlippedCategoryId(null);
                    scheduleNextFlip();
                }, FLIP_VISIBLE_MS);
            }, GAP_BETWEEN_FLIPS_MS);
        };

        scheduleNextFlip();

        return () => {
            isCancelled = true;
            if (activeTimer) clearTimeout(activeTimer);
            if (settleTimer) clearTimeout(settleTimer);
        };
    }, [flipRows]);

    return (
        <div className="min-h-screen bg-white pt-[160px] md:pt-[200px]">
            <div className="max-w-[1280px] mx-auto px-4 pt-4 pb-24">

                {isLoading && (
                    <div className="flex flex-col gap-10">
                        {[1, 2, 3].map(i => (
                            <div key={i}>
                                <div className="h-7 w-48 bg-gray-100 rounded-xl mb-6 animate-pulse" />
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-5">
                                    {[...Array(6)].map((_, j) => (
                                        <div key={j} className="flex flex-col items-center gap-2">
                                            <div className="w-20 h-20 bg-gray-100 rounded-2xl animate-pulse" />
                                            <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!isLoading && groups.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="text-6xl mb-4">🛒</div>
                        <h2 className="text-xl font-bold text-gray-700 mb-2">No Categories Found</h2>
                        <p className="text-gray-400 text-sm">Add categories from the admin panel to see them here.</p>
                    </div>
                )}

                {!isLoading && groups.map((group, groupIdx) => (
                    <div key={groupIdx} className="mb-10">
                        <h2 className="text-xl md:text-2xl font-black text-[#1A1A1A] mb-6 px-1">
                            {group.title}
                        </h2>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-8 px-1">
                            {group.categories.map((category) => (
                                <Link
                                    key={category.id}
                                    to={`/category/${category.id}`}
                                    className="flex flex-col items-center group cursor-pointer"
                                >
                                    <div className="w-full aspect-square mb-2 flex items-center justify-center p-2 rounded-2xl bg-transparent">
                                        <img
                                            src={applyCloudinaryTransform(category.image)}
                                            alt={category.name}
                                            loading="lazy"
                                            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                                        />
                                    </div>
                                    <span className="text-center text-[11px] md:text-[13px] font-semibold text-gray-800 leading-tight">
                                        {category.name}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoriesPage;

