import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Plus, Minus, Check, Store, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "@shared/components/ui/Toast";
import { useCartAnimation } from "../../context/CartAnimationContext";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import { motion, AnimatePresence } from "framer-motion";
import { useProductDetail } from "../../context/ProductDetailContext";
import ParticleBurst from "./ParticleBurst";
import { useVariantSelection } from "../../context/VariantSelectionContext";

/**
 * @param {{ product: any, badge?: any, className?: string, compact?: boolean, neutralBg?: boolean, layout?: string }} props
 */
const ProductCard = React.memo(
  ({ product, badge, className, compact = false, neutralBg = false, layout = "grid" }) => {
    const { toggleWishlist: toggleWishlistGlobal, isInWishlist } =
      useWishlist();
    const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
    const { showToast } = useToast();
    const { animateAddToCart, animateRemoveFromCart } = useCartAnimation();

    const navigate = useNavigate();
    const { openProduct } = useProductDetail();
    const { openVariantSelection } = useVariantSelection();
    const [showHeartPopup, setShowHeartPopup] = React.useState(false);

    const imageRef = React.useRef(null);

    const defaultVariant = React.useMemo(() => {
      const variants = Array.isArray(product?.variants) ? product.variants : [];
      if (variants.length === 0) return null;

      const displayed = Number(product?.price || 0);
      const displayedOriginal = Number(product?.originalPrice || 0);

      const matchesDisplayedPrice = (variant) => {
        const mrp = Number(variant?.price || 0);
        const sale = Number(variant?.salePrice || 0);
        const effective = sale > 0 && sale < mrp ? sale : mrp;

        if (Number.isFinite(displayedOriginal) && displayedOriginal > displayed) {
          if (effective === displayed && (mrp === displayedOriginal || displayedOriginal === 0)) {
            return true;
          }
        }

        return effective === displayed || mrp === displayed;
      };

      const picked = variants.find(matchesDisplayedPrice) || variants[0];
      const key = String(picked?.sku || picked?.name || "").trim();
      return {
        key,
        name: String(picked?.name || "").trim(),
      };
    }, [product]);

    const productId = product.id || product._id;
    const variantKey = String(defaultVariant?.key || "").trim();
    const cartKey = `${productId}::${variantKey || ""}`;

    const cartItem = React.useMemo(
      () =>
        cart.find(
          (item) =>
            `${item.id || item._id}::${String(item.variantSku || "").trim()}` ===
            cartKey,
        ),
      [cart, cartKey],
    );
    const quantity = cartItem ? cartItem.quantity : 0;
    const isWishlisted = isInWishlist(product.id || product._id);

    const handleProductClick = React.useCallback(
      (e) => {
        if (openProduct) {
          e.preventDefault();
          openProduct(product);
        }
      },
      [openProduct, product],
    );

    const toggleWishlist = React.useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isWishlisted) {
          setShowHeartPopup(true);
          setTimeout(() => setShowHeartPopup(false), 1000);
        }

        toggleWishlistGlobal(product);
        showToast(
          isWishlisted
            ? `${product.name} removed from wishlist`
            : `${product.name} added to wishlist`,
          isWishlisted ? "info" : "success",
        );
      },
      [isWishlisted, toggleWishlistGlobal, product, showToast],
    );

    const handleAddToCart = React.useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (Array.isArray(product?.variants) && product.variants.length > 1) {
            if (openVariantSelection) {
                openVariantSelection(product);
            }
            return;
        }

        if (imageRef.current) {
          animateAddToCart(
            imageRef.current.getBoundingClientRect(),
            product.mainImage || product.image,
          );
        }
        addToCart({
          ...product,
          variantSku: variantKey,
          variantName: defaultVariant?.name || "",
        });
      },
      [animateAddToCart, product, addToCart, variantKey, defaultVariant?.name, openVariantSelection],
    );

    const handleIncrement = React.useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        updateQuantity(productId, 1, variantKey);
      },
      [updateQuantity, productId, variantKey],
    );

    const handleDecrement = React.useCallback(
      (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (quantity === 1) {
          animateRemoveFromCart(product.mainImage || product.image);
          removeFromCart(productId, variantKey);
        } else {
          updateQuantity(productId, -1, variantKey);
        }
      },
      [
        quantity,
        animateRemoveFromCart,
        product.image,
        removeFromCart,
        productId,
        updateQuantity,
        variantKey,
      ],
    );

    const discountText = React.useMemo(() => {
      if (badge) return badge;
      if (product.discount) return product.discount;
      if (product.originalPrice > product.price) {
        return `-${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%`;
      }
      return null;
    }, [badge, product]);

    return (
      <div
        className={cn(
          "group relative flex flex-col justify-between bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-100 shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer",
          layout === "list" ? "flex-row items-center gap-3 py-3" : "h-full",
          className
        )}
        onClick={handleProductClick}
      >
        {/* Wishlist Heart Button (Now at card level to allow overflow) */}
        <button
          onClick={toggleWishlist}
          className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 backdrop-blur-md shadow-2xs flex items-center justify-center hover:bg-white hover:scale-105 active:scale-90 transition-all"
          title="Wishlist"
        >
          <ParticleBurst isActive={showHeartPopup} />
          <motion.div
            whileTap={{ scale: 0.8 }}
            animate={isWishlisted ? { scale: [1, 1.35, 1] } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className="relative z-10"
          >
            <Heart
              size={15}
              className={cn(
                isWishlisted ? "text-red-500 fill-current" : "text-slate-400"
              )}
            />
          </motion.div>
        </button>

        <AnimatePresence>
          {showHeartPopup && (
            <motion.div
              initial={{ scale: 0.5, opacity: 1, y: 0 }}
              animate={{ scale: 2.5, opacity: 0, y: -65 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-50 pointer-events-none text-red-500"
            >
              <Heart size={20} fill="currentColor" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Image Section */}
        <div className={cn("relative w-full overflow-hidden flex items-center justify-center p-0.5", layout === "list" ? "w-[90px] h-[90px] shrink-0" : "aspect-square")}>
          {/* Discount Badge (Top-Left Orange Speech Bubble) */}
          {discountText && (
            <div className="absolute top-0 left-0 z-10 bg-[#FF8200] text-white font-black text-[9.5px] px-2.5 py-1 rounded-[10px_10px_10px_0px] shadow-3xs tracking-tight leading-none select-none">
              {discountText}
            </div>
          )}

          {/* Product Image */}
          <img
            ref={imageRef}
            src={applyCloudinaryTransform(product.mainImage || product.image)}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Content Box */}
        <div className={cn("flex flex-col flex-1 mt-1.5", layout === "list" && "mt-0")}>
          {/* Title & Weight */}
          <div>
            <h4 className="font-bold text-slate-800 text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-slate-900 transition-colors">
              {product.name}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[11px] font-semibold text-slate-400">
                {product.weight || "1 unit"}
              </p>
              {Array.isArray(product?.variants) && product.variants.length > 1 && (
                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">
                  +{product.variants.length - 1} {product.variants.length - 1 === 1 ? 'variant' : 'variants'}
                </span>
              )}
            </div>
            {/* Seller / Warehouse Name */}
            {(product.sellerId?.shopName || product.warehouseId?.name) && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 font-medium line-clamp-1">
                {product.sellerId?.shopName ? (
                  <><Store size={10} className="shrink-0" /> <span className="truncate">{product.sellerId.shopName}</span></>
                ) : (
                  <><Building2 size={10} className="shrink-0" /> <span className="truncate">{product.warehouseId?.name}</span></>
                )}
              </div>
            )}
          </div>

          {/* Bottom Price Row & Plus/Quantity Selector */}
          <div className="flex items-center justify-between gap-1.5 mt-1.5 pt-0.5">
            <div className="flex flex-col min-w-0 flex-1 text-left justify-center">
              <span className="font-black text-slate-900 text-sm sm:text-[15px] tracking-tight leading-none">
                ₹{product.price}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-[10px] text-slate-400 line-through font-semibold mt-0.5 leading-none">
                  ₹{product.originalPrice}
                </span>
              )}
            </div>

            {/* ADD / Quantity Selector Button */}
            <div className="shrink-0 ml-2">
              {quantity > 0 ? (
                <div 
                  className="h-8 min-w-[68px] flex items-center justify-between rounded-sm bg-[#FF8200] text-white shadow-sm"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                  <button 
                    onClick={handleDecrement} 
                    className="w-7 h-full flex items-center justify-center active:bg-orange-600 rounded-l-sm transition-colors"
                  >
                    <Minus size={15} strokeWidth={2.5} />
                  </button>
                  <span className="font-bold text-[13px]">
                    {quantity}
                  </span>
                  <button 
                    onClick={handleIncrement} 
                    className="w-7 h-full flex items-center justify-center active:bg-orange-600 rounded-r-sm transition-colors"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddToCart}
                  className="h-8 min-w-[68px] px-4 rounded-sm border border-[#FF8200] bg-transparent text-[#FF8200] flex items-center justify-center font-bold text-[13px] uppercase active:scale-95 transition-all hover:bg-orange-50"
                  title="Add to Cart"
                >
                  ADD
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default ProductCard;
