/**
 * app.js — Application Entry Point
 * 
 * Bootstraps the MaxTrace SPA:
 *   1. Checks authentication state
 *   2. Renders the application shell (sidebar + header + content)
 *   3. Initializes the router
 *   4. Handles layout switching for auth vs. main pages
 */

import Auth from './core/auth.js';
import Router from './core/router.js';
import Sidebar from './components/sidebar.js';

/**
 * Initialize the application.
 */
function initApp() {
    const appRoot = document.getElementById('app');

    // Render application shell
    appRoot.innerHTML = `
        <div class="app-shell" id="app-shell">
            <aside class="sidebar" id="app-sidebar"></aside>
            <main class="content" id="app-content"></main>
        </div>
    `;

    const sidebarEl = document.getElementById('app-sidebar');
    const contentEl = document.getElementById('app-content');
    const shell = document.getElementById('app-shell');

    // ── Layout Management ─────────────────────────────────────
    // Determine if we should show full layout or auth layout
    function updateLayout() {
        const hash = window.location.hash || '#/login';
        const isAuthPage = hash === '#/login' || hash === '#/unauthorized';

        if (isAuthPage || !Auth.isAuthenticated()) {
            shell.classList.add('app-shell--auth');
            sidebarEl.innerHTML = '';
        } else {
            shell.classList.remove('app-shell--auth');

            // Render sidebar (role-filtered)
            sidebarEl.innerHTML = Sidebar.render();
            Sidebar.init();
        }
    }

    // ── Route Change Handler ──────────────────────────────────
    function onRouteChange(hash) {
        updateLayout();
        Sidebar.setActive(hash);
    }

    // ── Initialize Router ─────────────────────────────────────
    Router.init(contentEl, onRouteChange);

    // Set default route if none specified
    if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#') {
        if (Auth.isAuthenticated()) {
            window.location.hash = Router.getDefaultRoute();
        } else {
            window.location.hash = '#/login';
        }
    }
}

// ── Bootstrap on DOM ready ────────────────────────────────────────
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
