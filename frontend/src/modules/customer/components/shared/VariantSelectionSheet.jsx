import React, { useRef } from 'react';
import { motion, AnimatePresence, useAnimation, useDragControls } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Minus, Plus } from 'lucide-react';
import Lottie from 'lottie-react';
import { useVariantSelection } from '../../context/VariantSelectionContext';
import { useCart } from '../../context/CartContext';
import fruitBasketAnimation from '../../../../assets/FruitBasket.json';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';

const VariantSelectionSheet = () => {
    const { selectedProduct, isOpen, closeVariantSelection } = useVariantSelection();
    const { cart, updateQuantity, removeFromCart, addToCart } = useCart();
    const navigate = useNavigate();

    const dragControls = useDragControls();
    const scrollRef = useRef(null);

    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleDragEnd = (event, info) => {
        if (info.offset.y > 100 || info.velocity.y > 500) {
            closeVariantSelection();
        }
    };

    if (!selectedProduct) return null;

    const variants = selectedProduct?.variants || [];
    
    // Helper to get quantity in cart for a specific variant
    const getCartQuantity = (variantKey) => {
        if (!selectedProduct) return 0;
        const productId = selectedProduct.id || selectedProduct._id;
        const cartKey = `${productId}::${variantKey || ""}`;
        const item = cart.find(i => `${i.id || i._id}::${String(i.variantSku || "").trim()}` === cartKey);
        return item ? item.quantity : 0;
    };

    const handleIncrement = (variant) => {
        const productId = selectedProduct.id || selectedProduct._id;
        const variantKey = String(variant?.sku || variant?.name || "").trim();
        const qty = getCartQuantity(variantKey);

        if (qty === 0) {
            addToCart({
                ...selectedProduct,
                variantSku: variantKey,
                variantName: String(variant?.name || "").trim(),
                // Optionally pass variant specific price if needed, but CartContext usually handles this or uses the product base if identical.
                // We should pass the specific price override if the variant has it.
                price: variant.salePrice > 0 && variant.salePrice < variant.price ? variant.salePrice : variant.price,
                originalPrice: variant.price
            });
        } else {
            updateQuantity(productId, 1, variantKey);
        }
    };

    const handleDecrement = (variant) => {
        const productId = selectedProduct.id || selectedProduct._id;
        const variantKey = String(variant?.sku || variant?.name || "").trim();
        const qty = getCartQuantity(variantKey);

        if (qty === 1) {
            removeFromCart(productId, variantKey);
        } else if (qty > 1) {
            updateQuantity(productId, -1, variantKey);
        }
    };

    const totalSelectedVariants = variants.reduce((sum, v) => sum + getCartQuantity(String(v?.sku || v?.name || "").trim()), 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={closeVariantSelection}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[250]"
                    />

                    {/* Sheet */}
                    <motion.div
                        drag="y"
                        dragControls={dragControls}
                        dragListener={false}
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.2}
                        onDragEnd={handleDragEnd}
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-x-0 bottom-0 z-[300] bg-white rounded-t-[32px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
                    >
                        {/* Drag Handle */}
                        <div
                            className="w-full flex justify-center pt-3 pb-2 touch-none cursor-grab active:cursor-grabbing"
                            onPointerDown={(e) => dragControls.start(e)}
                        >
                            <div className="w-12 h-1.5 rounded-full bg-slate-300/80" />
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={closeVariantSelection}
                            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors z-10"
                        >
                            <X size={20} strokeWidth={2.5} />
                        </button>

                        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
                            {/* Lottie Animation Header */}
                            <div className="w-full bg-orange-50/50 flex flex-col items-center justify-center pt-2 pb-6 px-4">
                                <div className="w-40 h-40 md:w-48 md:h-48">
                                    <Lottie animationData={fruitBasketAnimation} loop={true} />
                                </div>
                                <h2 className="text-xl font-black text-slate-800 text-center mt-2">
                                    Select Variants
                                </h2>
                                <p className="text-sm font-semibold text-slate-500 text-center mt-1">
                                    {selectedProduct?.name}
                                </p>
                            </div>

                            {/* Variants List */}
                            <div className="px-5 py-4 pb-24">
                                <div className="space-y-4">
                                    {variants.map((variant, index) => {
                                        const variantKey = String(variant?.sku || variant?.name || "").trim();
                                        const qty = getCartQuantity(variantKey);
                                        const mrp = Number(variant.price || 0);
                                        const sale = Number(variant.salePrice || 0);
                                        const effectivePrice = sale > 0 && sale < mrp ? sale : mrp;

                                        return (
                                            <div key={variantKey || index} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 shadow-sm bg-white">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <h3 className="font-bold text-slate-800 text-[15px] truncate">
                                                        {variant.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="font-black text-slate-900 text-base">
                                                            ₹{effectivePrice}
                                                        </span>
                                                        {mrp > effectivePrice && (
                                                            <span className="text-xs text-slate-400 line-through font-semibold">
                                                                ₹{mrp}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Quantity Control */}
                                                <div className="shrink-0">
                                                    {qty > 0 ? (
                                                        <div className="flex items-center bg-[#FF8200] rounded-full p-1 shadow-md">
                                                            <button
                                                                onClick={() => handleDecrement(variant)}
                                                                className="w-7 h-7 flex items-center justify-center text-white hover:bg-white/20 rounded-full transition-colors"
                                                            >
                                                                <Minus size={16} strokeWidth={3} />
                                                            </button>
                                                            <span className="w-7 text-center font-bold text-white text-sm">
                                                                {qty}
                                                            </span>
                                                            <button
                                                                onClick={() => handleIncrement(variant)}
                                                                className="w-7 h-7 flex items-center justify-center text-white hover:bg-white/20 rounded-full transition-colors"
                                                            >
                                                                <Plus size={16} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleIncrement(variant)}
                                                            className="px-5 py-2.5 rounded-full bg-orange-50 text-[#FF8200] border border-orange-200 hover:bg-[#FF8200] hover:text-white flex items-center justify-center font-extrabold text-sm transition-all shadow-sm"
                                                        >
                                                            ADD
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Sticky Action Bar */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                            <button
                                onClick={() => {
                                    closeVariantSelection();
                                    if (totalSelectedVariants > 0) {
                                        navigate('/checkout');
                                    }
                                }}
                                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                    totalSelectedVariants > 0
                                        ? "bg-[#FF8200] hover:bg-orange-600 text-white shadow-md"
                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                            >
                                {totalSelectedVariants > 0 ? "Proceed to Checkout" : "Done"}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default VariantSelectionSheet;
