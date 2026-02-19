/**
 * routeGuard.js — Route-Level Access Control
 * 
 * Intercepts every navigation and enforces:
 *   1. Authentication — user must be logged in
 *   2. Authorization — user role must be in route's allowed list
 * 
 * If checks fail:
 *   - Unauthenticated → redirect to #/login
 *   - Unauthorized role → redirect to #/unauthorized
 */

import Auth from './auth.js';
import { findRoute } from '../routes.js';

const RouteGuard = {
    /**
     * Validate a route before rendering.
     * @param {string} hash - The target hash (e.g., '#/admin/dashboard')
     * @returns {{ allowed: boolean, redirect: string|null, route: Object|null }}
     */
    check(hash) {
        const route = findRoute(hash);

        // Route not found — treat as unauthorized
        if (!route) {
            return { allowed: false, redirect: '#/login', route: null };
        }

        // Public routes (login, unauthorized) — always allowed
        if (route.roles.length === 0) {
            return { allowed: true, redirect: null, route };
        }

        // Must be authenticated for protected routes
        if (!Auth.isAuthenticated()) {
            return { allowed: false, redirect: '#/login', route };
        }

        // Must have correct role
        if (!Auth.isAuthorized(route.roles)) {
            return { allowed: false, redirect: '#/unauthorized', route };
        }

        // All checks passed
        return { allowed: true, redirect: null, route };
    }
};

export default RouteGuard;
