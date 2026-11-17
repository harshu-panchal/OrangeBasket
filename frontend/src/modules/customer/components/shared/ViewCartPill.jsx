import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ShoppingCart } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';

// "View cart" pill: product thumbnails, label + item count, arrow. Orange project theme.
// id="mini-cart-target" is where the add-to-cart fly animation lands.
const ViewCartPill = () => {
    const { cart, cartCount } = useCart();
    const thumbs = cart.slice(-3).reverse(); // latest items first

    return (
        <Link
            to="/checkout"
            aria-label={`View cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
            className="flex items-center gap-3 p-2 rounded-full bg-[#FF8200] text-white shadow-[0_10px_30px_rgba(255,130,0,0.45)] hover:bg-[#E67500] active:scale-95 transition-all"
        >
            <div id="mini-cart-target" className="flex -space-x-4">
                {thumbs.map((item, i) => {
                    const src = applyCloudinaryTransform(item.image || item.mainImage, 'f_auto,q_auto,w_80');
                    return (
                        <div
                            key={`${item.id || item._id}-${item.variantSku || ''}`}
                            className="w-10 h-10 rounded-full bg-white border-2 border-[#FF8200] overflow-hidden flex items-center justify-center"
                            style={{ zIndex: 3 - i }}
                        >
                            {src ? (
                                <img src={src} alt="" className="w-full h-full object-contain" />
                            ) : (
                                <ShoppingCart size={16} className="text-[#FF8200]" />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col leading-tight">
                <span className="text-[15px] font-extrabold whitespace-nowrap">View cart</span>
                <span className="text-[12px] font-medium text-white/90 whitespace-nowrap">
                    {cartCount} {cartCount === 1 ? 'item' : 'items'}
                </span>
            </div>

            <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center">
                <ChevronRight size={20} strokeWidth={3} />
            </div>
        </Link>
    );
};

export default ViewCartPill;
