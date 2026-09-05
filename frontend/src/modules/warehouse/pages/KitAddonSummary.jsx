import React, { useState, useEffect } from 'react';
import warehouseApi from '../../../core/api/axios';
import { toast } from 'sonner';
import {
    Package, TrendingUp, Calendar, ChevronDown,
    ShoppingCart, BarChart3, Loader2
} from 'lucide-react';

const KitAddonSummary = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('current_month');

    const getDateParams = () => {
        const now = new Date();
        if (dateRange === 'current_month') {
            return {
                startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
                endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString(),
            };
        } else if (dateRange === 'last_month') {
            return {
                startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
                endDate: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString(),
            };
        } else if (dateRange === 'last_7_days') {
            const start = new Date(now);
            start.setDate(start.getDate() - 7);
            return {
                startDate: start.toISOString(),
                endDate: now.toISOString(),
            };
        }
        return {};
    };

    const fetchSummary = async () => {
        setLoading(true);
        try {
            const params = getDateParams();
            const response = await warehouseApi.get('/kits/warehouse/addon-summary', { params });
            setData(response.data.result || response.data.data || {});
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch add-on summary');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, [dateRange]);

    const summary = data?.summary || [];
    const orders = data?.orders || [];

    const totalQuantity = summary.reduce((sum, s) => sum + s.totalQuantity, 0);
    const totalAmount = summary.reduce((sum, s) => sum + s.totalAmount, 0);

    const ADDON_COLORS = [
        { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500', bar: 'bg-amber-500' },
        { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500', bar: 'bg-emerald-500' },
        { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-500', bar: 'bg-blue-500' },
        { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-500', bar: 'bg-purple-500' },
        { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: 'text-rose-500', bar: 'bg-rose-500' },
    ];

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Kit Add-On Summary</h1>
                    <p className="text-slate-500 font-medium">
                        Monthly kit ke sath customers ne kitne add-on items order kiye
                    </p>
                </div>

                {/* Date Range Filter */}
                <div className="relative">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 font-bold text-sm text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
                    >
                        <option value="current_month">This Month</option>
                        <option value="last_month">Last Month</option>
                        <option value="last_7_days">Last 7 Days</option>
                    </select>
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : summary.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-12 text-center">
                    <Package className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-black text-slate-900 mb-2">No Add-On Orders Yet</h3>
                    <p className="text-slate-500 font-medium">
                        Is period me koi customer ne add-on items order nahi kiye
                    </p>
                </div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-primary/10">
                                    <Package className="h-5 w-5 text-primary" />
                                </div>
                                <span className="text-sm font-bold text-slate-500">Total Items</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900">{totalQuantity}</p>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-emerald-50">
                                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                                </div>
                                <span className="text-sm font-bold text-slate-500">Total Revenue</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900">₹{totalAmount.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-xl bg-blue-50">
                                    <ShoppingCart className="h-5 w-5 text-blue-500" />
                                </div>
                                <span className="text-sm font-bold text-slate-500">Orders with Add-ons</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900">{orders.length}</p>
                        </div>
                    </div>

                    {/* Per-Item Breakdown */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 md:p-6 mb-8">
                        <h2 className="text-lg font-black text-slate-900 mb-5 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            Item-wise Breakdown
                        </h2>
                        <div className="space-y-4">
                            {summary.map((item, idx) => {
                                const color = ADDON_COLORS[idx % ADDON_COLORS.length];
                                const percentage = totalQuantity > 0 ? Math.round((item.totalQuantity / totalQuantity) * 100) : 0;
                                return (
                                    <div key={item.addonId || idx} className={`rounded-2xl p-4 border ${color.bg} ${color.border}`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-white shadow-sm" />
                                            ) : (
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.bg}`}>
                                                    <Package className={`h-6 w-6 ${color.icon}`} />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <h3 className={`font-black text-base ${color.text}`}>{item.name}</h3>
                                                <p className="text-xs font-medium text-slate-500">{item.unit || ''} · {item.orderCount} orders</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-2xl font-black ${color.text}`}>{item.totalQuantity}</p>
                                                <p className="text-xs font-bold text-slate-500">₹{item.totalAmount.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        {/* Progress bar */}
                                        <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${color.bar}`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <p className="text-xs font-semibold text-slate-400 mt-1">{percentage}% of total</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Per-Order Breakdown */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-5 md:px-6 py-4 border-b border-slate-100">
                            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5 text-primary" />
                                Order-wise Details
                            </h2>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {orders.map((order) => (
                                <div key={order._id} className="px-5 md:px-6 py-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <span className="text-sm font-black text-slate-900">#{order.orderId}</span>
                                            {order.customer && (
                                                <span className="text-xs font-medium text-slate-400 ml-2">
                                                    {order.customer.name || order.customer.phone}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                            order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                                            order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                            order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(order.kitAddons || []).map((addon, i) => (
                                            <span
                                                key={i}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-bold text-slate-700"
                                            >
                                                {addon.name} × {addon.quantity}
                                                <span className="text-slate-400">₹{addon.subtotal || addon.quantity * addon.price}</span>
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium mt-1">
                                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default KitAddonSummary;
