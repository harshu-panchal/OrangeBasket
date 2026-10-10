import React, { useState, useEffect } from 'react';
import { adminFinanceApi } from '../services/api/financeApi';
import {
    IndianRupee,
    Store,
    Bike,
    Warehouse as WarehouseIcon,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Search,
    Filter
} from 'lucide-react';
import { toast } from 'sonner';
import Card from '@shared/components/ui/Card';
import Pagination from '@shared/components/ui/Pagination';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const SummaryCard = ({ title, amount, icon: Icon, colorClass, gradientClass }) => (
    <Card className={cn("overflow-hidden border-none shadow-md !p-0", gradientClass)}>
        <div className="p-6">
            <div className="flex items-center justify-between relative z-10">
                <div>
                    <p className="text-sm font-medium text-white/80 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-white">
                        ₹{amount?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0'}
                    </h3>
                </div>
                <div className={cn("p-4 rounded-2xl bg-white/20 backdrop-blur-md", colorClass)}>
                    <Icon className="w-8 h-8 text-white" />
                </div>
            </div>
            {/* Decorative background elements */}
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-xl"></div>
            <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
        </div>
    </Card>
);

const PayoutsManagement = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState({ items: [], summary: {}, total: 0, totalPages: 1 });
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [filterRole, setFilterRole] = useState('all');

    // Settlement Modal State
    const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [settleAmount, setSettleAmount] = useState('');
    const [remarks, setRemarks] = useState('');
    const [isSettling, setIsSettling] = useState(false);

    const fetchBalances = async () => {
        setIsLoading(true);
        try {
            const res = await adminFinanceApi.getOutstandingBalances({
                page,
                limit,
                role: filterRole
            });
            if (res.data.success) {
                setData(res.data.result);
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to fetch outstanding balances');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBalances();
    }, [page, limit, filterRole]);

    const handleSettleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedUser?.hasPendingRequest || !selectedUser?.pendingBalance) {
            return toast.error("Settlement cannot be processed without an active withdrawal request from the partner.");
        }
        if (!settleAmount || Number(settleAmount) <= 0) {
            return toast.error("Please enter a valid positive amount");
        }
        if (Number(settleAmount) > selectedUser.pendingBalance) {
            return toast.error(`Settlement amount cannot exceed requested withdrawal amount (₹${selectedUser.pendingBalance})`);
        }
        if (Number(settleAmount) > selectedUser.availableBalance) {
            return toast.error("Amount cannot exceed the available balance");
        }

        setIsSettling(true);
        try {
            const res = await adminFinanceApi.settleOutstandingBalance({
                ownerType: selectedUser.ownerType,
                ownerId: selectedUser.ownerId,
                amount: settleAmount,
                remarks
            });
            if (res.data.success) {
                toast.success('Withdrawal request settled successfully');
                setIsSettleModalOpen(false);
                setSettleAmount('');
                setRemarks('');
                fetchBalances();
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to settle balance');
        } finally {
            setIsSettling(false);
        }
    };

    const getRoleBadge = (type) => {
        switch (type) {
            case 'SELLER':
                return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1 w-max"><Store className="w-3 h-3" /> Seller</span>;
            case 'DELIVERY_PARTNER':
                return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1 w-max"><Bike className="w-3 h-3" /> Delivery</span>;
            case 'WAREHOUSE':
                return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1 w-max"><WarehouseIcon className="w-3 h-3" /> Warehouse</span>;
            default:
                return <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1 w-max">{type}</span>;
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <IndianRupee className="w-6 h-6 text-primary" />
                        Settlements & Payouts
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage outstanding dues and clear payments for all partners.</p>
                </div>
                <button
                    onClick={fetchBalances}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
                >
                    <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    title="Total Available Dues"
                    amount={data.summary?.TOTAL}
                    icon={AlertCircle}
                    gradientClass="bg-gradient-to-br from-red-500 to-rose-600"
                />
                <SummaryCard
                    title="Total Requested Dues"
                    amount={data.summary?.TOTAL_REQUESTED}
                    icon={IndianRupee}
                    gradientClass="bg-gradient-to-br from-amber-500 to-orange-600"
                />
                <SummaryCard
                    title="Seller Requested Dues"
                    amount={data.summary?.REQUESTED_SELLER}
                    icon={Store}
                    gradientClass="bg-gradient-to-br from-blue-500 to-indigo-600"
                />
                <SummaryCard
                    title="Rider & WH Requested Dues"
                    amount={(data.summary?.REQUESTED_DELIVERY || 0) + (data.summary?.REQUESTED_WAREHOUSE || 0)}
                    icon={Bike}
                    gradientClass="bg-gradient-to-br from-purple-500 to-fuchsia-600"
                />
            </div>

            <Card 
                className="shadow-sm border-slate-200 overflow-hidden"
                contentClassName="p-0"
                title="Outstanding Balances & Withdrawal Requests"
                headerAction={
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none sm:min-w-[200px]">
                            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <select
                                value={filterRole}
                                onChange={(e) => {
                                    setFilterRole(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 appearance-none outline-none transition-all font-medium"
                            >
                                <option value="all">All Roles</option>
                                <option value="seller">Sellers Only</option>
                                <option value="delivery">Delivery Partners</option>
                                <option value="warehouse">Warehouses</option>
                            </select>
                        </div>
                    </div>
                }
            >

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">User Type</th>
                                <th className="px-6 py-4">Partner Details</th>
                                <th className="px-6 py-4 text-right">Available Balance</th>
                                <th className="px-6 py-4 text-right">Requested Withdrawal</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                                            <p>Loading balances...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : data.items.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <CheckCircle2 className="w-10 h-10 text-green-400" />
                                            <p className="font-medium text-slate-700">All cleared!</p>
                                            <p className="text-xs">There are no outstanding balances to settle.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                data.items.map((item) => (
                                    <tr key={item.walletId} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 align-top">
                                            {getRoleBadge(item.ownerType)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-800">{item.userDetails?.name}</p>
                                            {item.userDetails?.shopName && <p className="text-xs text-slate-500 mt-0.5">{item.userDetails.shopName}</p>}
                                            {item.userDetails?.warehouseName && <p className="text-xs text-slate-500 mt-0.5">{item.userDetails.warehouseName}</p>}
                                            <p className="text-xs text-slate-500 mt-1">{item.userDetails?.phone}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right align-top">
                                            <span className="inline-block font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                                                ₹{item.availableBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right align-top">
                                            {item.hasPendingRequest ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="inline-block font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                                                        ₹{item.pendingBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="text-[10px] text-amber-600 font-semibold mt-1">Pending Request</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end">
                                                    <span className="inline-block font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-lg">
                                                        ₹0.00
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium mt-1">No Request</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center align-top">
                                            {item.hasPendingRequest ? (
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(item);
                                                        setSettleAmount(item.pendingBalance);
                                                        setRemarks('');
                                                        setIsSettleModalOpen(true);
                                                    }}
                                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 mx-auto active:scale-95"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Settle Request
                                                </button>
                                            ) : (
                                                <button
                                                    disabled
                                                    title="Partner must submit a withdrawal request before settlement"
                                                    className="px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-xl border border-slate-200 cursor-not-allowed mx-auto"
                                                >
                                                    No Withdrawal Request
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    <Pagination
                        page={page}
                        totalPages={data.totalPages}
                        total={data.total}
                        pageSize={limit}
                        onPageChange={(p) => setPage(p)}
                        onPageSizeChange={(newLimit) => {
                            setLimit(newLimit);
                            setPage(1);
                        }}
                    />
                </div>
            </Card>

            {/* Settle Modal */}
            <AnimatePresence>
                {isSettleModalOpen && selectedUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isSettling && setIsSettleModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-xl font-bold text-slate-800">Settle Withdrawal Request</h3>
                                <p className="text-sm text-slate-500 mt-1">Clear requested payout for {selectedUser.userDetails?.name}</p>
                            </div>
                            
                            <form onSubmit={handleSettleSubmit} className="p-6 space-y-5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Available Balance</label>
                                        <div className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 font-bold text-base">
                                            ₹{selectedUser.availableBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1.5">Requested Amount</label>
                                        <div className="w-full px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 font-bold text-base">
                                            ₹{selectedUser.pendingBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Settlement Amount (₹)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={Math.min(selectedUser.availableBalance, selectedUser.pendingBalance)}
                                        step="0.01"
                                        value={settleAmount}
                                        onChange={(e) => setSettleAmount(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-semibold"
                                        placeholder="Enter amount to pay"
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1.5">Default set to partner's pending requested withdrawal amount.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Remarks / Transaction Ref / UTR</label>
                                    <input
                                        type="text"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="e.g. UTR Number, Bank Transfer ID"
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsSettleModalOpen(false)}
                                        disabled={isSettling}
                                        className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSettling}
                                        className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-green-500 rounded-xl hover:bg-green-600 shadow-sm transition-all disabled:opacity-50"
                                    >
                                        {isSettling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        {isSettling ? 'Processing...' : 'Settle Withdrawal'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PayoutsManagement;
