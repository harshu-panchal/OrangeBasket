import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { applyCloudinaryTransform } from '@/core/utils/imageUtils';

const CartPage = () => {
    const { cart, cartTotal } = useCart();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white pb-28 font-sans">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white px-4 py-4 flex items-center">
                <button
                    onClick={() => navigate(-1)}
                    className="p-1 -ml-1"
                >
                    <ChevronLeft size={24} className="text-gray-900" />
                </button>
                <h1 className="flex-1 text-center text-[18px] font-bold text-gray-900 mr-6">
                    My Cart
                </h1>
            </div>

            {/* Cart Items */}
            {cart.length > 0 ? (
                <div className="px-5 pt-2 space-y-8">
                    {cart.map((item) => (
                        <div key={`${item.id}-${item.variantSku || ''}`} className="flex items-center">
                            {/* Image */}
                            <div className="w-[72px] h-[72px] flex-shrink-0 flex items-center justify-center mr-5">
                                <img
                                    src={applyCloudinaryTransform(item.image)}
                                    alt={item.name}
                                    className="w-full h-full object-contain"
                                    loading="lazy"
                                />
                            </div>
                            
                            {/* Details */}
                            <div className="flex-1">
                                <h3 className="text-[16px] font-bold text-gray-900 leading-tight">
                                    {item.name}
                                </h3>
                                <p className="text-[14px] text-gray-500 font-medium mt-1">
                                    {item.weight || '1 kg'} {item.quantity > 1 ? `(x${item.quantity})` : ''}
                                </p>
                            </div>
                            
                            {/* Price */}
                            <div className="text-[16px] font-bold text-gray-900 pl-4">
                                ₹{(() => {
                                    const mrp = Number(item.price || 0);
                                    const sale = Number(item.salePrice || 0);
                                    const unit = sale > 0 && sale < mrp ? sale : mrp;
                                    return Math.round(unit * Number(item.quantity || 1));
                                })()}
                            </div>
                        </div>
                    ))}

                    <div className="pt-8 pb-4">
                        {/* Apply Coupon */}
                        <div className="flex items-center justify-between py-4 cursor-pointer">
                            <span className="text-[16px] font-bold text-gray-700">Apply Coupon</span>
                            <ChevronRight size={20} className="text-gray-400" />
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-between py-6 mt-2">
                            <span className="text-[22px] font-black text-gray-900">Total</span>
                            <span className="text-[22px] font-black text-gray-900">₹{cartTotal}</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center pt-32 px-4 text-center">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                        <span className="text-4xl">🛒</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
                    <p className="text-gray-500 font-medium mb-8">Looks like you haven't added anything yet.</p>
                    <Link
                        to="/categories"
                        className="bg-[#f97316] hover:bg-[#ea580c] transition-colors text-white font-bold py-3.5 px-8 rounded-xl"
                    >
                        Start Shopping
                    </Link>
                </div>
            )}

            {/* Bottom Fixed Checkout Button */}
            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white z-40">
                    <Link
                        to="/checkout"
                        className="flex w-full items-center justify-center bg-[#f97316] hover:bg-[#ea580c] transition-colors text-white text-[17px] font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20"
                    >
                        Proceed to Checkout
                    </Link>
                </div>
            )}
        </div>
    );
};

export default CartPage;
