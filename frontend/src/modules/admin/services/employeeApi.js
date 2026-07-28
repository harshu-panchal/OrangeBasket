import api from "@core/api/axios";

export const employeeApi = {
    createEmployee: (data) => api.post("/employees", data),
    listEmployees: () => api.get("/employees"),
    getEmployee: (id) => api.get(`/employees/${id}`),
    updateEmployee: (id, data) => api.patch(`/employees/${id}`, data),
    deleteEmployee: (id) => api.delete(`/employees/${id}`),
    getEmployeeCustomers: (id) => api.get(`/employees/${id}/customers`),
    getLeaderboard: () => api.get("/employees/leaderboard"),
    validateReferralCode: (code) => api.get(`/employees/validate/${code}`),
};
