import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@core/context/AuthContext';
import { UserRole } from '@core/constants/roles';
import Button from '@shared/components/ui/Button';
import Input from '@shared/components/ui/Input';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState(UserRole.CUSTOMER);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        // Simulate login for frontend demo
        const userData = {
            id: '1',
            name: `Demo ${role}`,
            email,
            role,
            token: 'demo-token',
        };
        login(userData);
        navigate(`/${role}`);
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-8">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center justify-center">
                    <img 
                        src="/bg%20remove%20logo%20.png" 
                        alt="Orange Basket Logo" 
                        className="h-32 w-auto object-contain" 
                    />
                </div>
                
                <div className="text-left">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Login / Signup
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">
                        Enter your details to continue
                    </p>
                </div>

                <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email address"
                                className="block w-full rounded-lg border border-gray-200 px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="block w-full rounded-lg border border-gray-200 px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <select
                                className="block w-full rounded-lg border border-gray-200 px-4 py-3.5 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 sm:text-sm bg-white"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            >
                                <option value={UserRole.CUSTOMER}>Customer</option>
                                <option value={UserRole.SELLER}>Seller</option>
                                <option value={UserRole.ADMIN}>Admin</option>
                                <option value={UserRole.DELIVERY}>Delivery Partner</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="flex w-full justify-center rounded-xl bg-[#f97316] px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                        >
                            Continue
                        </button>
                    </div>

                    <div className="mt-6 text-center space-y-2">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <span className="cursor-pointer font-medium text-[#f97316] hover:text-orange-600" onClick={() => navigate('/signup')}>
                                Sign up
                            </span>
                        </p>
                        <p className="text-sm text-gray-600">
                            Are you a seller?{' '}
                            <span className="cursor-pointer font-medium text-[#f97316] hover:text-orange-600" onClick={() => navigate('/seller/auth')}>
                                Join as Partner
                            </span>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
