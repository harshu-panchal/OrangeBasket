import React from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { HiOutlineChevronRight } from "react-icons/hi2";

const SparkleStar = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
  </svg>
);

const BentoCard = ({ item, colSpan, rowSpan, onClick }) => {
  const isLarge = item.cardSize === "large_vertical";
  const isStrip = item.cardSize === "strip";
  
  if (isStrip) {
    return (
      <div 
        onClick={onClick}
        style={item.bgColor ? { background: item.bgColor } : undefined}
        className={cn(
          colSpan, rowSpan,
          "flex flex-row items-center justify-between p-2 md:p-4 rounded-[12px] cursor-pointer hover:shadow-lg transition-all",
          !item.bgColor && "bg-gradient-to-r from-[#c6a394] to-[#bca092]"
        )}
      >
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          {item.imageUrl && (
            <img src={item.imageUrl} alt="" className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-sm shrink-0" />
          )}
          <div className="flex flex-col min-w-0">
            <span 
              style={item.textColor ? { color: item.textColor } : undefined} 
              className="text-white font-black text-[10px] md:text-sm uppercase leading-tight truncate"
            >
              {item.ctaText}
            </span>
            {item.icon && (
              <span 
                style={item.textColor ? { color: item.textColor, opacity: 0.9 } : undefined} 
                className="text-white/90 text-[9px] md:text-xs font-semibold truncate"
              >
                {item.icon}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 ml-1">
          <HiOutlineChevronRight className="w-4 h-4 md:w-5 md:h-5 text-white/80" />
        </div>
      </div>
    );
  }

  const hasImage = Boolean(item.imageUrl);

  return (
    <div 
      onClick={onClick}
      style={item.bgColor ? { background: item.bgColor } : undefined}
      className={cn(
        "relative rounded-[16px] overflow-hidden cursor-pointer group hover:shadow-xl transition-all duration-300 w-full h-full flex flex-col",
        colSpan, rowSpan,
        isLarge ? "justify-between" : (hasImage ? "aspect-square" : "aspect-square justify-center items-center p-3 text-center"),
        !item.bgColor && "bg-gradient-to-br from-[#f1e5df] to-[#dfceb9]"
      )}
    >
      {/* Badge */}
      {!isLarge && (item.discountPrefix || item.discountBadge) && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center z-20 shadow-sm">
          {item.discountPrefix ? (
            <>
              <span 
                style={item.prefixBgColor ? { backgroundColor: item.prefixBgColor } : undefined}
                className="bg-[#3d3d3d] text-white text-[8px] md:text-[9px] font-bold px-1.5 md:px-2 py-0.5 rounded-bl-md tracking-wider"
              >
                {item.discountPrefix}
              </span>
              <span 
                style={item.badgeBgColor ? { backgroundColor: item.badgeBgColor } : undefined}
                className="bg-[#ba9686] text-white text-[8px] md:text-[9px] font-bold px-1.5 md:px-2 py-0.5 rounded-br-md tracking-wider"
              >
                {item.discountBadge || ""}
              </span>
            </>
          ) : item.discountBadge ? (
            <span 
              style={item.badgeBgColor ? { backgroundColor: item.badgeBgColor } : undefined}
              className="bg-[#3d3d3d] text-white text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-b-md"
            >
              {item.discountBadge}
            </span>
          ) : null}
        </div>
      )}

      {/* Content */}
      <div className={cn(
        "relative z-10 flex flex-col items-center text-center px-1 md:px-3 w-full",
        isLarge ? "pt-5 md:pt-6" : (hasImage ? "pt-4 md:pt-5 h-[45%] overflow-hidden" : "pt-4 flex-1 justify-center")
      )}>
        {item.subtitle && (
          <h4 
            style={item.textColor ? { color: item.textColor } : undefined}
            className={cn(
              "font-bold uppercase tracking-wider mb-1 text-[#692934]",
              isLarge ? "text-[12px] md:text-sm tracking-widest" : "text-[10px] md:text-xs"
            )}
          >
            {item.subtitle}
          </h4>
        )}
        
        {isLarge && (item.originalPrice || item.offerPrice) ? (
          <div className="flex flex-col items-center mt-1 mb-2">
            {item.originalPrice > 0 && (
              <span className="bg-[#3d3d3d] text-white text-[11px] font-bold px-5 py-1.5 rounded-[10px] shadow-sm tracking-wide line-through relative z-0">
                ₹{item.originalPrice}
              </span>
            )}
            {item.offerPrice > 0 && (
              <span className="bg-[#ba9686] text-white text-[16px] md:text-[18px] font-black px-6 py-1 rounded-[14px] shadow-md -mt-2 z-10 relative">
                ₹{item.offerPrice}
              </span>
            )}
          </div>
        ) : null}

        {item.title && (
          <h3 
            style={item.textColor ? { color: item.textColor } : undefined}
            className={cn(
              "font-black text-slate-800 leading-tight mb-1",
              isLarge ? "text-sm md:text-base mt-1" : (hasImage ? "text-xs md:text-sm" : "text-sm md:text-base text-[#692934]")
            )}
          >
            {item.title}
          </h3>
        )}

        {/* Bright Sparkle Stars for text-only cards */}
        {!hasImage && !isLarge && (
          <div className="flex items-center justify-center gap-1.5 mt-2 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.95)]">
            <SparkleStar className="w-2.5 h-2.5 text-white/90" />
            <SparkleStar className="w-4 h-4 text-white" />
            <SparkleStar className="w-2.5 h-2.5 text-white/90" />
          </div>
        )}
      </div>

      {/* Image */}
      {hasImage && (
        <div className={cn("z-0 w-full flex items-end justify-center p-1", isLarge ? "relative flex-1 mt-2" : "absolute inset-x-0 bottom-0 h-[55%]")}>
          <img 
            src={item.imageUrl} 
            alt={item.title || "Deal"} 
            className="max-w-full max-h-full object-contain object-bottom group-hover:scale-105 transition-transform duration-500 drop-shadow-sm"
          />
        </div>
      )}
    </div>
  );
};

export default function PromotionalBentoBanner({ banners }) {
  const navigate = useNavigate();
  const items = banners?.items || [];
  const bgColor = banners?.bgColor || "";
  
  if (!items.length) return null;

  const handleNav = (item) => {
    if (!item.linkType || item.linkType === "none" || !item.linkValue || item.linkValue.trim() === "") {
      return;
    }
    
    const value = item.linkValue.trim();
    if (item.linkType === "category") navigate(`/category/${value}`);
    else if (item.linkType === "subcategory") navigate(`/subcategory/${value}`);
    else if (item.linkType === "product") navigate(`/product/${value}`);
    else if (item.linkType === "url") {
      let finalUrl = value;
      if (finalUrl && !finalUrl.startsWith("http")) {
        finalUrl = "https://" + finalUrl;
      }
      window.open(finalUrl, "_blank");
    }
  };

  const getGradientStyle = (color) => {
    if (!color) return undefined;
    const clean = color.startsWith("#") ? color.slice(1) : color;
    if (clean.length === 6) {
      return `linear-gradient(180deg, #${clean} 0%, #${clean} 55%, #${clean}d0 78%, #${clean}60 92%, rgba(255,255,255,0) 100%)`;
    }
    return `linear-gradient(180deg, ${color} 0%, ${color} 60%, rgba(255,255,255,0) 100%)`;
  };

  return (
    <div className="px-4 pb-12 pt-6 md:pt-8 relative mb-8">
      {bgColor ? (
        <>
          <div 
            className="absolute -top-72 inset-x-0 -bottom-32 pointer-events-none z-0" 
            style={{ background: getGradientStyle(bgColor) }} 
          />
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[85%] h-[75%] bg-white/30 blur-3xl rounded-full pointer-events-none z-0" />
        </>
      ) : (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-[80%] h-24 bg-[#faebd7]/30 blur-2xl rounded-full pointer-events-none" />
      )}
      
      <div className="relative z-10 grid grid-cols-6 gap-2 md:gap-4 max-w-7xl mx-auto">
        {items.filter(item => item.status !== "inactive").slice(0, 7).map((item, idx) => {
          let forcedIsLarge = false;
          let forcedIsStrip = false;
          let colSpan = "col-span-2";
          let rowSpan = "row-span-1";

          if (idx === 0) {
            forcedIsLarge = true;
            colSpan = "col-span-2";
            rowSpan = "row-span-2";
          } else if (idx >= 5) {
            forcedIsStrip = true;
            colSpan = "col-span-3";
            rowSpan = "row-span-1";
          }

          return (
            <BentoCard 
              key={idx} 
              item={{ ...item, cardSize: forcedIsStrip ? "strip" : (forcedIsLarge ? "large_vertical" : "square") }} 
              colSpan={colSpan}
              rowSpan={rowSpan}
              onClick={() => handleNav(item)} 
            />
          );
        })}
      </div>
    </div>
  );
}
