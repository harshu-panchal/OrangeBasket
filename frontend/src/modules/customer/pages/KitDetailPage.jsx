import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customerApi } from '../services/customerApi';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';
import { ChevronLeft, Package, Check, Sparkles, Plus, Minus, ShoppingCart } from 'lucide-react';

const KitDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [kit, setKit] = useState(null);
    const [loading, setLoading] = useState(true);

    // Add-on items state
    const [addons, setAddons] = useState([]);
    const [addonQuantities, setAddonQuantities] = useState({}); // { addonId: quantity }
    const [addonsLoading, setAddonsLoading] = useState(true);

    useEffect(() => {
        const fetchKit = async () => {
            try {
                const response = await customerApi.getKitById(id);
                if (response?.data?.success) {
                    setKit(response.data.data || response.data.result);
                }
            } catch (err) {
                console.error("Error fetching kit:", err);
                toast.error("Kit not found");
            } finally {
                setLoading(false);
            }
        };
        fetchKit();
    }, [id]);

    // Fetch add-on items
    useEffect(() => {
        const fetchAddons = async () => {
            try {
                // Pass kit id to fetch only addons applicable to this kit
                const response = await customerApi.getKitAddons({ kitId: id });
                if (response?.data?.success) {
                    const items = response.data.results || response.data.result || response.data.data || [];
                    setAddons(items);
                    // Initialize all quantities to 0
                    const initQty = {};
                    items.forEach(item => { initQty[item._id] = 0; });
                    setAddonQuantities(initQty);
                }
            } catch (err) {
                console.error("Error fetching add-ons:", err);
            } finally {
                setAddonsLoading(false);
            }
        };
        if (id) {
            fetchAddons();
        }
    }, [id]);

    const updateQty = (addonId, delta) => {
        setAddonQuantities(prev => {
            const addon = addons.find(a => a._id === addonId);
            const max = addon?.maxQtyPerOrder || 10;
            const newQty = Math.max(0, Math.min(max, (prev[addonId] || 0) + delta));
            return { ...prev, [addonId]: newQty };
        });
    };

    const selectedAddons = addons.filter(a => (addonQuantities[a._id] || 0) > 0);
    const addonsTotal = selectedAddons.reduce((sum, a) => sum + (a.price * addonQuantities[a._id]), 0);
    const kitPrice = kit ? (kit.salePrice || kit.price) : 0;
    const grandTotal = kitPrice + addonsTotal;

    const handleSubscribe = async () => {
        if (!kit) return;
        try {
            // Build addon data to pass along with the cart item
            const addonData = selectedAddons.map(a => ({
                addonId: a._id,
                name: a.name,
                image: a.mainImage,
                quantity: addonQuantities[a._id],
                price: a.price,
                unit: a.unit,
                subtotal: a.price * addonQuantities[a._id],
            }));

            await addToCart(kit, 1, null, { kitAddons: addonData });
            toast.success("Kit added to cart!");
            navigate("/cart");
        } catch (err) {
            toast.error("Failed to add kit to cart");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Kit...</div>;
    if (!kit) return <div className="p-8 text-center">Kit not found</div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            {/* Header */}
            <div className="bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-50 shadow-sm">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronLeft className="h-6 w-6 text-slate-700" />
                </button>
                <h1 className="text-lg font-black text-slate-900 flex-1 truncate">Monthly Basket</h1>
            </div>

            {/* Image */}
            <div className="w-full h-72 bg-white relative">
                <img 
                    src={kit.mainImage || kit.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"} 
                    alt={kit.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    PREMIUM KIT
                </div>
            </div>

            {/* Content */}
            <div className="p-4 bg-white rounded-t-3xl -mt-6 relative z-10 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 leading-tight mb-1">{kit.name}</h2>
                        <p className="text-sm font-bold text-slate-500">{kit.weight || "Monthly Supply"}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-primary">₹{kit.salePrice || kit.price}</div>
                        {kit.price > (kit.salePrice || kit.price) && (
                            <div className="text-sm font-bold text-slate-400 line-through">₹{kit.price}</div>
                        )}
                    </div>
                </div>

                <div className="prose prose-sm text-slate-600 mb-6">
                    {kit.description || "A curated monthly basket of essentials delivered right to your door."}
                </div>

                <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 mb-6">
                    <h3 className="font-black text-orange-900 mb-3 flex items-center gap-2">
                        <Package className="h-5 w-5 text-orange-500" />
                        What's Included
                    </h3>
                    <ul className="space-y-2">
                        {(kit.includedItems && kit.includedItems.length > 0
                            ? kit.includedItems.map((item, i) => `${item.name}${item.quantity ? ` - ${item.quantity}` : ''}`)
                            : ['Premium Quality Groceries', 'Free Doorstep Delivery', 'Priority Support', 'Surprise Gift Included']
                        ).map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm font-bold text-orange-800">
                                <div className="h-5 w-5 rounded-full bg-orange-200 flex items-center justify-center flex-shrink-0">
                                    <Check className="h-3 w-3 text-orange-600" />
                                </div>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* ─── Add-On Items Section ─────────────────────────────────── */}
            {!addonsLoading && addons.length > 0 && (
                <div className="mx-4 mt-4 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-5 pt-5 pb-3">
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                            अपनी Basket में और Add करें
                        </h3>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            Atta, Oil, Rice — जितना चाहें उतना quantity select करें
                        </p>
                    </div>

                    <div className="px-5 pb-5 space-y-3">
                        {addons.map((addon) => {
                            const qty = addonQuantities[addon._id] || 0;
                            return (
                                <div
                                    key={addon._id}
                                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                                        qty > 0
                                            ? 'border-primary/30 bg-primary/5 shadow-sm'
                                            : 'border-slate-100 bg-slate-50/50'
                                    }`}
                                >
                                    {/* Image */}
                                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-slate-100 flex-shrink-0">
                                        {addon.mainImage ? (
                                            <img
                                                src={addon.mainImage}
                                                alt={addon.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
                                                <Package className="h-6 w-6 text-orange-300" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-slate-900 text-sm leading-tight">{addon.name}</h4>
                                        <p className="text-xs text-slate-500 font-medium">{addon.unit}</p>
                                        <p className="text-sm font-black text-primary mt-0.5">₹{addon.price}</p>
                                    </div>

                                    {/* Quantity Controls */}
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {qty > 0 ? (
                                            <>
                                                <button
                                                    onClick={() => updateQty(addon._id, -1)}
                                                    className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center hover:border-primary/50 active:scale-90 transition-all shadow-sm"
                                                >
                                                    <Minus className="h-3.5 w-3.5 text-slate-600" />
                                                </button>
                                                <span className="w-8 text-center text-sm font-black text-slate-900">
                                                    {qty}
                                                </span>
                                                <button
                                                    onClick={() => updateQty(addon._id, 1)}
                                                    className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 active:scale-90 transition-all shadow-sm shadow-primary/20"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => updateQty(addon._id, 1)}
                                                className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-black hover:bg-primary/20 active:scale-95 transition-all"
                                            >
                                                + ADD
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Add-ons subtotal */}
                    {selectedAddons.length > 0 && (
                        <div className="mx-5 mb-5 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-emerald-700">
                                    {selectedAddons.length} add-on{selectedAddons.length > 1 ? 's' : ''} selected
                                </span>
                                <span className="font-black text-emerald-800">+ ₹{addonsTotal}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bottom Action */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 z-50">
                {/* Price Summary */}
                {selectedAddons.length > 0 && (
                    <div className="mb-3 space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-500">
                            <span>Kit Price</span>
                            <span>₹{kitPrice}</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold text-slate-500">
                            <span>Add-ons ({selectedAddons.length} items)</span>
                            <span>₹{addonsTotal}</span>
                        </div>
                        <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-dashed border-slate-200">
                            <span>Total</span>
                            <span>₹{grandTotal}</span>
                        </div>
                    </div>
                )}
                <button 
                    onClick={handleSubscribe}
                    className="w-full bg-primary text-white font-black text-lg py-4 rounded-2xl shadow-xl shadow-primary/30 active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                    <ShoppingCart className="h-5 w-5" />
                    Subscribe Now · ₹{grandTotal}
                </button>
            </div>
        </div>
    );
};

export default KitDetailPage;
