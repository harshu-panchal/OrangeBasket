import axiosInstance from '@core/api/axios';

export const warehouseApi = {
    login: (data) => axiosInstance.post('/warehouse/login', data),
    signup: (data) => axiosInstance.post('/warehouse/signup', data),
    checkExists: (data) => axiosInstance.post('/warehouse/check-exists', data),
    sendVerificationOtp: (data) => axiosInstance.post('/warehouse/verification/send-otp', data),
    verifyVerificationOtp: (data) => axiosInstance.post('/warehouse/verification/verify-otp', data),
    sendResetOtp: (data) => axiosInstance.post('/warehouse/forgot-password/send-otp', data),
    verifyResetOtp: (data) => axiosInstance.post('/warehouse/forgot-password/verify-otp', data),
    resetPassword: (data) => axiosInstance.post('/warehouse/reset-password', data),

    // Products (shared endpoint — warehouse uses same product API)
    getProducts: (params) => axiosInstance.get('/products/seller/me', { params }),
    getProductById: (id) => axiosInstance.get(`/products/${id}`),
    createProduct: (data) => axiosInstance.post('/products', data),
    updateProduct: (id, data) => axiosInstance.put(`/products/${id}`, data),
    deleteProduct: (id) => axiosInstance.delete(`/products/${id}`),

    // Categories (Public)
    getCategories: () => axiosInstance.get('/admin/categories'),
    getCategoryTree: () => axiosInstance.get('/admin/categories?tree=true'),

    // Dashboard & Stats
    getStats: (range) => axiosInstance.get('/warehouse/stats', { params: { range } }),

    // Orders (shared order endpoints)
    getOrders: (params) => axiosInstance.get('/orders/seller-orders', { params }),
    updateOrderStatus: (orderId, data) => axiosInstance.put(`/orders/status/${orderId}`, data),

    // Financials
    getEarnings: () => axiosInstance.get('/warehouse/earnings'),
    getWalletSummary: () => axiosInstance.get('/warehouse/wallet/summary'),
    requestWithdrawal: (data) => axiosInstance.post('/warehouse/request-withdrawal', data),

    // Profile
    getProfile: () => axiosInstance.get('/warehouse/profile'),
    updateProfile: (data) => axiosInstance.put('/warehouse/profile', data),

    // Stock
    adjustStock: (data) => axiosInstance.post('/products/adjust-stock', data),
    getStockHistory: () => axiosInstance.get('/products/stock-history'),

    // Notifications
    getNotifications: () => axiosInstance.get('/notifications'),
    markNotificationRead: (id) => axiosInstance.put(`/notifications/${id}/read`),
    markAllNotificationsRead: () => axiosInstance.put('/notifications/mark-all-read'),

    // Returns
    getReturns: (params) => axiosInstance.get('/orders/seller-returns', { params }),
    getReturnDetails: (orderId) => axiosInstance.get(`/orders/${orderId}/returns`),
    approveReturn: (orderId, data) => axiosInstance.put(`/orders/returns/${orderId}/approve`, data),
    rejectReturn: (orderId, data) => axiosInstance.put(`/orders/returns/${orderId}/reject`, data),
    assignReturnDelivery: (orderId, data) => axiosInstance.put(`/orders/returns/${orderId}/assign-delivery`, data),
};
