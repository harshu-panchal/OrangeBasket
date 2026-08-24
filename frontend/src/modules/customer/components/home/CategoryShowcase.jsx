import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';

const CategoryShowcase = ({ categoryMap, subcategoryMap }) => {
  const navigate = useNavigate();

  // Group subcategories by their parentId (main category id)
  const categoriesWithSubcategories = useMemo(() => {
    const mainCategories = Object.values(categoryMap).filter(cat => cat.type === 'category' && cat._id !== 'all' && cat.name?.toLowerCase() !== 'all');
    const subcategories = Object.values(subcategoryMap).filter(sub => sub.type === 'subcategory');

    return mainCategories.map(mainCat => {
      const children = subcategories.filter(sub => sub.parentId === mainCat._id);
      return {
        ...mainCat,
        children
      };
    }).filter(cat => cat.children.length > 0); // Only show categories that have subcategories
  }, [categoryMap, subcategoryMap]);

  if (categoriesWithSubcategories.length === 0) {
    return null;
  }

  const handleSubcategoryClick = (categoryId, subcategoryId) => {
    window.scrollTo(0, 0);
    navigate(`/category/${categoryId}`, { state: { activeSubcategoryId: subcategoryId } });
  };

  return (
    <div className="w-full bg-white pb-6">
      {categoriesWithSubcategories.map((category) => (
        <div key={category._id} className="mb-6">
          <div className="px-4 mb-3">
            <h3 className="text-[17px] font-bold text-slate-800 tracking-tight">
              {category.name}
            </h3>
          </div>
          
          <div className="px-4 grid grid-cols-4 gap-3 sm:gap-4">
            {category.children.map((sub) => (
              <div 
                key={sub._id} 
                onClick={() => handleSubcategoryClick(category._id, sub._id)}
                className="flex flex-col items-center gap-1.5 cursor-pointer group"
              >
                <div className="w-full aspect-[4/5] rounded-[14px] bg-[#eff6f5] flex items-center justify-center p-2 transition-all">
                  <img
                    src={applyCloudinaryTransform(sub.image || "https://cdn-icons-png.flaticon.com/128/2321/2321801.png")}
                    alt={sub.name}
                    loading="lazy"
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300 mix-blend-multiply"
                  />
                </div>
                <span className="text-[11px] font-semibold text-[#3e4152] text-center leading-[1.1] line-clamp-2 px-0.5">
                  {sub.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryShowcase;
