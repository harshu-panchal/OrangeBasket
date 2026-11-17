import React from "react";
import { Plus, Minus } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useCartAnimation } from "../../context/CartAnimationContext";
import { useVariantSelection } from "../../context/VariantSelectionContext";

const AddToCartButton = ({ product, defaultVariant, variantKey, isClosed, imageRef }) => {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const { animateAddToCart } = useCartAnimation();
  const { openVariantSelection } = useVariantSelection();

  const productId = product.id || product._id;
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

  const handleAddToCart = React.useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (isClosed) return;
      
      if (Array.isArray(product?.variants) && product.variants.length > 1) {
          if (openVariantSelection) {
              openVariantSelection(product);
          }
          return;
      }

      if (imageRef?.current) {
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
    [animateAddToCart, product, addToCart, variantKey, defaultVariant?.name, openVariantSelection, isClosed, imageRef],
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
      if (quantity <= 1) {
        removeFromCart(productId, variantKey);
      } else {
        updateQuantity(productId, -1, variantKey);
      }
    },
    [updateQuantity, removeFromCart, productId, variantKey, quantity],
  );

  if (isClosed) {
    return (
      <button
        disabled
        className="h-9 min-w-[76px] px-3 rounded-full border border-slate-300 bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-[11px] uppercase cursor-not-allowed"
      >
        CLOSED
      </button>
    );
  }

  if (quantity > 0) {
    return (
      <div 
        className="h-9 min-w-[84px] px-1 flex items-center justify-between rounded-full bg-[#FF8200] text-white shadow-[0_6px_16px_rgba(255,130,0,0.35)]"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        <button
          onClick={handleDecrement}
          aria-label="Decrease quantity"
          className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center active:bg-white/40 transition-colors"
        >
          <Minus size={15} strokeWidth={2.5} />
        </button>
        <span className="font-bold text-[13px]">
          {quantity}
        </span>
        <button 
          onClick={handleIncrement}
          aria-label="Increase quantity"
          className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center active:bg-white/40 transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleAddToCart}
      className="h-9 min-w-[76px] pl-3 pr-1 gap-2 rounded-full bg-[#FF8200] text-white flex items-center justify-between font-extrabold text-[13px] tracking-wide shadow-[0_6px_16px_rgba(255,130,0,0.35)] hover:bg-[#E67500] active:scale-95 transition-all"
      title="Add to Cart"
      aria-label={`Add ${product.name || "item"} to cart`}
    >
      ADD
      <span className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center">
        <Plus size={15} strokeWidth={3} />
      </span>
    </button>
  );
};

export default React.memo(AddToCartButton);
