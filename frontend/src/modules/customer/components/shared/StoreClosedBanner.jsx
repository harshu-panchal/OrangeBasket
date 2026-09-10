import React from 'react';
import { useSettings } from '@core/context/SettingsContext';

const StoreClosedBanner = () => {
    const { settings } = useSettings();
    const { isClosed, reopenTime, message } = settings?.storeStatus || {};

    if (!isClosed) return null;

    return (
        <div className="w-full bg-[var(--primary)] text-white border-b-[4px] border-black/20 flex flex-col items-center justify-center py-2 px-4 shadow-sm z-[300]">
            <span className="text-sm font-bold mb-0.5">
                {reopenTime ? `Please come back at ${reopenTime}` : 'Store currently closed'}
            </span>
            <span className="text-2xl sm:text-3xl font-black tracking-wide">
                {message || 'Store closed'}
            </span>
        </div>
    );
};

export default StoreClosedBanner;
