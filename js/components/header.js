/**
 * header.js — Application Header
 * 
 * Displays current page title and breadcrumb.
 */

import { findRoute } from '../routes.js';

const Header = {
    /**
     * Render header HTML.
     * @returns {string}
     */
    render() {
        return `
            <div>
                <div class="header__title" id="header-title">MaxTrace</div>
                <div class="header__breadcrumb" id="header-breadcrumb"></div>
            </div>

        `;
    },

    /**
     * Start live clock and update header values.
     */
    init() {
        // No-op
    },

    /**
     * Update header title/breadcrumb based on hash.
     * @param {string} hash
     */
    update(hash) {
        const route = findRoute(hash);
        const titleEl = document.getElementById('header-title');
        const breadcrumbEl = document.getElementById('header-breadcrumb');

        if (route && titleEl) {
            titleEl.textContent = route.title;
        }

        if (route && breadcrumbEl && route.section) {
            breadcrumbEl.innerHTML = `${route.section} <span>/ ${route.title}</span>`;
        } else if (breadcrumbEl) {
            breadcrumbEl.innerHTML = '';
        }
    },

    /**
     * Cleanup on destroy.
     */
    destroy() {
        // No-op
    }
};

export default Header;
