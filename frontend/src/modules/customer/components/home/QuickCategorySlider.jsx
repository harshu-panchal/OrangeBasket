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
          className="relative z-10 flex items-start gap-4 md:gap-5 overflow-x-auto no-scrollbar px-4 pb-3 pt-2 snap-x scroll-smooth">
          {categories.map((cat) => {
            return (
              <div
                key={cat.id}
                onClick={() => onCategoryClick(cat.id)}
                className="flex flex-col items-center gap-2 min-w-[70px] max-w-[76px] cursor-pointer group/item snap-start transition-all active:scale-95 text-center">
                {/* White Card Box Container */}
                <div
                  className="w-[66px] h-[66px] md:w-[80px] md:h-[80px] bg-white border border-slate-100 rounded-2xl flex items-center justify-center p-2.5 shadow-2xs transition-all duration-300 group-hover/item:-translate-y-1 group-hover/item:shadow-sm">
                  <img
                    src={applyCloudinaryTransform(cat.image, "f_auto,q_auto,w_120")}
                    alt={cat.name}
                    loading="lazy"
                    className="w-full h-full object-contain group-hover/item:scale-105 transition-transform duration-300"
                  />
                </div>
                {/* Label text */}
                <span className="block text-[11px] md:text-[13px] font-bold text-slate-700 leading-tight tracking-wide group-hover/item:text-[#FF8200] transition-colors line-clamp-2 max-w-[72px]">
                  {cat.name}
                </span>
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
