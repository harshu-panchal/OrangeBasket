import React, { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { QUICK_CATEGORY_PALETTES } from "../../constants/homeConstants";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import QuickCategoriesBg from "@/assets/Catagorysection_bg.png";

const QuickCategorySlider = ({ categories, onCategoryClick }) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!categories || categories.length === 0) return null;

  return (
    <div className="w-full mb-5 -mt-1 md:-mt-2 overflow-hidden relative group z-20 bg-transparent">
      <div className="relative overflow-hidden">        {/* Left Scroll Button */}
        <div className="absolute left-4 lg:left-10 top-[58%] -translate-y-1/2 z-20 hidden md:flex">
          <button
            onClick={() => scroll("left")}
            className="h-10 w-10 bg-white/90 backdrop-blur-md shadow-xl rounded-full flex items-center justify-center border border-gray-100 cursor-pointer hover:bg-white text-primary transition-all active:scale-90">
            <ChevronLeft size={22} strokeWidth={3} />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="relative z-10 flex items-start gap-2 md:gap-3 lg:gap-4 overflow-x-auto no-scrollbar px-4 pb-2 pt-1 md:px-8 md:pb-4 snap-x scroll-smooth">
          {categories.map((cat, idx) => {
            const palette = QUICK_CATEGORY_PALETTES[idx % QUICK_CATEGORY_PALETTES.length];
            return (
              <div
                key={cat.id}
                onClick={() => onCategoryClick(cat.id)}
                className="flex flex-col items-center gap-1.5 min-w-[100px] md:min-w-[120px] cursor-pointer group/item snap-start transition-transform active:scale-95">
                <div
                  className="relative w-[100px] h-[100px] md:w-[120px] md:h-[120px] bg-transparent flex items-center justify-center transition-all duration-300 group-hover/item:-translate-y-1">
                  <img
                    src={applyCloudinaryTransform(cat.image, "f_auto,q_auto,w_150")}
                    alt={cat.name}
                    loading="lazy"
                    className="w-full h-full object-contain drop-shadow-sm mix-blend-multiply group-hover/item:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="text-center w-full px-0.5 mt-1">
                  <span className="block text-[13px] md:text-[15px] font-extrabold text-[#1f2b20] leading-tight whitespace-nowrap overflow-hidden text-ellipsis group-hover/item:text-primary transition-colors">
                    {cat.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Scroll Button */}
        <div className="absolute right-4 lg:right-10 top-[58%] -translate-y-1/2 z-20 hidden md:flex">
          <button
            onClick={() => scroll("right")}
            className="h-10 w-10 bg-white/90 backdrop-blur-md shadow-xl rounded-full flex items-center justify-center border border-gray-100 cursor-pointer hover:bg-white text-primary transition-all active:scale-90">
            <ChevronRight size={22} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(QuickCategorySlider);
