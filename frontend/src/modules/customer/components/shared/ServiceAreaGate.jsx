import React, { useState } from 'react';
import { MapPin, LocateFixed } from 'lucide-react';
import { useSettings } from '@core/context/SettingsContext';
import { isInServiceArea } from '@core/context/SettingsDefaults';
import { useLocation as useAppLocation } from '../../context/LocationContext';
import LocationDrawer from './LocationDrawer';

/**
 * Full-screen block shown when the customer's selected location is outside
 * the delivery service area (Admin → Settings → Service Area).
 */
const ServiceAreaGate = () => {
    const { settings, loading } = useSettings();
    const { currentLocation, refreshLocation, isFetchingLocation } = useAppLocation();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const area = settings?.serviceArea;
    if (loading) return null;
    if (isInServiceArea(area, currentLocation?.latitude, currentLocation?.longitude)) return null;

    const message = area?.message || 'Only available in Nagpur';

    return (
        <>
            <div
                role="alertdialog"
                aria-labelledby="service-area-title"
                className="fixed inset-0 z-[550] bg-white flex items-center justify-center px-6"
            >
                <div className="w-full max-w-sm text-center">
                    <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-orange-50 flex items-center justify-center">
                        <MapPin size={38} className="text-[#FF8200]" strokeWidth={2.2} />
                    </div>

                    <h1 id="service-area-title" className="text-2xl font-black text-slate-900 leading-tight">
                        {message}
                    </h1>

                    {currentLocation?.name && (
                        <p className="mt-3 text-sm text-slate-500">
                            Your location: <span className="font-semibold text-slate-700">{currentLocation.name}</span>
                        </p>
                    )}

                    <div className="mt-8 space-y-3">
                        <button
                            onClick={() => setIsDrawerOpen(true)}
                            className="w-full h-12 rounded-full bg-[#FF8200] text-white font-extrabold shadow-[0_6px_16px_rgba(255,130,0,0.35)] hover:bg-[#E67500] active:scale-95 transition-all"
                        >
                            Change location
                        </button>
                        <button
                            onClick={() => refreshLocation()}
                            disabled={isFetchingLocation}
                            className="w-full h-12 rounded-full border-2 border-[#FF8200] text-[#FF8200] font-extrabold flex items-center justify-center gap-2 hover:bg-orange-50 active:scale-95 transition-all disabled:opacity-60"
                        >
                            <LocateFixed size={18} />
                            {isFetchingLocation ? 'Detecting…' : 'Use my current location'}
                        </button>
                    </div>
                </div>
            </div>

            <LocationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
        </>
    );
};

export default ServiceAreaGate;
