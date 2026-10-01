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
        className="h-8 min-w-[68px] px-2 rounded-sm border border-slate-300 bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-[11px] uppercase cursor-not-allowed"
      >
        CLOSED
      </button>
    );
  }

  if (quantity > 0) {
    return (
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
    );
  }

  return (
    <button
      onClick={handleAddToCart}
      className="h-8 min-w-[68px] px-4 rounded-sm border border-[#FF8200] bg-transparent text-[#FF8200] flex items-center justify-center font-bold text-[13px] uppercase active:scale-95 transition-all hover:bg-orange-50"
      title="Add to Cart"
    >
      ADD
    </button>
  );
};

export default React.memo(AddToCartButton);
