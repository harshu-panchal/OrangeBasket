import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { employeeApi } from "../services/employeeApi";
import { 
    Users, Plus, Search, ChevronRight, TrendingUp, UserPlus, FileText, BadgeIndianRupee, Loader2
} from "lucide-react";
import { toast } from "sonner";

const EmployeeManagement = () => {
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        email: ""
    });

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await employeeApi.listEmployees();
            setEmployees(res.data.results || res.data.result || []);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to fetch employees");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        try {
            await employeeApi.createEmployee(formData);
            toast.success("Employee created successfully");
            setIsAddModalOpen(false);
            setFormData({ name: "", phone: "", email: "" });
            fetchEmployees();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to create employee");
        }
    };

    const filteredEmployees = employees.filter(emp => 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        emp.referralCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.phone.includes(searchQuery)
    );

    const totalCustomers = employees.reduce((sum, emp) => sum + (emp.stats?.totalCustomers || 0), 0);
    const totalOrders = employees.reduce((sum, emp) => sum + (emp.stats?.totalOrders || 0), 0);
    const totalRevenue = employees.reduce((sum, emp) => sum + (emp.stats?.revenue || 0), 0);

    if (isLoading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Employees...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Employee Referral System</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage field agents and their acquired customers</p>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-sm"
                >
                    <Plus size={20} />
                    Add Employee
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Employees</p>
                        <h3 className="text-2xl font-bold text-gray-900">{employees.length}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                        <UserPlus size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Customers Added</p>
                        <h3 className="text-2xl font-bold text-gray-900">{totalCustomers}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Orders</p>
                        <h3 className="text-2xl font-bold text-gray-900">{totalOrders}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                        <BadgeIndianRupee size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Revenue Generated</p>
                        <h3 className="text-2xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-800">Employee Leaderboard</h2>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search employees..." 
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Rank</th>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Referral Code</th>
                                <th className="px-6 py-4">Customers</th>
                                <th className="px-6 py-4">Orders</th>
                                <th className="px-6 py-4">Revenue</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredEmployees.sort((a, b) => (b.stats?.totalCustomers || 0) - (a.stats?.totalCustomers || 0)).map((emp, index) => (
                                <tr key={emp._id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => navigate(`/admin/employees/${emp._id}`)}>
                                    <td className="px-6 py-4">
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                            index === 1 ? 'bg-gray-200 text-gray-700' :
                                            index === 2 ? 'bg-orange-100 text-orange-700' :
                                            'bg-gray-100 text-gray-500'
                                        }`}>
                                            #{index + 1}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-gray-900">{emp.name}</div>
                                        <div className="text-gray-500 text-xs mt-0.5">{emp.phone}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                            {emp.referralCode}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{emp.stats?.totalCustomers || 0}</div>
                                        <div className="text-xs text-gray-500">{emp.stats?.activeCustomers || 0} Active</div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{emp.stats?.totalOrders || 0}</td>
                                    <td className="px-6 py-4 font-medium text-green-600">₹{(emp.stats?.revenue || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                            emp.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {emp.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-gray-400 group-hover:text-orange-500 transition-colors">
                                            <ChevronRight size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredEmployees.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                        No employees found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Add New Employee</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input 
                                    type="text" required
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                                <input 
                                    type="tel" required
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address (Optional)</label>
                                <input 
                                    type="email"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors">Create Employee</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeManagement;
