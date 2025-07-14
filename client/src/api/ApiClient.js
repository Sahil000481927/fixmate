import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { triggerGlobalSnackbar } from '../components/FeedbackSnackbar';

const api = axios.create({
    baseURL: (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'),
    timeout: 15000, // 15s timeout for all API calls
});

/**
 * Request interceptor:
 * - Attaches Firebase Bearer token
 * - Optionally includes requested permission for backend tracing
 */
api.interceptors.request.use(async (config) => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.meta && config.meta.permission) {
        config.headers['X-Requested-Permission'] = config.meta.permission;
    }

    return config;
}, (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
});

/**
 * Response interceptor:
 * - Handles global errors
 * - Retries once on 401 with forced token refresh
 */
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const auth = getAuth();
        const originalRequest = error.config;

        if (error.response) {
            const { status, data } = error.response;

            if (status === 401 && !originalRequest._retry) {
                console.warn('401 Unauthorized. Attempting token refresh.');
                originalRequest._retry = true;
                try {
                    await auth.currentUser?.getIdToken(true); // force refresh
                    return api.request(originalRequest); // retry original request
                } catch (refreshErr) {
                    console.error('Token refresh failed:', refreshErr);
                    triggerGlobalSnackbar('Session expired. Please log in again.', 'error');
                    auth.signOut();
                    window.location.href = '/login';
                }
            } else if (status === 403) {
                triggerGlobalSnackbar('Forbidden: You do not have permission to perform this action.', 'warning');
            } else if (status === 404) {
                triggerGlobalSnackbar(data.message || 'Resource not found.', 'info');
            } else if (status >= 500) {
                triggerGlobalSnackbar(data.message || 'Server error occurred. Please try again later.', 'error');
            }
        } else {
            triggerGlobalSnackbar('Network error: Please check your connection.', 'error');
        }

        return Promise.reject(error);
    }
);

export default api;
