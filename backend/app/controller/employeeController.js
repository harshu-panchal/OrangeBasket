import Employee from "../models/employee.js";
import Customer from "../models/customer.js";
import Order from "../models/order.js";
import handleResponse from "../utils/helper.js";

// Admin: Create Employee
export const createEmployee = async (req, res) => {
    try {
        const { name, phone, email } = req.body;
        
        // Validation
        if (!name || !phone) {
            return handleResponse(res, 400, "Name and phone are required");
        }

        const existing = await Employee.findOne({ phone });
        if (existing) {
            return handleResponse(res, 400, "Employee with this phone already exists");
        }

        const employee = new Employee({
            name,
            phone,
            email,
            createdBy: req.user.id
        });

        await employee.save();

        return handleResponse(res, 201, "Employee created successfully", employee);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// Admin: List Employees with stats
export const listEmployees = async (req, res) => {
    try {
        const employees = await Employee.find().sort({ createdAt: -1 }).lean();
        
        // Aggregate stats for each employee
        const enrichedEmployees = await Promise.all(
            employees.map(async (emp) => {
                // Customers acquired by this employee
                const customers = await Customer.find({ referredBy: emp._id }).lean();
                const customerIds = customers.map(c => c._id);
                
                // Active customers
                const activeCustomersCount = customers.filter(c => c.isActive).length;
                
                // Orders by these customers
                const orders = await Order.find({ user: { $in: customerIds }, status: "Delivered" }).lean();
                
                // Revenue
                const revenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

                return {
                    ...emp,
                    stats: {
                        totalCustomers: customers.length,
                        activeCustomers: activeCustomersCount,
                        totalOrders: orders.length,
                        revenue
                    }
                };
            })
        );

        return handleResponse(res, 200, "Employees fetched", enrichedEmployees);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// Admin: Get Employee Detail
export const getEmployee = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id).lean();
        if (!employee) {
            return handleResponse(res, 404, "Employee not found");
        }
        
        const customers = await Customer.find({ referredBy: employee._id }).lean();
        const customerIds = customers.map(c => c._id);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const customersToday = customers.filter(c => new Date(c.createdAt) >= today).length;
        const customersThisMonth = customers.filter(c => new Date(c.createdAt) >= startOfMonth).length;

        const orders = await Order.find({ user: { $in: customerIds }, status: "Delivered" }).lean();
        const revenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        
        return handleResponse(res, 200, "Employee fetched", {
            ...employee,
            stats: {
                totalCustomers: customers.length,
                customersToday,
                customersThisMonth,
                totalOrders: orders.length,
                revenue
            }
        });
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// Admin: Update Employee
export const updateEmployee = async (req, res) => {
    try {
        const { name, phone, email, isActive } = req.body;
        
        const employee = await Employee.findById(req.params.id);
        if (!employee) {
            return handleResponse(res, 404, "Employee not found");
        }
        
        if (name) employee.name = name;
        if (phone) employee.phone = phone;
        if (email) employee.email = email;
        if (isActive !== undefined) employee.isActive = isActive;
        
        await employee.save();
        
        return handleResponse(res, 200, "Employee updated successfully", employee);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// Admin: Delete Employee (Soft delete)
export const deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!employee) {
            return handleResponse(res, 404, "Employee not found");
        }
        return handleResponse(res, 200, "Employee deleted successfully");
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// Admin: Get Customers of an Employee
export const getEmployeeCustomers = async (req, res) => {
    try {
        const employeeId = req.params.id;
        
        // Find customers
        const customers = await Customer.find({ referredBy: employeeId })
            .select("name phone createdAt isActive walletBalance")
            .sort({ createdAt: -1 })
            .lean();
            
        // Get order count for each
        const enrichedCustomers = await Promise.all(
            customers.map(async (c) => {
                const orderCount = await Order.countDocuments({ user: c._id });
                return {
                    ...c,
                    orderCount
                };
            })
        );
            
        return handleResponse(res, 200, "Customers fetched", enrichedCustomers);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// Admin: Get Leaderboard
export const getLeaderboard = async (req, res) => {
    try {
        const employees = await Employee.find({ isActive: true }).lean();
        
        const leaderboard = await Promise.all(
            employees.map(async (emp) => {
                const customers = await Customer.find({ referredBy: emp._id }).lean();
                const customerIds = customers.map(c => c._id);
                const activeCustomersCount = customers.filter(c => c.isActive).length;
                const orders = await Order.find({ user: { $in: customerIds }, status: "Delivered" }).lean();
                const revenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
                
                return {
                    _id: emp._id,
                    name: emp.name,
                    referralCode: emp.referralCode,
                    totalCustomers: customers.length,
                    activeCustomers: activeCustomersCount,
                    totalOrders: orders.length,
                    revenue
                };
            })
        );
        
        // Sort by totalCustomers descending
        leaderboard.sort((a, b) => b.totalCustomers - a.totalCustomers);
        
        return handleResponse(res, 200, "Leaderboard fetched", leaderboard);
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

// Public: Validate Referral Code
export const validateReferralCode = async (req, res) => {
    try {
        const code = req.params.code?.toUpperCase();
        if (!code) {
            return handleResponse(res, 400, "Referral code required");
        }
        
        const employee = await Employee.findOne({ referralCode: code, isActive: true });
        
        if (!employee) {
            return handleResponse(res, 404, "Invalid or inactive referral code");
        }
        
        return handleResponse(res, 200, "Valid code", { 
            valid: true,
            employeeName: employee.name,
            referralCode: employee.referralCode
        });
    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};
