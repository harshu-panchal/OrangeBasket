import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import { sellerApi } from '@/modules/seller/services/sellerApi';
import { warehouseApi } from '@/modules/warehouse/services/warehouseApi';
import { useAuth } from "@core/context/AuthContext";
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, Check, X, Clock, Truck, AlertTriangle, Phone, MapPin, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SellerOrdersContext from '@/modules/seller/context/SellerOrdersContext';
import WarehouseOrdersContext from '@/modules/warehouse/context/WarehouseOrdersContext';
import SellerEarningsContext, { defaultEarnings } from '@/modules/seller/context/SellerEarningsContext';
import { getOrderSocket, onSellerOrderNew, onReturnDropOtp, onSOSAlert } from '@/core/services/orderSocket';
import { createSocketTokenReader } from '@core/utils/authStorage';
import { STORAGE_KEYS } from '@core/utils/storage';
import orderAlertSound from '@/assets/sounds/order_alert.mp3';

const POLL_INTERVAL_MS = 15000;

/** Match server `sellerPendingExpiresAt` — never reset to a full 60s when the modal opens late. */
function secondsLeftUntilSellerExpiry(order) {
    if (!order) return 0;
    const raw = order.sellerPendingExpiresAt ?? order.expiresAt;
    if (!raw) return 60;
    const ms = new Date(raw).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 1000));
}

function isSellerAlertEligible(order) {
    if (!order?.orderId) return false;
    const ws = String(order.workflowStatus || '').toUpperCase();
    const status = String(order.status || '').toLowerCase();
    const hasExpiry = Boolean(order.sellerPendingExpiresAt ?? order.expiresAt);

    if (hasExpiry && secondsLeftUntilSellerExpiry(order) <= 0) return false;
    if (ws) return ws === 'SELLER_PENDING';

    // Backward compatibility: older payloads may not include workflowStatus.
    return status === 'pending';
}

const isEarningsRoute = (path) =>
    path.includes('earnings') || path.includes('withdrawals') || path.includes('transactions');

