import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';

const BestsellersSection = ({ config, categoryMap, subcategoryMap }) => {
  const navigate = useNavigate();

  // Process the config to get main categories and their first 4 subcategories
  const displayItems = useMemo(() => {
    if (!config || !config.mainCategoryIds || config.mainCategoryIds.length === 0) return [];
    if (!categoryMap || !subcategoryMap) return [];

    const items = [];
    const allSubcategories = Object.values(subcategoryMap);

    config.mainCategoryIds.forEach(mainId => {
      const mainIdStr = String(mainId?._id || mainId);
      const mainCat = categoryMap[mainIdStr];
      if (!mainCat) return;

      const children = allSubcategories.filter(sub => 
        String(sub.parentId) === mainIdStr || 
        String(sub.parentId?._id) === mainIdStr
      );

      let top4 = children.slice(0, 4);
      let remainingCount = Math.max(0, children.length - 4);

      if (top4.length === 0) {
        top4 = [mainCat];
        remainingCount = 0;
      }

      items.push({
        mainCat,
        top4,
        remainingCount,
        // Calculate a random looking "more" count if they want it to match the screenshot exactly (+182 more, etc.)
        // But accurate remaining count is better. Let's use the actual remaining count, unless they want fake numbers.
        // The screenshot shows "+182 more" which means it's likely counting products, not just subcategories.
        // We don't have product count per subcategory synchronously available here, so we will show the exact subcategory remaining count, or if it's 0, we can hide the badge, or just use a placeholder text if they want.
        // We'll show `+${remainingCount} more` if remaining > 0.
      });
    });

    return items;
  }, [config, categoryMap, subcategoryMap]);

  if (displayItems.length === 0) return null;

  const handleCardClick = (categoryId) => {
    window.scrollTo(0, 0);
    navigate(`/category/${categoryId}`);
  };

  return (
    <div className="w-full bg-white pb-6 pt-4">
      <div className="px-4 mb-3">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
          Bestsellers
        </h2>
      </div>

      <div className="px-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {displayItems.map((item, index) => (
          <div
            key={item.mainCat._id || index}
            onClick={() => handleCardClick(item.mainCat._id)}
            className="flex flex-col items-center cursor-pointer group"
          >
            <div className="w-full relative rounded-2xl bg-[#f4f6f8] p-3 pb-8 flex flex-col transition-all group-hover:shadow-md">
              <div className="grid grid-cols-2 gap-2 aspect-square">
                {item.top4.map((sub, i) => (
                  <div key={sub._id || i} className="bg-white rounded-lg p-1 flex items-center justify-center overflow-hidden shadow-sm">
                    <img
                      src={applyCloudinaryTransform(sub.image || "https://cdn-icons-png.flaticon.com/128/2321/2321801.png", { width: 100 })}
                      alt={sub.name}
                      loading="lazy"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 mix-blend-multiply"
                    />
                  </div>
                ))}
              </div>
              
              {/* Floating Pill Badge */}
              {item.remainingCount > 0 && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white border border-gray-100 shadow-sm rounded-full px-3 py-0.5 z-10 whitespace-nowrap">
                  <span className="text-[10px] font-semibold text-slate-500">
                    +{item.remainingCount} more
                  </span>
                </div>
              )}
            </div>
            
            <div className="mt-5 text-center px-1">
              <span className="text-[13px] font-bold text-[#3e4152] leading-[1.2] line-clamp-2">
                {item.mainCat.name}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BestsellersSection;
