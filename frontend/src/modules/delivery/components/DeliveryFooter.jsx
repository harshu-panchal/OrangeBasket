import React from 'react';

const DeliveryFooter = () => {
    return (
        <div className="mt-12 pt-8 flex flex-col items-center justify-center text-center overflow-visible -mb-24">
            <div className="space-y-1 mb-6">
                <h3 className="text-[28px] leading-[1.1] font-black text-[#d0dbe3] tracking-tight">
                    India's last<br/>minute app <span className="inline-block relative top-1">❤️</span>
                </h3>
                <p className="text-[22px] font-black text-[#d0dbe3] tracking-tighter mt-2">
                    orangebasket
                </p>
            </div>
            
            <div className="w-full max-w-[240px] mt-8 opacity-95">
                <img 
                    src="/deliveryboybg.png" 
                    alt="Delivery Partner" 
                    className="w-full h-auto object-contain drop-shadow-md mix-blend-multiply"
                />
            </div>
        </div>
    );
};

export default DeliveryFooter;
