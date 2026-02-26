/**
 * api.js — Centralized API Module
 * 
 * All HTTP communication with the FastAPI backend flows through this module.
 * Handles JWT injection, error mapping, and response normalization.
 * 
 * Error codes:
 *   401 → redirect to login (token expired/missing)
 *   403 → redirect to unauthorized (insufficient role)
 *   422 → return validation errors for form display
 *   500 → show error toast
 */

import Auth from './auth.js';
import Toast from '../components/toast.js';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://your-production-domain.com';

/**
 * Core fetch wrapper with auth headers & error handling.
 * @param {string} endpoint - Relative API path (e.g., '/cells/register')
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Parsed JSON response
 */
async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = Auth.getToken();

    const headers = {
        ...(options.headers || {})
    };

    // Inject Authorization header if token exists
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Set Content-Type for JSON bodies (skip for FormData — browser sets boundary)
    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        // Handle HTTP error codes
        if (!response.ok) {
            return await handleErrorResponse(response);
        }

        // Handle 204 No Content
        if (response.status === 204) {
            return { success: true, data: null };
        }

        const data = await response.json();

        // Normalize responses: many backend endpoints return an envelope
        // { success: boolean, data: {...} } while some return the
        // payload directly. Unwrap the envelope when present so callers
        // can always use `result.data` as the payload.
        if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'success') && Object.prototype.hasOwnProperty.call(data, 'data')) {
            return { success: Boolean(data.success), data: data.data };
        }

        return { success: true, data };

    } catch (err) {
        // Network errors, CORS, etc.
        console.error(`[API] Network error: ${endpoint}`, err);
        Toast.error('Network error. Please check your connection and try again.');
        return { success: false, error: 'NETWORK_ERROR', message: err.message };
    }
}

/**
 * Handle non-2xx HTTP responses.
 * @param {Response} response
 * @returns {Object} Normalized error object
 */
async function handleErrorResponse(response) {
    const status = response.status;

    // 401 — Unauthenticated: Token expired or missing
    if (status === 401) {
        Toast.error('Session expired. Please log in again.');
        Auth.logout();
        return { success: false, error: 'UNAUTHENTICATED', status };
    }

    // 403 — Forbidden: Role not allowed
    if (status === 403) {
        window.location.hash = '#/unauthorized';
        return { success: false, error: 'FORBIDDEN', status };
    }

    // 422 — Validation errors from backend
    if (status === 422) {
        let detail;
        try {
            const body = await response.json();
            detail = body.detail || body.errors || body.message || 'Validation failed.';
        } catch {
            detail = 'Validation failed.';
        }
        return { success: false, error: 'VALIDATION_ERROR', status, detail };
    }

    // 500+ — Server errors
    if (status >= 500) {
        Toast.error('Server error. Please contact the system administrator.');
        return { success: false, error: 'SERVER_ERROR', status };
    }

    // Other errors (4xx etc.) — don't toast here; let the caller handle it
    let message, detail;
    try {
        const body = await response.json();
        message = body.message || body.detail || response.statusText;
        detail = body.detail || body.message || response.statusText;
    } catch {
        message = response.statusText;
        detail = message;
    }
    return { success: false, error: 'HTTP_ERROR', status, message, detail };
}

// ─── Convenience Methods ───────────────────────────────────────────────

const API = {
    /**
     * GET request.
     * @param {string} endpoint
     * @param {Object} [params] - Query parameters
     */
    async get(endpoint, params = {}) {
        const query = new URLSearchParams(params).toString();
        const url = query ? `${endpoint}?${query}` : endpoint;
        return request(url, { method: 'GET' });
    },

    /**
     * POST request with JSON body.
     * @param {string} endpoint
     * @param {Object} body
     */
    async post(endpoint, body = {}) {
        return request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    /**
     * PUT request with JSON body.
     * @param {string} endpoint
     * @param {Object} body
     */
    async put(endpoint, body = {}) {
        return request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    /**
     * PATCH request with JSON body.
     * @param {string} endpoint
     * @param {Object} body
     */
    async patch(endpoint, body = {}) {
        return request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body)
        });
    },

    /**
     * DELETE request.
     * @param {string} endpoint
     */
    async delete(endpoint) {
        return request(endpoint, { method: 'DELETE' });
    },

    /**
     * Upload file(s) via FormData.
     * @param {string} endpoint
     * @param {FormData} formData
     * @param {Function} [onProgress] - optional XHR progress callback
     */
    async upload(endpoint, formData, onProgress = null) {
        // If progress tracking is needed, use XHR instead of fetch
        if (onProgress) {
            return uploadWithProgress(endpoint, formData, onProgress);
        }
        return request(endpoint, {
            method: 'POST',
            body: formData
        });
    }
};

/**
 * Upload with XHR for progress tracking.
 * @param {string} endpoint
 * @param {FormData} formData
 * @param {Function} onProgress - (percent: number) => void
 * @returns {Promise<Object>}
 */
function uploadWithProgress(endpoint, formData, onProgress) {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        const url = `${API_BASE}${endpoint}`;
        const token = Auth.getToken();

        xhr.open('POST', url);

        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        });

        xhr.addEventListener('load', () => {
            try {
                const data = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve({ success: true, data });
                } else if (xhr.status === 422) {
                    resolve({
                        success: false,
                        error: 'VALIDATION_ERROR',
                        status: 422,
                        detail: data.detail || data.errors || 'Validation failed.'
                    });
                } else if (xhr.status === 401) {
                    Auth.logout();
                    resolve({ success: false, error: 'UNAUTHENTICATED', status: 401 });
                } else {
                    Toast.error(data.message || 'Upload failed.');
                    resolve({ success: false, error: 'HTTP_ERROR', status: xhr.status });
                }
            } catch {
                Toast.error('Upload failed. Invalid response from server.');
                resolve({ success: false, error: 'PARSE_ERROR' });
            }
        });

        xhr.addEventListener('error', () => {
            Toast.error('Network error during upload.');
            resolve({ success: false, error: 'NETWORK_ERROR' });
        });

        xhr.send(formData);
    });
}

export default API;
