/**
 * auth.js — Centralized Authentication Module
 *
 * Manages session state, assigned_roles array from the backend,
 * and role-based authorization checks.
 *
 * Session shape stored in sessionStorage:
 *   mt_user → {
 *     username:       string,
 *     full_name:      string,
 *     assigned_roles: string[]   ← from POST /users/login response
 *   }
 *
 * Role logic:
 *   - "admin" in assigned_roles  → treated as ADMIN (full access)
 *   - any other role             → OPERATOR access to that specific route
 */

const Auth = (() => {
    const SESSION_KEY = 'mt_user';
    const EXPIRY_KEY  = 'mt_expiry';

    const SESSION_HOURS = 8;

    // ─── Write ────────────────────────────────────────────────────────────────

    /**
     * Store session after a successful login.
     * @param {{ username: string, full_name: string, assigned_roles: string[] }} userData
     */
    function login(userData) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData));
        // Store expiry timestamp (ms)
        const expiry = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
        sessionStorage.setItem(EXPIRY_KEY, String(expiry));
    }

    /**
     * Clear session and redirect to login.
     */
    function logout() {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(EXPIRY_KEY);
        window.location.hash = '#/login';
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    /**
     * Is there a valid, non-expired session?
     * @returns {boolean}
     */
    function isAuthenticated() {
        const expiry = sessionStorage.getItem(EXPIRY_KEY);
        if (!expiry || Date.now() > Number(expiry)) {
            // Expired — clean up
            sessionStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(EXPIRY_KEY);
            return false;
        }
        return !!sessionStorage.getItem(SESSION_KEY);
    }

    /**
     * Get the stored user object.
     * @returns {{ username: string, full_name: string, assigned_roles: string[] } | null}
     */
    function getUser() {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    /**
     * Get the assigned_roles array.
     * @returns {string[]}
     */
    function getRoles() {
        return getUser()?.assigned_roles ?? [];
    }

    /**
     * Is the current user an admin?
     * (i.e. "admin" is in their assigned_roles)
     * @returns {boolean}
     */
    function isAdmin() {
        return getRoles().includes('admin');
    }

    /**
     * Does the user have access to a specific role/page?
     * Admins always pass. Otherwise check the roles array directly.
     * @param {string} requiredRole  — the role string on the route definition
     * @returns {boolean}
     */
    function hasAccess(requiredRole) {
        if (!isAuthenticated()) return false;
        if (isAdmin()) return true;                  // admin sees everything
        return getRoles().includes(requiredRole);
    }

    /**
     * Can this user access a route that requires ANY of the listed roles?
     * Used by routeGuard and sidebar.
     * @param {string[]} routeRoles — array of role strings on the route
     * @returns {boolean}
     */
    function isAuthorized(routeRoles) {
        if (!routeRoles || routeRoles.length === 0) return true;   // public route
        if (!isAuthenticated()) return false;
        if (isAdmin()) return true;                                  // admin bypass
        return routeRoles.some(r => getRoles().includes(r));
    }

    /**
     * Get a token string for Authorization headers.
     * The new login flow has no JWT — we build a lightweight placeholder
     * so that api.js can still attach a Bearer header if it wants to.
     * The real auth check is handled server-side via session/cookie or
     * simply by the fact that the user is logged in.
     * Returns a base64-encoded copy of the session payload so api.js
     * has something non-null to send.
     * @returns {string|null}
     */
    function getToken() {
        const user = getUser();
        if (!user) return null;
        // Return a stable pseudo-token derived from the session.
        // Replace this with a real JWT if your backend starts issuing one.
        try {
            return btoa(JSON.stringify({ username: user.username, roles: user.assigned_roles }));
        } catch {
            return null;
        }
    }

    /**
     * Legacy: return a single role string for parts of the app
     * that still do a simple role === 'ADMIN' check.
     * @returns {'ADMIN' | 'OPERATOR' | null}
     */
    function getRole() {
        if (!isAuthenticated()) return null;
        return isAdmin() ? 'ADMIN' : 'OPERATOR';
    }

    return Object.freeze({
        login,
        logout,
        isAuthenticated,
        getToken,     // used by api.js for Authorization header
        getUser,
        getRoles,
        isAdmin,
        hasAccess,
        isAuthorized,
        getRole,      // kept for backwards compat
    });
})();

export default Auth;