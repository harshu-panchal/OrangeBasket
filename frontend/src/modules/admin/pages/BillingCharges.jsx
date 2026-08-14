// Premium Billing & Financial Configuration System
import React, { useState, useEffect } from 'react';
import Card from '@shared/components/ui/Card';
import {
    RotateCcw,
    Save,
    Info,
    Truck,
    Settings,
    Zap,
    MapPin,
    History,
    Bike
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@shared/components/ui/Toast';
import { adminApi } from '../services/adminApi';

const BillingCharges = () => {
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const [config, setConfig] = useState({
        platformFee: 0,
        freeDeliveryThreshold: 0,
        handlingFeeStrategy: "highest_category_fee",
        codEnabled: true,
        onlineEnabled: true,
        // Customer
        customerPricingType: 'distance',
        customerFixedCharge: 30,
        customerBaseDistance: 4,
        customerBaseCharge: 30,
        customerExtraPerKm: 10,
        // Rider
        riderEarningType: 'distance',
        riderFixedEarning: 20,
        riderBaseDistance: 4,
        riderBaseEarning: 25,
        riderExtraPerKm: 5,
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const [platformRes, deliveryRes] = await Promise.all([
                    adminApi.getPlatformSettings(),
                    adminApi.getDeliveryFinanceSettings(),
                ]);

                if (deliveryRes.data?.success && deliveryRes.data.result) {
                    const s = deliveryRes.data.result;
                    setConfig((prev) => ({
                        ...prev,
                        handlingFeeStrategy: s.handlingFeeStrategy ?? prev.handlingFeeStrategy,
                        codEnabled: s.codEnabled ?? prev.codEnabled,
                        onlineEnabled: s.onlineEnabled ?? prev.onlineEnabled,
                        // Customer
                        customerPricingType: s.customerPricingType || 'distance',
                        customerFixedCharge: s.customerFixedCharge ?? prev.customerFixedCharge,
                        customerBaseDistance: s.customerBaseDistance ?? prev.customerBaseDistance,
                        customerBaseCharge: s.customerBaseCharge ?? prev.customerBaseCharge,
                        customerExtraPerKm: s.customerExtraPerKm ?? prev.customerExtraPerKm,
                        // Rider
                        riderEarningType: s.riderEarningType || 'distance',
                        riderFixedEarning: s.riderFixedEarning ?? prev.riderFixedEarning,
                        riderBaseDistance: s.riderBaseDistance ?? prev.riderBaseDistance,
                        riderBaseEarning: s.riderBaseEarning ?? prev.riderBaseEarning,
                        riderExtraPerKm: s.riderExtraPerKm ?? prev.riderExtraPerKm,
                    }));
                }
            } catch (error) {
                console.error('Failed to load settings', error);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await adminApi.updateDeliveryFinanceSettings({
                handlingFeeStrategy: config.handlingFeeStrategy,
                codEnabled: config.codEnabled,
                onlineEnabled: config.onlineEnabled,
                customerPricingType: config.customerPricingType,
                customerFixedCharge: config.customerFixedCharge,
                customerBaseDistance: config.customerBaseDistance,
                customerBaseCharge: config.customerBaseCharge,
                customerExtraPerKm: config.customerExtraPerKm,
                riderEarningType: config.riderEarningType,
                riderFixedEarning: config.riderFixedEarning,
                riderBaseDistance: config.riderBaseDistance,
                riderBaseEarning: config.riderBaseEarning,
                riderExtraPerKm: config.riderExtraPerKm,
            });

            showToast('Delivery finance settings updated', 'success');
        } catch (error) {
            console.error('Failed to update fees settings', error);
            showToast('Failed to update fees settings', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1">
                <div>
                    <h1 className="admin-h1 flex items-center gap-3">
                        Fees & Charges
                        <div className="p-2 bg-red-100 rounded-xl">
                            <RotateCcw className="h-5 w-5 text-red-600" />
                        </div>
                    </h1>
                    <p className="admin-description mt-1">Set up delivery fees, platform charges, and free delivery limits.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-5 py-3 bg-white ring-1 ring-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
                        <History className="h-4 w-4 text-slate-400" />
                        AUDIT LOGS
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 bg-black  text-primary-foreground rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-brand-100 active:scale-95",
                            isSaving ? "opacity-70 cursor-wait" : "hover:bg-brand-700"
                        )}
                    >
                        {isSaving ? (
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto text-left">
                <div className="space-y-8">
                    
                    {/* Customer Delivery Fee Settings */}
                    <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-[32px] overflow-hidden">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                <Truck className="h-4 w-4 text-brand-500" />
                                Customer Delivery Charge
                            </h3>
                            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                                <button
                                    onClick={() => setConfig(prev => ({...prev, customerPricingType: 'fixed'}))}
                                    className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", config.customerPricingType === 'fixed' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}
                                >Fixed Price</button>
                                <button
                                    onClick={() => setConfig(prev => ({...prev, customerPricingType: 'distance'}))}
                                    className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", config.customerPricingType === 'distance' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}
                                >Distance Based</button>
                            </div>
                        </div>
                        <div className="p-8">
                            {config.customerPricingType === 'distance' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Distance (km)</label>
                                        <input
                                            type="number" step="0.1"
                                            value={config.customerBaseDistance}
                                            onChange={(e) => handleInputChange('customerBaseDistance', e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-900 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Charge (₹)</label>
                                        <input
                                            type="number"
                                            value={config.customerBaseCharge}
                                            onChange={(e) => handleInputChange('customerBaseCharge', e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-900 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extra Per Km (₹)</label>
                                        <input
                                            type="number"
                                            value={config.customerExtraPerKm}
                                            onChange={(e) => handleInputChange('customerExtraPerKm', e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-900 outline-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="space-y-3 max-w-md">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fixed Charge (₹)</label>
                                        <input
                                            type="number"
                                            value={config.customerFixedCharge}
                                            onChange={(e) => handleInputChange('customerFixedCharge', e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-900 outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Delivery Boy Earning Settings */}
                    <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-[32px] overflow-hidden">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                <Bike className="h-4 w-4 text-emerald-500" />
                                Delivery Boy Earning
                            </h3>
                            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                                <button
                                    onClick={() => setConfig(prev => ({...prev, riderEarningType: 'fixed'}))}
                                    className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", config.riderEarningType === 'fixed' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}
                                >Fixed Payout</button>
                                <button
                                    onClick={() => setConfig(prev => ({...prev, riderEarningType: 'distance'}))}
                                    className={cn("px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", config.riderEarningType === 'distance' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}
                                >Distance Based</button>
                            </div>
                        </div>
                        <div className="p-8">
                            {config.riderEarningType === 'distance' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Distance (km)</label>
                                        <input
                                            type="number" step="0.1"
                                            value={config.riderBaseDistance}
                                            onChange={(e) => handleInputChange('riderBaseDistance', e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-900 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Earning (₹)</label>
                                        <input
                                            type="number"
                                            value={config.riderBaseEarning}
                                            onChange={(e) => handleInputChange('riderBaseEarning', e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-900 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extra Per Km (₹)</label>
                                        <input
                                            type="number"
                                            value={config.riderExtraPerKm}
                                            onChange={(e) => handleInputChange('riderExtraPerKm', e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-900 outline-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="space-y-3 max-w-md">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fixed Earning (₹)</label>
                                        <input
                                            type="number"
                                            value={config.riderFixedEarning}
                                            onChange={(e) => handleInputChange('riderFixedEarning', e.target.value)}
                                            className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black text-slate-900 outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                </div>
            </div>
        </div>
    );
};

export default BillingCharges;
