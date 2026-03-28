import axios from 'axios';

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/shop')
        ? '/shop/api/v1'
        : '/api/v1');

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = token;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const message = error.response?.data;
        if ((status === 401 || status === 404) && message === 'ban chua dang nhap') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        return Promise.reject(error);
    }
);

export default api;
