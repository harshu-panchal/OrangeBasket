import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { employeeApi } from "../services/employeeApi";
import { 
    ChevronLeft, Copy, UserCheck, Calendar, Wallet, CheckCircle, XCircle, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@core/context/SettingsContext";

const EmployeeDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { settings } = useSettings();

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const [empRes, custRes] = await Promise.all([
                employeeApi.getEmployee(id),
                employeeApi.getEmployeeCustomers(id)
            ]);
            setEmployee(empRes.data.result);
            setCustomers(custRes.data.results || custRes.data.result || []);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to fetch employee details");
            navigate("/admin/employees");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyLink = () => {
        const baseUrl = window.location.origin;
        // Adjusted URL path to match where the customer auth page is likely hosted
        const link = `${baseUrl}/auth?ref=${employee?.referralCode}`;
        navigator.clipboard.writeText(link);
        toast.success("Referral link copied!");
    };

    if (isLoading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Employee Details...</p>
            </div>
        );
    }
    if (!employee) return null;

    const stats = employee.stats || {};

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => navigate("/admin/employees")}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        {employee.name}
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            employee.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                            {employee.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">{employee.phone} {employee.email && `• ${employee.email}`}</p>
                </div>
            </div>

            {/* Profile & Referral Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Referral Code</h3>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold text-orange-600 bg-orange-50 px-4 py-2 rounded-xl border border-orange-100">
                            {employee.referralCode}
                        </span>
                        <button 
                            onClick={handleCopyLink}
                            className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors flex items-center gap-2 font-medium text-sm"
                        >
                            <Copy size={18} />
                            Copy Link
                        </button>
                    </div>
                </div>
                
                <div className="flex gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 min-w-[120px]">
                        <p className="text-xs font-semibold text-blue-600 uppercase">Customers</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalCustomers || 0}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 min-w-[120px]">
                        <p className="text-xs font-semibold text-green-600 uppercase">Revenue</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">₹{(stats.revenue || 0).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Sub Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <UserCheck size={20} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Added Today</p>
                        <h3 className="text-xl font-bold text-gray-900">{stats.customersToday || 0}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Added This Month</p>
                        <h3 className="text-xl font-bold text-gray-900">{stats.customersThisMonth || 0}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                        <Wallet size={20} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Orders</p>
                        <h3 className="text-xl font-bold text-gray-900">{stats.totalOrders || 0}</h3>
                    </div>
                </div>
            </div>

            {/* Customer List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-800">Acquired Customers</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Customer Name</th>
                                <th className="px-6 py-4">Phone</th>
                                <th className="px-6 py-4">Joined Date</th>
                                <th className="px-6 py-4 text-center">Orders</th>
                                <th className="px-6 py-4">Wallet</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {customers.map((cust) => (
                                <tr key={cust._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{cust.name || "N/A"}</td>
                                    <td className="px-6 py-4 text-gray-600">{cust.phone}</td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(cust.createdAt).toLocaleDateString("en-IN", {
                                            day: 'numeric', month: 'short', year: 'numeric'
                                        })}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center justify-center px-2 py-1 bg-gray-100 text-gray-700 rounded-md font-semibold min-w-[2rem]">
                                            {cust.orderCount || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-green-600">₹{cust.walletBalance || 0}</td>
                                    <td className="px-6 py-4">
                                        {cust.isActive ? (
                                            <span className="flex items-center gap-1.5 text-green-600 font-medium text-xs">
                                                <CheckCircle size={14} /> Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-red-500 font-medium text-xs">
                                                <XCircle size={14} /> Inactive
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {customers.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        This employee hasn't added any customers yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetail;
