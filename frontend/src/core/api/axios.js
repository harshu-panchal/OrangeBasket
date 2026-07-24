import axios from 'axios';
import { resolveApiBaseUrl } from './resolveApiBaseUrl';
import { getStoredAuthToken } from '@core/utils/authStorage';
import { getActiveRole, ROLES } from '@core/auth/activeRoleStore';
import { rawGet, STORAGE_KEYS } from '@core/utils/storage';
import { globalLoadingManager } from '../../modules/customer/context/PageTransitionContext';

const ROLE_STORAGE_KEYS = [
    STORAGE_KEYS.AUTH_SELLER,
    STORAGE_KEYS.AUTH_ADMIN,
    STORAGE_KEYS.AUTH_DELIVERY,
    STORAGE_KEYS.AUTH_CUSTOMER,
    STORAGE_KEYS.AUTH_WAREHOUSE,
];

const ROLE_TO_STORAGE_KEY = {
    [ROLES.SELLER]: STORAGE_KEYS.AUTH_SELLER,
    [ROLES.ADMIN]: STORAGE_KEYS.AUTH_ADMIN,
    [ROLES.DELIVERY]: STORAGE_KEYS.AUTH_DELIVERY,
    [ROLES.CUSTOMER]: STORAGE_KEYS.AUTH_CUSTOMER,
    [ROLES.WAREHOUSE]: STORAGE_KEYS.AUTH_WAREHOUSE,
};

// URL-prefix → storage-key map used as a *fallback* for the few call sites
// (e.g. an admin page that calls a /products endpoint) where the request URL
// itself encodes the intended role. The primary source is the activeRoleStore.
function tokenForRequestUrl(url) {
    if (!url) return null;
    if (url.startsWith('/seller')) return getStoredAuthToken(STORAGE_KEYS.AUTH_SELLER);
    if (url.startsWith('/admin')) return getStoredAuthToken(STORAGE_KEYS.AUTH_ADMIN);
    if (url.startsWith('/delivery')) return getStoredAuthToken(STORAGE_KEYS.AUTH_DELIVERY);
    if (url.startsWith('/warehouse')) return getStoredAuthToken(STORAGE_KEYS.AUTH_WAREHOUSE);
    if (
        url.startsWith('/customer') ||
        url.startsWith('/cart') ||
        url.startsWith('/wishlist') ||
        url.startsWith('/categories') ||
        url.startsWith('/products') ||
        url.startsWith('/payments')
    ) {
        return getStoredAuthToken(STORAGE_KEYS.AUTH_CUSTOMER);
    }
    return null;
}

const axiosInstance = axios.create({
    baseURL: resolveApiBaseUrl(),
});

axiosInstance.interceptors.request.use(
    (config) => {
        const url = config.url || '';
        const isMultipartRequest =
            typeof FormData !== 'undefined' && config.data instanceof FormData;

        if (isMultipartRequest) {
            if (typeof config.headers?.delete === 'function') {
                config.headers.delete('Content-Type');
            } else if (config.headers) {
                delete config.headers['Content-Type'];
            }
        }

        // Primary: pick token from the active role (set by the router on mount).
        const activeRole = getActiveRole();
        const primaryStorageKey = ROLE_TO_STORAGE_KEY[activeRole];
        let token = primaryStorageKey ? getStoredAuthToken(primaryStorageKey) : null;

        // Fallback 1: URL-derived token (cross-portal calls, e.g. admin → /products).
        if (!token) {
            token = tokenForRequestUrl(url);
        }

        // Fallback 2: customer token for un-prefixed/public-ish endpoints while
        // the user is not currently inside a privileged portal.
        if (
            !token &&
            activeRole !== ROLES.ADMIN &&
            activeRole !== ROLES.SELLER &&
            activeRole !== ROLES.DELIVERY &&
            activeRole !== ROLES.WAREHOUSE
        ) {
            token = getStoredAuthToken(STORAGE_KEYS.AUTH_CUSTOMER);
        }

        // Fallback 3: legacy shared 'token' key.
        if (!token) {
            token = getStoredAuthToken(STORAGE_KEYS.AUTH_LEGACY);
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Start loading overlay if request takes longer than 300ms
        if (config.url && config.url.startsWith('/customer')) {
            // @ts-ignore
            config.metadata = { startTime: new Date() };
            // @ts-ignore
            config.timeoutId = setTimeout(() => {
                if (globalLoadingManager.start) {
                    globalLoadingManager.start();
                }
            }, 300);
        }

        return config;
    },
    (error) => {
        if (error.config?.timeoutId) {
            clearTimeout(error.config.timeoutId);
        }
        if (globalLoadingManager.stop) {
            globalLoadingManager.stop();
        }
        return Promise.reject(error);
    }
);

// Response interceptor for API calls
axiosInstance.interceptors.response.use(
    (response) => {
        // @ts-ignore
        if (response.config?.timeoutId) {
            // @ts-ignore
            clearTimeout(response.config.timeoutId);
        }
        if (globalLoadingManager.stop) {
            globalLoadingManager.stop();
        }
        return response;
    },
    async (error) => {
        // @ts-ignore
        if (error.config?.timeoutId) {
            // @ts-ignore
            clearTimeout(error.config.timeoutId);
        }
        if (globalLoadingManager.stop) {
            globalLoadingManager.stop();
        }
        
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const hasStoredRoleToken = ROLE_STORAGE_KEYS.some((key) => Boolean(rawGet(key)));
            if (hasStoredRoleToken) {
                console.warn(
                    '[axios] Received 401 response. Preserving stored auth tokens; session data is only cleared by explicit logout.',
                    {
                        url: originalRequest?.url,
                        method: originalRequest?.method,
                    }
                );
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
