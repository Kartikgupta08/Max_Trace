/**
 * routeGuard.js — Route-Level Access Control
 *
 * Intercepts every navigation and enforces:
 *   1. Authentication  — user must have a valid session
 *   2. Authorization   — user's assigned_roles must satisfy the route's roles
 *
 * If checks fail:
 *   - Unauthenticated → #/login
 *   - Unauthorized    → #/unauthorized
 */

import Auth from './auth.js';
import { findRoute } from '../routes.js';

const RouteGuard = {
    /**
     * @param {string} hash
     * @returns {{ allowed: boolean, redirect: string|null, route: Object|null }}
     */
    check(hash) {
        const route = findRoute(hash);

        // Unknown route → send to login
        if (!route) {
            return { allowed: false, redirect: '#/login', route: null };
        }

        // Public route (empty roles array) → always allow
        if (route.roles.length === 0) {
            return { allowed: true, redirect: null, route };
        }

        // Must be authenticated
        if (!Auth.isAuthenticated()) {
            return { allowed: false, redirect: '#/login', route };
        }

        // Auth.isAuthorized handles admin bypass + role array matching
        if (!Auth.isAuthorized(route.roles)) {
            return { allowed: false, redirect: '#/unauthorized', route };
        }

        return { allowed: true, redirect: null, route };
    }
};

export default RouteGuard;