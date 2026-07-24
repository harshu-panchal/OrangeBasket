import React, { useEffect, useState } from 'react';
import warehouseApi from '../../../core/api/axios';
import { Link } from 'react-router-dom';
import { Plus, Package, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const MonthlyKits = () => {
    const [kits, setKits] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchKits = async () => {
            try {
                const response = await warehouseApi.get('/kits/warehouse');
                setKits(response.data.data || []);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load kits");
            } finally {
                setLoading(false);
            }
        };
        fetchKits();
    }, []);

    const getStatusIcon = (status) => {
        switch(status) {
            case 'approved': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
            case 'rejected': return <XCircle className="h-5 w-5 text-rose-500" />;
            default: return <Clock className="h-5 w-5 text-amber-500" />;
        }
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'rejected': return 'bg-rose-50 text-rose-700 border-rose-200';
            default: return 'bg-amber-50 text-amber-700 border-amber-200';
        }
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Manage Monthly Kits</h1>
                    <p className="text-slate-500 font-medium">View and manage your subscription baskets</p>
                </div>
                <Link 
                    to="/warehouse/monthly-kits/add" 
                    className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                    Create New Kit
                </Link>
            </div>
            
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-black">
                                    <th className="p-4 pl-6">Kit Name</th>
                                    <th className="p-4">Price</th>
                                    <th className="p-4">Stock</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {kits.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-12 text-center text-slate-500">
                                            <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                            <p className="font-medium">No kits created yet.</p>
                                        </td>
                                    </tr>
                                ) : kits.map(kit => (
                                    <tr key={kit._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                                                    {kit.mainImage ? (
                                                        <img src={kit.mainImage} alt={kit.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Package className="h-6 w-6 m-auto text-slate-400 mt-3" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{kit.name}</p>
                                                    <p className="text-xs text-slate-500 truncate max-w-xs">{kit.description}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-black text-slate-900">₹{kit.price}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-medium text-slate-600">{kit.stock} units</p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${getStatusStyle(kit.approvalStatus)}`}>
                                                {getStatusIcon(kit.approvalStatus)}
                                                <span className="capitalize">{kit.approvalStatus}</span>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonthlyKits;
