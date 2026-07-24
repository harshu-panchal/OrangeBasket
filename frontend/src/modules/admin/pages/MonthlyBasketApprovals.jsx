import React, { useEffect, useState } from 'react';
import adminApi from '../../../core/api/axios';
import { toast } from 'sonner';
import { Check, X, Package, Clock } from 'lucide-react';

const MonthlyBasketApprovals = () => {
    const [kits, setKits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const fetchKits = async () => {
        try {
            const response = await adminApi.get('/kits/admin/approvals');
            setKits(response.data.result || response.data.results || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch pending kits');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKits();
    }, []);

    const handleApproval = async (id, status) => {
        setActionLoading(id);
        try {
            await adminApi.put(`/kits/admin/${id}/approve`, { status, note: '' });
            toast.success(`Kit ${status} successfully`);
            fetchKits();
        } catch (error) {
            console.error(error);
            toast.error(`Failed to ${status} kit`);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-slate-900">Monthly Basket Approvals</h1>
                <p className="text-slate-500 font-medium">Review and approve kits submitted by warehouses</p>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : kits.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
                    <Check className="h-12 w-12 mx-auto text-emerald-400 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-1">All caught up!</h3>
                    <p className="text-slate-500">No pending kits awaiting approval.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {kits.map(kit => (
                        <div key={kit._id} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="aspect-[4/3] bg-slate-100 relative">
                                {kit.mainImage ? (
                                    <img src={kit.mainImage} alt={kit.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="h-12 w-12 text-slate-300" />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                                    <Clock className="h-3 w-3" />
                                    Pending
                                </div>
                            </div>
                            <div className="p-5">
                                <h3 className="font-black text-slate-900 text-lg mb-1">{kit.name}</h3>
                                <p className="text-sm font-bold text-slate-500 mb-4 line-clamp-2">{kit.description}</p>
                                
                                <div className="flex justify-between items-end mb-6 bg-slate-50 p-3 rounded-xl">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Price</p>
                                        <p className="font-black text-primary text-xl">₹{kit.price}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Stock</p>
                                        <p className="font-bold text-slate-700">{kit.stock} units</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => handleApproval(kit._id, 'rejected')}
                                        disabled={actionLoading === kit._id}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 font-bold hover:bg-rose-50 transition-colors disabled:opacity-50"
                                    >
                                        <X className="h-4 w-4" /> Reject
                                    </button>
                                    <button 
                                        onClick={() => handleApproval(kit._id, 'approved')}
                                        disabled={actionLoading === kit._id}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                    >
                                        <Check className="h-4 w-4" /> Approve
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MonthlyBasketApprovals;
