import React from 'react';
import { ChevronLeft, Truck, Heart, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const AboutPage = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const appName = settings?.appName || 'App';
    return (
        <div className="min-h-screen bg-white font-['Outfit',_sans-serif] pb-24">
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 pt-4 pb-3 border-b border-slate-100 mb-4 flex items-center gap-2">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors -ml-1"
                >
                    <ChevronLeft size={22} className="text-slate-800" />
                </button>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">About Us</h1>
            </div>

            <div className="px-4 pt-1 max-w-3xl mx-auto space-y-4">

                {/* Hero Section */}
                <div className="rounded-2xl p-6 text-center bg-white border border-slate-100 shadow-sm">
                    <div className="flex flex-col items-center">
                        <div className="w-14 h-14 rounded-full bg-brand-50/80 border border-brand-100 flex items-center justify-center shadow-xs mb-3">
                            <span className="text-2xl">🛍️</span>
                        </div>
                        <h2 className="text-xl font-extrabold mb-1 tracking-tight text-slate-900">{appName}</h2>
                        <p className="text-slate-600 text-sm font-medium max-w-sm mx-auto">Delivering happiness to your doorstep in minutes.</p>
                    </div>
                </div>

                {/* Mission Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3.5 mb-3">
                        <div className="w-11 h-11 rounded-full bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-700 shadow-2xs shrink-0">
                            <span className="text-lg">🚚</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-800">Our Mission</h3>
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed text-sm">
                        To revolutionize quick commerce by providing the fastest, most reliable delivery of daily essentials, ensuring quality and convenience for every household.
                    </p>
                </div>

                {/* Values Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3.5 mb-3">
                        <div className="w-11 h-11 rounded-full bg-rose-50/80 border border-rose-100 flex items-center justify-center text-rose-700 shadow-2xs shrink-0">
                            <span className="text-lg">❤️</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-800">Our Values</h3>
                    </div>
                    <ul className="space-y-3 text-sm text-slate-600 font-medium">
                        <li className="flex gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <span><strong>Customer First:</strong> Your satisfaction is our top priority.</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <span><strong>Quality Assurance:</strong> We deliver only the freshest and best products.</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <span><strong>Speed with Safety:</strong> Fast delivery without compromising on safety standards.</span>
                        </li>
                    </ul>
                </div>

                <div className="text-center pt-2">
                    <p className="text-xs font-semibold text-slate-400">© {new Date().getFullYear()} {appName}. All rights reserved.</p>
                </div>

            </div>
        </div>
    );
};

export default AboutPage;
