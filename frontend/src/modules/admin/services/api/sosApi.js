import axiosInstance from '@core/api/axios';

/**
 * Admin SOS alert management endpoints.
 */
export const adminSOSApi = {
    getSOSAlerts: (params) =>
        axiosInstance.get('/admin/sos-alerts', { params }),
    acknowledgeSOSAlert: (id) =>
        axiosInstance.put(`/admin/sos-alerts/${id}/acknowledge`),
    resolveSOSAlert: (id, data) =>
        axiosInstance.put(`/admin/sos-alerts/${id}/resolve`, data),
};

export default adminSOSApi;
