import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, Camera, Save } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@core/context/AuthContext';
import { customerApi } from '../services/customerApi';

const EditProfilePage = () => {
    const navigate = useNavigate();
    const { user, login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
        email: user?.email || '',
        bio: user?.bio || ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                phone: user.phone || '',
                email: user.email || '',
                bio: user.bio || ''
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await customerApi.updateProfile(formData);
            const updatedUser = response.data.result;

            // Update local auth state
            login({ ...user, ...updatedUser });

            toast.success('Profile updated successfully!');
            navigate('/profile');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans pb-10">
            {/* Header */}
            <div className="bg-white sticky top-0 z-30 px-4 py-3 flex items-center gap-3 shadow-sm">
                <Link to="/profile" className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
                    <ArrowLeft size={24} className="text-slate-600" />
                </Link>
                <h1 className="text-lg font-black text-slate-800">Edit Profile</h1>
            </div>

            <div className="max-w-xl mx-auto p-5">

                {/* Profile Picture Upload */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative">
                        <div className="h-28 w-28 rounded-full bg-slate-200 border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
                            <User size={48} className="text-slate-400" />
                        </div>
                        <button className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full border-2 border-white shadow-sm hover:bg-[#0a701a] transition-colors">
                            <Camera size={18} />
                        </button>
                    </div>
                    <p className="mt-3 text-sm font-bold text-primary">Change Photo</p>
                </div>

                {/* Edit Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                            <div className="flex items-center gap-3 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                                <div className="w-9 h-9 rounded-full bg-amber-50/80 border border-amber-100 flex items-center justify-center shrink-0">
                                    <span className="text-sm">👤</span>
                                </div>
                                <input
                                    type="text"
                                    name="name"
                                    maxLength={50}
                                    pattern="[a-zA-Z\s]*"
                                    value={formData.name}
                                    onChange={(e) => {
                                        e.target.value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                        handleChange(e);
                                    }}
                                    className="bg-transparent w-full text-slate-800 font-bold outline-none placeholder:font-medium text-sm"
                                    placeholder="Enter your name"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
                            <div className="flex items-center gap-3 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                                <div className="w-9 h-9 rounded-full bg-emerald-50/80 border border-emerald-100 flex items-center justify-center shrink-0">
                                    <span className="text-sm">📞</span>
                                </div>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="bg-transparent w-full text-slate-800 font-bold outline-none placeholder:font-medium text-sm"
                                    placeholder="Enter phone number"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                            <div className="flex items-center gap-3 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                                <div className="w-9 h-9 rounded-full bg-blue-50/80 border border-blue-100 flex items-center justify-center shrink-0">
                                    <span className="text-sm">✉️</span>
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="bg-transparent w-full text-slate-800 font-bold outline-none placeholder:font-medium text-sm"
                                    placeholder="Enter email address"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bio</label>
                            <div className="flex gap-3 bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                                <div className="w-9 h-9 rounded-full bg-purple-50/80 border border-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-sm">📝</span>
                                </div>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleChange}
                                    rows="3"
                                    className="w-full bg-transparent outline-none text-slate-800 font-medium text-sm resize-none"
                                    placeholder="Tell us about yourself..."
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-brand-200 hover:bg-[#0a701a] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save size={20} />
                        )}
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>

            </div>
        </div>
    );
};

export default EditProfilePage;

