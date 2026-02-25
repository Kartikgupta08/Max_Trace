/**
 * router.js — Hash-Based SPA Router
 *
 * Unchanged flow — only getDefaultRoute() updated to use
 * Auth.isAdmin() / Auth.getRoles() instead of the old single-role system.
 */

import RouteGuard from './routeGuard.js';
import Auth from './auth.js';
import { getNavigableRoutes } from '../routes.js';

const Router = (() => {
    let _contentEl      = null;
    let _currentCleanup = null;
    let _onRouteChange  = null;

    function init(contentElement, onRouteChange = null) {
        _contentEl     = contentElement;
        _onRouteChange = onRouteChange;
        window.addEventListener('hashchange', () => navigate());
        navigate();
    }

    async function navigate() {
        const hash = window.location.hash || '#/login';

        if (typeof _currentCleanup === 'function') {
            try { _currentCleanup(); } catch (e) { console.warn('[Router] Cleanup error:', e); }
            _currentCleanup = null;
        }

        const { allowed, redirect, route } = RouteGuard.check(hash);

        if (!allowed) {
            window.location.hash = redirect;
            return;
        }

        if (_onRouteChange) _onRouteChange(hash);
        document.title = `${route.title} — MaxTrace`;

        try {
            _contentEl.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';
            const module  = await route.loader();
            _contentEl.innerHTML = module.default.render();

            if (typeof module.default.init === 'function') {
                const cleanup = await module.default.init();
                if (typeof cleanup === 'function') _currentCleanup = cleanup;
            }
        } catch (err) {
            console.error('[Router] Failed to load page:', hash, err);
            _contentEl.innerHTML = `
                <div class="error-page">
                    <div class="error-page__icon">⚠</div>
                    <h2>Page Load Error</h2>
                    <p>Could not load the requested page. Please try again or contact support.</p>
                    <button class="btn btn--primary" onclick="window.location.hash='${getDefaultRoute()}'">
                        Return to Home
                    </button>
                </div>`;
        }
    }

    function navigateTo(hash) {
        window.location.hash = hash;
    }

    /**
     * Redirect to the first route the user is permitted to access.
     * Admins land on the dashboard; operators land on their first assigned page.
     * @returns {string} hash
     */
    function getDefaultRoute() {
        if (!Auth.isAuthenticated()) return '#/login';
        if (Auth.isAdmin()) return '#/admin/dashboard';

        // Find the first navigable route for this user's roles
        const assignedRoles = Auth.getRoles();
        const navigable     = getNavigableRoutes(assignedRoles);
        if (navigable.length > 0) return navigable[0].path;

        // No pages assigned at all
        return '#/unauthorized';
    }

    return Object.freeze({ init, navigateTo, getDefaultRoute });
})();

export default Router;