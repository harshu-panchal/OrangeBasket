import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@core/context/AuthContext';
import { useSettings } from '@core/context/SettingsContext';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { customerApi } from '../services/customerApi';

const CustomerAuth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showOtp, setShowOtp] = useState(false);
    const [timer, setTimer] = useState(0);
    const { login } = useAuth();
    const { settings } = useSettings();
    const appName = settings?.appName || 'App';
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        phone: '',
        otp: '',
        name: ''
    });

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleSendOtp = async (e) => {
        e?.preventDefault();
        if (formData.phone.length !== 10) {
            toast.error('Enter valid 10-digit number');
            return;
        }
        if (!isLogin && !formData.name.trim()) {
            toast.error('Please enter your full name');
            return;
        }
        
        setIsLoading(true);
        try {
            if (isLogin) {
                await customerApi.sendLoginOtp({ phone: formData.phone });
            } else {
                await customerApi.sendSignupOtp({ name: formData.name, phone: formData.phone });
            }
            setShowOtp(true);
            setTimer(30);
            toast.success('OTP sent!');
        } catch (error) {
            const apiMessage = error?.response?.data?.message || 'Failed to send OTP';
            toast.error(apiMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (formData.otp.length !== 4) {
            toast.error('Enter 4-digit code');
            return;
        }
        setIsLoading(true);
        try {
            const response = await customerApi.verifyOtp({ phone: formData.phone, otp: formData.otp });
            const { token, customer } = response.data.result;
            login({ ...customer, token, role: 'customer' });
            toast.success('Successfully Logged In!');
            navigate('/');
        } catch (error) {
            const apiMessage = error?.response?.data?.message;
            toast.error(apiMessage || 'Invalid OTP');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-8 font-['Outfit',_sans-serif]">
            <div className="w-full max-w-[380px] bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50">
                {/* Logo */}
                <div className="flex flex-col items-center justify-center mb-6">
                    <img 
                        src="/bg%20remove%20logo%20.png" 
                        alt="Logo" 
                        className="h-28 w-auto object-contain" 
                    />
                </div>
                
                {!showOtp ? (
                    <>
                        <div className="text-left mb-6">
                            <h2 className="text-xl font-bold text-gray-900">
                                Login / Signup
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                {isLogin ? 'Enter your mobile number' : 'Create a new account'}
                            </p>
                        </div>

                        <form className="space-y-4" onSubmit={handleSendOtp}>
                            {!isLogin && (
                                <div className="relative">
                                    <input
                                        required
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        placeholder="Full Name"
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-semibold text-gray-800 outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] transition-all"
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="relative flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#f97316] focus-within:ring-1 focus-within:ring-[#f97316] transition-all bg-white">
                                <div className="pl-4 pr-3 py-3.5 font-bold text-gray-600 border-r border-gray-200 bg-gray-50">
                                    +91
                                </div>
                                <input
                                    required
                                    type="tel"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    autoComplete="tel"
                                    name="phone"
                                    value={formData.phone}
                                    maxLength={10}
                                    placeholder={isLogin ? "9671310143" : "Mobile Number"}
                                    className="w-full px-4 py-3.5 text-sm font-semibold text-gray-800 outline-none bg-transparent"
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-2 text-white bg-[#f97316] hover:bg-orange-600 py-3.5 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center gap-3 transition-all"
                            >
                                {isLoading ? 'Please wait...' : 'Continue'}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-sm font-semibold text-gray-500 hover:text-[#f97316] transition-colors"
                            >
                                {isLogin ? "New user? Create an account" : "Already have an account? Login"}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-left mb-6">
                            <div className="flex items-center gap-3 mb-1">
                                <button
                                    onClick={() => setShowOtp(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <h2 className="text-xl font-bold text-gray-900">
                                    Verify OTP
                                </h2>
                            </div>
                            <p className="mt-1 text-sm text-gray-500 ml-8">
                                Sent to +91 {formData.phone}
                            </p>
                        </div>

                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="flex justify-center gap-2">
                                {[...Array(4)].map((_, i) => (
                                    <input
                                        key={i}
                                        type="tel"
                                        maxLength={1}
                                        className="w-12 h-14 bg-gray-50 border border-gray-200 rounded-xl text-center text-xl font-bold text-gray-900 outline-none focus:bg-white focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316] transition-all"
                                        value={formData.otp[i] || ''}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Backspace' && !e.target.value && i > 0) {
                                                e.target.previousElementSibling.focus();
                                            }
                                        }}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val && i < 3) (e.target.nextElementSibling).focus();
                                            const otpArr = formData.otp.split('');
                                            otpArr[i] = val;
                                            setFormData({ ...formData, otp: otpArr.join('') });
                                        }}
                                    />
                                ))}
                            </div>

                            <div className="space-y-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full text-white bg-[#f97316] hover:bg-orange-600 py-3.5 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center transition-all"
                                >
                                    {isLoading ? 'Verifying...' : `Verify & Proceed`}
                                </button>
                                <div className="flex justify-center">
                                    <button
                                        type="button"
                                        disabled={timer > 0}
                                        onClick={handleSendOtp}
                                        className={`text-sm font-semibold ${timer > 0 ? 'text-gray-400' : 'text-[#f97316] hover:underline'}`}
                                    >
                                        {timer > 0 ? `Resend Code in ${timer}s` : 'Resend Code'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </>
                )}

                {/* Legal Agreement Footer */}
                <div className="pt-8 flex flex-col items-center gap-1.5">
                    <p className="text-[11px] text-gray-400 text-center font-medium">
                        By continuing, you agree to our
                    </p>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => navigate('/terms')}
                            className="text-[11px] font-semibold text-gray-500 hover:text-[#f97316] transition-colors"
                        >
                            Terms & Conditions
                        </button>
                        <span className="text-[10px] text-gray-300">•</span>
                        <button 
                            onClick={() => navigate('/privacy-policy')}
                            className="text-[11px] font-semibold text-gray-500 hover:text-[#f97316] transition-colors"
                        >
                            Privacy Policy
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerAuth;