const DashboardLayout = ({ children, navItems, title }) => {
    const [newOrderAlert, setNewOrderAlert] = useState(null);
    const [newReturnAlert, setNewReturnAlert] = useState(null);
    const [shownOrderIds, setShownOrderIds] = useState(() => new Set());
    const [shownReturnOrderIds, setShownReturnOrderIds] = useState(() => new Set());
    const [timeLeft, setTimeLeft] = useState(0);
    /** Total seconds in this acceptance window (for progress bar), set when modal opens */
    const acceptWindowTotalRef = useRef(60);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [returnDropOtpAlert, setReturnDropOtpAlert] = useState(null); // { orderId, otp, expiresAt }
    const [sosAlert, setSOSAlert] = useState(null);
    const sosRingtoneRef = useRef(null);
    const { user, logout, role } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Shared data for seller – single source, avoids duplicate API calls
    const [sellerOrders, setSellerOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [sellerEarningsData, setSellerEarningsData] = useState(defaultEarnings);
    const [earningsLoading, setEarningsLoading] = useState(false);

    const shownOrderIdsRef = useRef(new Set());
    const shownReturnOrderIdsRef = useRef(new Set());
    const isFirstLoadRef = useRef(true);
    const newOrderAlertRef = useRef(null);
    const newReturnAlertRef = useRef(null);
    const fetchOrdersRef = useRef(null);
    const isOrdersFetchInFlightRef = useRef(false);
    const earningsFetchedRef = useRef(false);
    const orderRingtoneRef = useRef(null);
    const ringtoneRetryTimerRef = useRef(null);
    const ringtoneUnlockHandlerRef = useRef(null);

    const getOrderRingtone = () => {
        if (!orderRingtoneRef.current) {
            const audio = new Audio(orderAlertSound);
            audio.loop = true;
            audio.preload = 'auto';
            orderRingtoneRef.current = audio;
        }
        return orderRingtoneRef.current;
    };

    const startOrderRingtone = () => {
        const audio = getOrderRingtone();
        audio.loop = true;
        audio.preload = 'auto';
        audio.muted = false;
        audio.volume = 1;
        audio.play().catch(() => { });

        if (!ringtoneRetryTimerRef.current) {
            ringtoneRetryTimerRef.current = setInterval(() => {
                if (!newOrderAlertRef.current) return;
                const currentAudio = getOrderRingtone();
                if (!currentAudio.paused) return;
                currentAudio.play().catch(() => { });
            }, 1200);
        }

        if (!ringtoneUnlockHandlerRef.current && typeof window !== 'undefined' && typeof document !== 'undefined') {
            const unlockPlayback = () => {
                if (!newOrderAlertRef.current) return;
                const currentAudio = getOrderRingtone();
                if (!currentAudio.paused) return;
                currentAudio.play().catch(() => { });
            };
            ringtoneUnlockHandlerRef.current = unlockPlayback;
            window.addEventListener('focus', unlockPlayback);
            document.addEventListener('visibilitychange', unlockPlayback);
            document.addEventListener('pointerdown', unlockPlayback);
            document.addEventListener('touchstart', unlockPlayback);
            document.addEventListener('keydown', unlockPlayback);
        }
    };

    const stopOrderRingtone = () => {
        const audio = orderRingtoneRef.current;
        if (ringtoneRetryTimerRef.current) {
            clearInterval(ringtoneRetryTimerRef.current);
            ringtoneRetryTimerRef.current = null;
        }
        if (ringtoneUnlockHandlerRef.current && typeof window !== 'undefined' && typeof document !== 'undefined') {
            window.removeEventListener('focus', ringtoneUnlockHandlerRef.current);
            document.removeEventListener('visibilitychange', ringtoneUnlockHandlerRef.current);
            document.removeEventListener('pointerdown', ringtoneUnlockHandlerRef.current);
            document.removeEventListener('touchstart', ringtoneUnlockHandlerRef.current);
            document.removeEventListener('keydown', ringtoneUnlockHandlerRef.current);
            ringtoneUnlockHandlerRef.current = null;
        }
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0;
    };

    useEffect(() => {
        shownOrderIdsRef.current = shownOrderIds;
    }, [shownOrderIds]);
    useEffect(() => {
        shownReturnOrderIdsRef.current = shownReturnOrderIds;
    }, [shownReturnOrderIds]);
    useEffect(() => {
        newOrderAlertRef.current = newOrderAlert;
    }, [newOrderAlert]);
    useEffect(() => {
        newReturnAlertRef.current = newReturnAlert;
    }, [newReturnAlert]);

    useEffect(() => {
        if (role !== 'seller' && role !== 'warehouse') {
            setSellerOrders([]);
            setOrdersLoading(false);
            return;
        }
        setOrdersLoading(true);

        const fetchOrders = async () => {
            if (isOrdersFetchInFlightRef.current) return;
            isOrdersFetchInFlightRef.current = true;
            try {
                const api = role === 'warehouse' ? warehouseApi : sellerApi;
                const res = await api.getOrders();
                if (!res?.data?.success) return;

                const payload = res.data.result || {};
                const rawOrders = Array.isArray(payload.items)
                    ? payload.items
                    : (res.data.results || []);
                const allOrders = Array.isArray(rawOrders) ? rawOrders : [];
                setSellerOrders(allOrders);

                const pendingOrders = allOrders.filter(isSellerAlertEligible);

                if (isFirstLoadRef.current) {
                    const existingIds = new Set(pendingOrders.map((o) => o.orderId).filter(Boolean));
                    shownOrderIdsRef.current = existingIds;
                    isFirstLoadRef.current = false;
                    setShownOrderIds(existingIds);
                    return;
                }

                const newOrder = pendingOrders.find((o) => !shownOrderIdsRef.current.has(o.orderId));
                if (!newOrder || newOrderAlertRef.current) return;

                setNewOrderAlert(newOrder);
                setShownOrderIds((prev) => new Set(prev).add(newOrder.orderId));
                shownOrderIdsRef.current = new Set(shownOrderIdsRef.current).add(newOrder.orderId);
                newOrderAlertRef.current = newOrder;
            } catch (error) {
                console.error("Polling Error:", error);
            } finally {
                isOrdersFetchInFlightRef.current = false;
                setOrdersLoading(false);
            }
        };

        fetchOrdersRef.current = fetchOrders;
        fetchOrders();
    }, [role]);

    // Resilient fallback when socket events are missed (tab backgrounded/suspended).
    useEffect(() => {
        if (role !== 'seller' && role !== 'warehouse') return undefined;

        const syncOrders = () => {
            if (fetchOrdersRef.current) fetchOrdersRef.current();
        };

        const timer = setInterval(syncOrders, POLL_INTERVAL_MS);
        const onFocus = () => syncOrders();
        const onVisible = () => {
            if (document.visibilityState === 'visible') syncOrders();
        };
        const onOnline = () => syncOrders();

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('online', onOnline);

        return () => {
            clearInterval(timer);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('online', onOnline);
        };
    }, [role]);

    useEffect(() => {
        if (newOrderAlert) {
            startOrderRingtone();
            return undefined;
        }
        stopOrderRingtone();
        return undefined;
    }, [newOrderAlert]);

    useEffect(() => {
        return () => {
            stopOrderRingtone();
        };
    }, []);

    useEffect(() => {
        if (role === 'seller' || role === 'warehouse') return;
        stopOrderRingtone();
    }, [role]);

    useEffect(() => {
        if (role !== 'seller' && role !== 'warehouse') return undefined;
        const getToken = createSocketTokenReader(role === 'warehouse' ? STORAGE_KEYS.AUTH_WAREHOUSE : STORAGE_KEYS.AUTH_SELLER);
        getOrderSocket(getToken);
        const unsubscribeSellerNew = onSellerOrderNew(getToken, () => {
            if (fetchOrdersRef.current) fetchOrdersRef.current();
        });

        const unsubscribeDrop = onReturnDropOtp(getToken, (payload) => {
            console.log("[DashboardLayout] Received return drop OTP:", payload);
            setReturnDropOtpAlert(payload);
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(() => { });
        });

        return () => {
            unsubscribeSellerNew();
            unsubscribeDrop();
        };
    }, [role]);

    // Admin SOS socket listener
    useEffect(() => {
        if (role !== 'admin') return undefined;
        const getToken = createSocketTokenReader(STORAGE_KEYS.AUTH_ADMIN);
        getOrderSocket(getToken);

        const unsubscribeSOS = onSOSAlert(getToken, (payload) => {
            console.log('[DashboardLayout] SOS Alert received:', payload);
            setSOSAlert(payload);
            // Play alarm sound (same as order alert)
            try {
                if (sosRingtoneRef.current) {
                    sosRingtoneRef.current.pause();
                    sosRingtoneRef.current.currentTime = 0;
                }
                const audio = new Audio(orderAlertSound);
                audio.loop = true;
                audio.volume = 1;
                sosRingtoneRef.current = audio;
                audio.play().catch(() => {});
            } catch(e) {
                console.error('[SOS] Audio play error:', e);
            }
        });

        return () => {
            unsubscribeSOS();
        };
    }, [role]);

    const dismissSOSAlert = () => {
        setSOSAlert(null);
        if (sosRingtoneRef.current) {
            sosRingtoneRef.current.pause();
            sosRingtoneRef.current.currentTime = 0;
            sosRingtoneRef.current = null;
        }
    };

    // Single earnings fetch when seller is on earnings/withdrawals/transactions – no duplicate calls
    useEffect(() => {
        if (role !== 'seller' || !isEarningsRoute(location.pathname)) {
            if (!isEarningsRoute(location.pathname)) earningsFetchedRef.current = false;
            return;
        }
        if (earningsFetchedRef.current) return;
        earningsFetchedRef.current = true;
        setEarningsLoading(true);

        sellerApi
            .getEarnings()
            .then((response) => {
                const raw = response?.data?.result ?? response?.data?.data;
                if (response?.data?.success && raw && typeof raw === 'object') {
                    setSellerEarningsData({
                        balances: raw.balances ?? {},
                        ledger: Array.isArray(raw.ledger) ? raw.ledger : [],
                        monthlyChart: Array.isArray(raw.monthlyChart) ? raw.monthlyChart : [],
                    });
                }
            })
            .catch((err) => console.error("Earnings Fetch Error:", err))
            .finally(() => setEarningsLoading(false));
    }, [role, location.pathname]);

    const refreshOrders = () => {
        if (fetchOrdersRef.current) fetchOrdersRef.current();
    };
    const refreshEarnings = () => {
        earningsFetchedRef.current = false;
        setEarningsLoading(true);
        sellerApi
            .getEarnings()
            .then((response) => {
                const raw = response?.data?.result ?? response?.data?.data;
                if (response?.data?.success && raw && typeof raw === 'object') {
                    setSellerEarningsData({
                        balances: raw.balances ?? {},
                        ledger: Array.isArray(raw.ledger) ? raw.ledger : [],
                        monthlyChart: Array.isArray(raw.monthlyChart) ? raw.monthlyChart : [],
                    });
                }
            })
            .catch((err) => console.error("Earnings Fetch Error:", err))
            .finally(() => {
                setEarningsLoading(false);
                earningsFetchedRef.current = true;
            });
    };

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    // Timer: driven by server expiry (sellerPendingExpiresAt), not a local 60s from modal open
    useEffect(() => {
        if (!newOrderAlert) return undefined;

        const left = secondsLeftUntilSellerExpiry(newOrderAlert);
        if (left <= 0) {
            setNewOrderAlert(null);
            toast.error("This order has already expired — you can no longer accept it.");
            return undefined;
        }

        acceptWindowTotalRef.current = left;
        setTimeLeft(left);

        const timer = setInterval(() => {
            const next = secondsLeftUntilSellerExpiry(newOrderAlertRef.current);
            setTimeLeft(next);
            if (next <= 0) {
                clearInterval(timer);
                setNewOrderAlert(null);
                toast.error("Order timed out!");
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [newOrderAlert]);

    const handleAcceptOrder = async (orderId) => {
        try {
            const api = role === 'warehouse' ? warehouseApi : sellerApi;
            await api.updateOrderStatus(orderId, { status: 'confirmed' });
            toast.success(`Order #${orderId} Accepted!`);
            stopOrderRingtone();
            setNewOrderAlert(null);
        } catch (error) {
            const msg =
                error?.response?.data?.message ||
                "Failed to accept order";
            const normalizedMsg = String(msg).toLowerCase();
            if (
                normalizedMsg.includes('not available') ||
                normalizedMsg.includes('expired')
            ) {
                stopOrderRingtone();
                setNewOrderAlert(null);
                if (fetchOrdersRef.current) fetchOrdersRef.current();
            }
            toast.error(msg);
        }
    };

    const handleDeclineOrder = async (orderId) => {
        try {
            const api = role === 'warehouse' ? warehouseApi : sellerApi;
            await api.updateOrderStatus(orderId, { status: 'cancelled' });
            toast.error(`Order #${orderId} Declined`);
            stopOrderRingtone();
            setNewOrderAlert(null);
        } catch (error) {
            const msg =
                error?.response?.data?.message ||
                "Failed to update order";
            toast.error(msg);
        }
    };

    return (
        <div className="min-h-screen mesh-gradient-light relative">
            {/* Background Blobs for depth */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse pointer-events-none"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-500/5 rounded-full blur-[120px] -z-10 animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

            <Sidebar
                items={navItems}
                title={title}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            <div className="transition-all duration-300 pl-0 md:pl-72">
                <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="p-4 md:p-6 min-h-screen pt-20 md:pt-24 pb-24 md:pb-6">
                    <div className="w-full pb-12">
                        <SellerOrdersContext.Provider
                            value={{
                                orders: role === 'seller' ? sellerOrders : [],
                                ordersLoading: role === 'seller' ? ordersLoading : false,
                                refreshOrders,
                            }}>
                            <WarehouseOrdersContext.Provider
                                value={{
                                    orders: role === 'warehouse' ? sellerOrders : [],
                                    ordersLoading: role === 'warehouse' ? ordersLoading : false,
                                    refreshOrders,
                                }}>
                                <SellerEarningsContext.Provider
                                    value={{
                                        earningsData: role === 'seller' ? sellerEarningsData : defaultEarnings,
                                        earningsLoading: role === 'seller' ? earningsLoading : false,
                                        refreshEarnings,
                                    }}>
                                    {children}
                                </SellerEarningsContext.Provider>
                            </WarehouseOrdersContext.Provider>
                        </SellerOrdersContext.Provider>
                    </div>
                </main>
            </div>

            {/* Global Order Alert Modal */}
            <AnimatePresence>
                {newOrderAlert && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-bounce">
                                    <BellRing className="h-10 w-10 text-primary" />
                                </div>

                                <h2 className="text-2xl font-black text-slate-900 mb-2">New Order Received!</h2>
                                <p className="text-slate-600 font-medium mb-6">
                                    You have a new order <span className="text-primary font-bold">#{newOrderAlert.orderId}</span> for <span className="text-slate-900 font-bold">₹{newOrderAlert.pricing?.total || newOrderAlert.total}</span>
                                </p>

                                {/* Timer Bar — width from real server deadline */}
                                <div className="w-full bg-slate-100 h-2 rounded-full mb-8 overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full transition-[width] duration-1000 ease-linear",
                                            timeLeft < 15 ? "bg-rose-500" : "bg-primary",
                                        )}
                                        style={{
                                            width: `${acceptWindowTotalRef.current > 0 ? (timeLeft / acceptWindowTotalRef.current) * 100 : 0}%`,
                                        }}
                                    />
                                </div>

                                <div className="flex items-center gap-4 text-sm font-bold mb-8">
                                    <Clock className={cn("h-4 w-4", timeLeft < 15 ? "text-rose-500 animate-pulse" : "text-slate-600")} />
                                    <span className={timeLeft < 15 ? "text-rose-500" : "text-slate-600"}>
                                        Accept within {timeLeft} {timeLeft === 1 ? "second" : "seconds"}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 w-full">
                                    <button
                                        onClick={() => handleDeclineOrder(newOrderAlert.orderId)}
                                        className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                        Decline
                                    </button>
                                    <button
                                        onClick={() => handleAcceptOrder(newOrderAlert.orderId)}
                                        className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95"
                                    >
                                        <Check className="h-5 w-5" />
                                        Accept
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Global Return Drop OTP Modal */}
                {returnDropOtpAlert && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-brand-100"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="h-20 w-20 bg-brand-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                    <Truck className="h-10 w-10 text-brand-600" />
                                </div>

                                <h2 className="text-2xl font-black text-slate-900 mb-2">Rider at Store!</h2>
                                <p className="text-slate-600 font-medium mb-6">
                                    A rider is at your store for Return <span className="text-brand-600 font-bold">#{returnDropOtpAlert.orderId}</span>.
                                    Please share the OTP below:
                                </p>

                                <div className="flex items-center justify-center gap-3 mb-8">
                                    {returnDropOtpAlert.otp.split('').map((char, i) => (
                                        <div key={i} className="h-16 w-14 bg-slate-50 rounded-2xl shadow-sm border border-brand-100 flex items-center justify-center text-4xl font-black text-slate-900 border-b-4 border-b-brand-600">
                                            {char}
                                        </div>
                                    ))}
                                </div>

                                <p className="text-xs font-bold text-slate-500 italic mb-8">
                                    Confirm receipt of the product by sharing this code.
                                </p>

                                <button
                                    onClick={() => setReturnDropOtpAlert(null)}
                                    className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95 uppercase tracking-widest text-xs"
                                >
                                    Dismiss Alert
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* SOS Emergency Alert Modal (Admin) */}
            <AnimatePresence>
                {sosAlert && role === 'admin' && (
                    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.8, opacity: 0, y: 30 }}
                            className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border-2 border-red-300"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="h-24 w-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
                                    <AlertTriangle className="h-12 w-12 text-red-600 animate-pulse" />
                                </div>

                                <h2 className="text-2xl font-black text-red-600 mb-2">🚨 SOS EMERGENCY ALERT</h2>
                                <p className="text-slate-600 font-medium mb-6">
                                    A delivery partner needs immediate assistance!
                                </p>

                                <div className="w-full bg-red-50 rounded-2xl p-5 mb-6 text-left">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-12 w-12 rounded-full bg-red-200 flex items-center justify-center">
                                            <AlertTriangle className="h-6 w-6 text-red-700" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg">{sosAlert.deliveryName || 'Unknown Rider'}</h3>
                                            <a href={`tel:${sosAlert.deliveryPhone}`} className="text-sm text-red-600 font-medium flex items-center gap-1 hover:underline">
                                                <Phone size={13} /> {sosAlert.deliveryPhone}
                                            </a>
                                        </div>
                                    </div>

                                    {sosAlert.location?.coordinates && sosAlert.location.coordinates[0] !== 0 && (
                                        <a
                                            href={`https://www.google.com/maps?q=${sosAlert.location.coordinates[1]},${sosAlert.location.coordinates[0]}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors mb-3"
                                        >
                                            <MapPin size={14} /> View Location
                                            <ExternalLink size={12} />
                                        </a>
                                    )}

                                    {sosAlert.emergencyContacts?.length > 0 && (
                                        <div className="mt-3">
                                            <p className="text-xs font-bold text-slate-500 mb-2">EMERGENCY CONTACTS</p>
                                            <div className="space-y-1">
                                                {sosAlert.emergencyContacts.map((c, i) => (
                                                    <a key={i} href={`tel:${c.phone}`} className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-red-50 transition-colors">
                                                        <span className="text-sm font-semibold text-slate-800">{c.name}</span>
                                                        <span className="text-xs text-slate-500 flex items-center gap-1"><Phone size={11} /> {c.phone}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 w-full">
                                    <button
                                        onClick={dismissSOSAlert}
                                        className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                        Dismiss
                                    </button>
                                    <button
                                        onClick={() => {
                                            dismissSOSAlert();
                                            navigate('/admin/sos-alerts');
                                        }}
                                        className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-xl shadow-red-500/20 transition-all active:scale-95"
                                    >
                                        <AlertTriangle className="h-5 w-5" />
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {(role === "admin" || role === "seller") && <BottomNav navItems={navItems} />}
        </div>
    );
};

export default DashboardLayout;
