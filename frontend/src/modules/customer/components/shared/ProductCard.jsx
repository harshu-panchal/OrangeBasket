import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Plus, Minus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "@shared/components/ui/Toast";
import { useCartAnimation } from "../../context/CartAnimationContext";
import { applyCloudinaryTransform } from "@/core/utils/imageUtils";
import { motion, AnimatePresence } from "framer-motion";
import { useProductDetail } from "../../context/ProductDetailContext";

const ProductCard = React.memo(
  ({ product, badge, className, compact = false, neutralBg = false, layout = "grid" }) => {
    const { toggleWishlist: toggleWishlistGlobal, isInWishlist } =
      useWishlist();
    const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
    const { showToast } = useToast();
    const { animateAddToCart, animateRemoveFromCart } = useCartAnimation();

    const navigate = useNavigate();
    const { openProduct } = useProductDetail();
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
        if (imageRef.current) {
          animateAddToCart(
            imageRef.current.getBoundingClientRect(),
            product.image,
          );
        }
        addToCart({
          ...product,
          variantSku: variantKey,
          variantName: defaultVariant?.name || "",
        });
      },
      [animateAddToCart, product, addToCart, variantKey, defaultVariant?.name],
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
          animateRemoveFromCart(product.image);
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
          "group relative flex flex-col justify-between bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-100 shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden",
          layout === "list" ? "flex-row items-center gap-3 py-3" : "h-full",
          className
        )}
        onClick={handleProductClick}
      >
        {/* Top Image Section */}
        <div className={cn("relative w-full overflow-hidden flex items-center justify-center p-0.5", layout === "list" ? "w-[90px] h-[90px] shrink-0" : "aspect-square")}>
          {/* Discount Badge (Top-Left Orange Speech Bubble) */}
          {discountText && (
            <div className="absolute top-0 left-0 z-10 bg-[#FF8200] text-white font-black text-[9.5px] px-2.5 py-1 rounded-[10px_10px_10px_0px] shadow-3xs tracking-tight leading-none select-none">
              {discountText}
            </div>
          )}

          {/* Wishlist Heart Button (Top-Right White Circle parallel to badge) */}
          <button
            onClick={toggleWishlist}
            className="absolute top-0 right-0 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 backdrop-blur-md shadow-2xs flex items-center justify-center hover:bg-white hover:scale-105 active:scale-90 transition-all"
            title="Wishlist"
          >
            <motion.div
              whileTap={{ scale: 0.8 }}
              animate={isWishlisted ? { scale: [1, 1.25, 1] } : {}}
            >
              <Heart
                size={14}
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
                animate={{ scale: 2, opacity: 0, y: -35 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute top-3 right-3 z-50 pointer-events-none text-red-500"
              >
                <Heart size={20} fill="currentColor" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Product Image */}
          <img
            ref={imageRef}
            src={applyCloudinaryTransform(product.image)}
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
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              {product.weight || "1 unit"}
            </p>
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

            {/* Orange Plus/Check Toggle Button */}
            <div className="shrink-0">
              {quantity > 0 ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeFromCart(productId, variantKey);
                  }}
                  className="w-7.5 h-7.5 rounded-full bg-[#FF8200] hover:bg-red-550 text-white flex items-center justify-center font-extrabold text-base shadow-2xs hover:scale-105 active:scale-90 transition-all group/btn"
                  title="Remove from Cart"
                >
                  <div className="relative w-4 h-4 flex items-center justify-center">
                    <span className="absolute transition-all duration-200 opacity-100 scale-100 group-hover/btn:opacity-0 group-hover/btn:scale-75">
                      <Check size={15} strokeWidth={3.5} />
                    </span>
                    <span className="absolute transition-all duration-200 opacity-0 scale-75 group-hover/btn:opacity-100 group-hover/btn:scale-100">
                      <Minus size={15} strokeWidth={3.5} />
                    </span>
                  </div>
                </button>
              ) : (
                <button
                  onClick={handleAddToCart}
                  className="w-7.5 h-7.5 rounded-full bg-[#FF8200] hover:bg-[#FF8200]/95 text-white flex items-center justify-center font-extrabold text-base shadow-2xs hover:scale-105 active:scale-90 transition-all"
                  title="Add to Cart"
                >
                  <Plus size={16} strokeWidth={3.5} />
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
