import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, ChevronLeft, Wallet } from 'lucide-react';
import { customerApi } from '../services/customerApi';

const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today) return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const WalletPage = () => {
    const navigate = useNavigate();
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [profileRes, ordersRes] = await Promise.all([
                    customerApi.getProfile(),
                    customerApi.getMyOrders(),
                ]);
                const profile = profileRes.data?.result ?? profileRes.data?.data ?? profileRes.data;
                const rawOrders = ordersRes.data?.results ?? ordersRes.data?.result ?? [];
                const orders = Array.isArray(rawOrders) ? rawOrders : [];
                setBalance(profile?.walletBalance ?? 0);
                // Only orders purchased using wallet
                const walletOrders = orders.filter(
                    (o) => (o.payment?.method || '').toLowerCase() === 'wallet'
                );
                const items = walletOrders.map((o) => ({
                    _id: o._id,
                    type: 'debit',
                    title: 'Order Payment',
                    amount: o.pricing?.total ?? o.payableAmount ?? 0,
                    date: o.createdAt,
                    orderId: o.orderId,
                }));
                setTransactions(items);
            } catch (err) {
                console.error('Wallet fetch error:', err);
                setBalance(0);
                setTransactions([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
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
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Wallet</h1>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-1 relative z-20 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Available Balance</p>
                    <h2 className="text-3xl font-extrabold text-slate-900 mt-1">
                        {loading ? '...' : `₹${(balance || 0).toLocaleString('en-IN')}`}
                    </h2>
                    <p className="text-xs font-medium text-slate-500 mt-1">Return refunds are credited here</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-800">Transaction History</h3>
                        <div className="w-10 h-10 rounded-full bg-teal-50/80 border border-teal-100 flex items-center justify-center text-teal-700 shrink-0">
                            <span className="text-lg">👛</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-12 flex justify-center text-slate-400 text-sm font-semibold">
                            Loading...
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                            <p className="text-sm font-semibold text-slate-500 mb-1">No wallet payments yet</p>
                            <p className="text-xs text-slate-400">
                                Orders paid using wallet will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {transactions.map((tx) => (
                                <div key={tx._id} className="px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                                    <div className="flex items-center gap-3.5">
                                        <div className={`w-11 h-11 rounded-full border flex items-center justify-center shadow-2xs shrink-0 ${tx.type === 'credit' ? 'bg-teal-50/80 border-teal-100 text-teal-700' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                            <span className="text-lg">{tx.type === 'credit' ? '💰' : '🛍️'}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">{tx.title}</h4>
                                            <p className="text-[11px] font-medium text-slate-500">{formatDate(tx.date)}</p>
                                            {tx.orderId && (
                                                <p className="text-[10px] text-slate-400">#{tx.orderId}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`text-sm font-bold ${tx.type === 'credit' ? 'text-teal-600' : 'text-slate-900'}`}>
                                        {tx.type === 'credit' ? '+' : '-'}₹{(tx.amount || 0).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WalletPage;
