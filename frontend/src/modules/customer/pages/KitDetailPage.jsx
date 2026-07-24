import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customerApi } from '../../services/customerApi';
import { useCart } from '../../context/CartContext';
import { toast } from 'sonner';
import { ChevronLeft, Package, Check, Sparkles } from 'lucide-react';

const KitDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [kit, setKit] = useState(null);
    const [loading, setLoading] = useState(true);

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

    const handleSubscribe = async () => {
        if (!kit) return;
        try {
            await addToCart(kit, 1);
            toast.success("Kit added to cart!");
            navigate("/cart");
        } catch (err) {
            toast.error("Failed to add kit to cart");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Kit...</div>;
    if (!kit) return <div className="p-8 text-center">Kit not found</div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
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
                        {['Premium Quality Groceries', 'Free Doorstep Delivery', 'Priority Support', 'Surprise Gift Included'].map((item, i) => (
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

            {/* Bottom Action */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 z-50">
                <button 
                    onClick={handleSubscribe}
                    className="w-full bg-primary text-white font-black text-lg py-4 rounded-2xl shadow-xl shadow-primary/30 active:scale-95 transition-transform"
                >
                    Subscribe Now
                </button>
            </div>
        </div>
    );
};

export default KitDetailPage;
