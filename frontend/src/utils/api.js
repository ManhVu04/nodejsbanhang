import axios from 'axios';

export const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/shop')
        ? '/shop/api/v1'
        : '/api/v1');

const FALLBACK_IMAGE =
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="24">No Image</text></svg>');

function extractFilename(imageValue) {
    let normalized = String(imageValue || '').trim().replace(/\\/g, '/');
    if (!normalized) {
        return '';
    }
    return normalized.split('/').filter(Boolean).pop() || '';
}

function normalizeAuthToken(tokenValue) {
    return String(tokenValue || '')
        .trim()
        .replace(/^bearer\s+/i, '')
        .replace(/^"|"$/g, '');
}

export function resolveImageUrl(imageValue, fallback = FALLBACK_IMAGE) {
    let rawValue = String(imageValue || '').trim();
    if (!rawValue) {
        return fallback;
    }

    if (/^https?:\/\//i.test(rawValue) || rawValue.startsWith('data:image')) {
        return rawValue;
    }

    let filename = '';
    if (rawValue.includes('/upload/') || rawValue.includes('/uploads/') || rawValue.includes('uploads\\')) {
        filename = extractFilename(rawValue);
    } else if (!rawValue.includes('/')) {
        filename = rawValue;
    }

    if (filename) {
        let uploadBase = API_BASE_URL.replace(/\/+$/, '');
        return `${uploadBase}/upload/${encodeURIComponent(filename)}`;
    }

    if (rawValue.startsWith('/')) {
        return rawValue;
    }

    return fallback;
}

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
        const token = normalizeAuthToken(localStorage.getItem('token'));
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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
