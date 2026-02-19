/**
 * auth.js — Centralized Authentication Module
 * 
 * Manages JWT tokens, user session, and role verification.
 * All auth state is stored in sessionStorage (cleared on tab close).
 * Never stores sensitive data in localStorage.
 */

const Auth = (() => {
    const TOKEN_KEY = 'mt_token';
    const USER_KEY = 'mt_user';

    /**
     * Store authentication data after successful login.
     * @param {string} token - JWT token from backend
     * @param {Object} user - User object { id, name, role, email }
     */
    function login(token, user) {
        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    /**
     * Clear all authentication data and redirect to login.
     */
    function logout() {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        window.location.hash = '#/login';
    }

    /**
     * Check if a user is currently authenticated.
     * @returns {boolean}
     */
    function isAuthenticated() {
        const token = sessionStorage.getItem(TOKEN_KEY);
        if (!token) return false;

        // Basic JWT expiry check (decode payload without verification —
        // actual verification happens server-side on every API call)
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                logout();
                return false;
            }
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get the current JWT token.
     * @returns {string|null}
     */
    function getToken() {
        return sessionStorage.getItem(TOKEN_KEY);
    }

    /**
     * Get current user object.
     * @returns {Object|null} - { id, name, role, email }
     */
    function getUser() {
        try {
            const raw = sessionStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    /**
     * Get current user role.
     * @returns {string|null} - 'ADMIN' | 'OPERATOR' | null
     */
    function getRole() {
        const user = getUser();
        return user ? user.role : null;
    }

    /**
     * Check if current user has a specific role.
     * @param {string} role
     * @returns {boolean}
     */
    function hasRole(role) {
        return getRole() === role;
    }

    /**
     * Check if current user's role is within an allowed set.
     * @param {string[]} allowedRoles
     * @returns {boolean}
     */
    function isAuthorized(allowedRoles) {
        if (!allowedRoles || allowedRoles.length === 0) return true;
        const role = getRole();
        return role && allowedRoles.includes(role);
    }

    return Object.freeze({
        login,
        logout,
        isAuthenticated,
        getToken,
        getUser,
        getRole,
        hasRole,
        isAuthorized
    });
})();

export default Auth;
