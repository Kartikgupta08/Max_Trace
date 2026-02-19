/**
 * router.js — Hash-Based SPA Router
 * 
 * Listens for hash changes and renders the appropriate page module.
 * Works with routeGuard.js for access control before any rendering.
 * 
 * Flow:
 *   1. Hash change detected
 *   2. RouteGuard checks auth + role
 *   3. If denied, redirect
 *   4. If allowed, dynamically import page module
 *   5. Call page.render() into content area
 *   6. Call page.init() for event binding
 */

import RouteGuard from './routeGuard.js';
import Auth from './auth.js';

const Router = (() => {
    /** @type {HTMLElement} Main content container */
    let _contentEl = null;

    /** @type {Function|null} Cleanup function from previous page */
    let _currentCleanup = null;

    /** @type {Function|null} Callback when route changes (for sidebar highlighting) */
    let _onRouteChange = null;

    /**
     * Initialize the router.
     * @param {HTMLElement} contentElement - The #app-content element
     * @param {Function} [onRouteChange] - Callback with current hash
     */
    function init(contentElement, onRouteChange = null) {
        _contentEl = contentElement;
        _onRouteChange = onRouteChange;

        // Listen for hash changes
        window.addEventListener('hashchange', () => navigate());

        // Handle initial load
        navigate();
    }

    /**
     * Navigate to the current hash (or a default).
     */
    async function navigate() {
        const hash = window.location.hash || '#/login';

        // Run cleanup on previous page if it exposed one
        if (typeof _currentCleanup === 'function') {
            try { _currentCleanup(); } catch (e) { console.warn('[Router] Cleanup error:', e); }
            _currentCleanup = null;
        }

        // ── Route Guard ───────────────────────────────────────────
        const { allowed, redirect, route } = RouteGuard.check(hash);

        if (!allowed) {
            window.location.hash = redirect;
            return;
        }

        // Notify listeners (sidebar highlighting)
        if (_onRouteChange) _onRouteChange(hash);

        // Update document title
        document.title = `${route.title} — MaxTrace`;

        // ── Load Page Module ──────────────────────────────────────
        try {
            _contentEl.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';

            const module = await route.loader();

            // Render page HTML
            _contentEl.innerHTML = module.default.render();

            // Initialize page logic (event listeners, data fetching)
            if (typeof module.default.init === 'function') {
                const cleanup = await module.default.init();
                if (typeof cleanup === 'function') {
                    _currentCleanup = cleanup;
                }
            }

        } catch (err) {
            console.error('[Router] Failed to load page:', hash, err);
            _contentEl.innerHTML = `
                <div class="error-page">
                    <div class="error-page__icon">⚠</div>
                    <h2>Page Load Error</h2>
                    <p>Could not load the requested page. Please try again or contact support.</p>
                    <button class="btn btn--primary" onclick="window.location.hash='#/production/cell-registration'">
                        Return to Home
                    </button>
                </div>
            `;
        }
    }

    /**
     * Programmatic navigation.
     * @param {string} hash
     */
    function navigateTo(hash) {
        window.location.hash = hash;
    }

    /**
     * Get the default landing page for the current user role.
     * @returns {string}
     */
    function getDefaultRoute() {
        const role = Auth.getRole();
        if (role === 'ADMIN') return '#/admin/dashboard';
        return '#/production/cell-registration';
    }

    return Object.freeze({
        init,
        navigateTo,
        getDefaultRoute
    });
})();

export default Router;
