import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowUpRight, ArrowDownLeft, ReceiptIndianRupee } from 'lucide-react';
import { customerApi } from '../services/customerApi';

const OrderTransactionsPage = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await customerApi.getMyOrders();
                // Handle both paginated (result.items) and legacy (results) formats
                const orderData = res.data.result?.items || res.data.results || [];
                setOrders(orderData);
            } catch (error) {
                console.error('Failed to fetch orders for transaction history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    return (
        <div className="min-h-screen bg-white pb-24 font-['Outfit',_sans-serif]">
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 pt-4 pb-3 border-b border-slate-100 mb-4 flex items-center gap-2">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors -ml-1"
                >
                    <ChevronLeft size={22} className="text-slate-800" />
                </button>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Order Transactions</h1>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-1 relative z-20">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Transaction History</h3>
                            <p className="text-[11px] font-medium text-slate-500">
                                Based on your recent orders
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-orange-50/80 border border-orange-100 flex items-center justify-center text-orange-700 shrink-0">
                            <span className="text-lg">💳</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-10 flex items-center justify-center text-xs text-slate-400 font-semibold">
                            Loading transactions...
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="py-10 flex flex-col items-center justify-center text-center px-6">
                            <p className="text-sm font-semibold text-slate-500 mb-1">
                                No transactions yet
                            </p>
                            <p className="text-[11px] text-slate-400">
                                Place an order to see your payment history here.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {orders.map((order) => {
                                const isRefund = order.paymentStatus === 'refunded';
                                const amount = order.totalAmount || order.payableAmount || 0;
                                const createdAt = order.createdAt ? new Date(order.createdAt) : null;

                                return (
                                    <div
                                        key={order._id}
                                        className="px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <div
                                                className={`w-11 h-11 rounded-full border flex items-center justify-center shadow-2xs shrink-0 ${
                                                    isRefund
                                                        ? 'bg-amber-50/80 border-amber-100 text-amber-700'
                                                        : 'bg-orange-50/80 border-orange-100 text-orange-700'
                                                }`}
                                            >
                                                <span className="text-lg">{isRefund ? '↩️' : '💳'}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm">
                                                    {isRefund ? 'Refund' : 'Order Payment'}
                                                </h4>
                                                <p className="text-[11px] font-medium text-slate-500">
                                                    #{order.orderId || order._id?.slice(-8)} •{' '}
                                                    {order.paymentMethod || 'Online'}
                                                </p>
                                                {createdAt && (
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        {createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })},{' '}
                                                        {createdAt.toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div
                                            className={`text-sm font-bold ${
                                                isRefund ? 'text-amber-600' : 'text-slate-900'
                                            }`}
                                        >
                                            {isRefund ? '+' : '-'}₹{amount}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderTransactionsPage;

