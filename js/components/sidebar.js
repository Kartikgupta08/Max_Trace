/**
 * sidebar.js — Dynamic Sidebar Navigation
 * 
 * Renders sidebar links based on current user role.
 * Admin items are NEVER added to DOM for operator users.
 * Dynamically generated from route configuration.
 */

import Auth from '../core/auth.js';
import { getRoutesBySection } from '../routes.js';

const Sidebar = {
    /**
     * Render the sidebar HTML.
     * Only includes routes the current user's role is allowed to see.
     * @returns {string} HTML string
     */
    render() {
        const user = Auth.getUser();
        const role = Auth.getRole();

        if (!user || !role) return '';

        const sections = getRoutesBySection(role);
        let navHtml = '';

        sections.forEach((routes, sectionName) => {
            navHtml += `<div class="sidebar__section-title">${sectionName}</div>`;
            routes.forEach(route => {
                navHtml += `
                    <a class="sidebar__link" href="${route.path}" data-route="${route.path}">
                        <span class="sidebar__link-icon material-symbols-outlined">${route.icon}</span>
                        <span>${route.title}</span>
                    </a>
                `;
            });
        });

        // User initials for avatar
        const initials = user.name
            ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : 'U';

        return `
            <div class="sidebar__brand">
                <div class="sidebar__brand-logo">MT</div>
                <div>
                    <div class="sidebar__brand-name">MaxTrace</div>
                    <span class="sidebar__brand-sub">Battery Traceability</span>
                </div>
            </div>
            <nav class="sidebar__nav" id="sidebar-nav">
                ${navHtml}
            </nav>
            <div class="sidebar__footer">
                <div class="sidebar__user">
                    <div class="sidebar__user-avatar">${initials}</div>
                    <div class="sidebar__user-info">
                        <div class="sidebar__user-name">${_escapeHtml(user.name || 'User')}</div>
                        <div class="sidebar__user-role">${role}</div>
                    </div>
                    <button class="sidebar__logout-btn" id="btn-logout" title="Logout">
                        <span class="material-symbols-outlined" style="font-size:20px;">logout</span>
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Initialize sidebar event listeners.
     */
    init() {
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                Auth.logout();
            });
        }
    },

    /**
     * Highlight the active link in sidebar.
     * @param {string} hash - Current route hash
     */
    setActive(hash) {
        const links = document.querySelectorAll('.sidebar__link');
        links.forEach(link => {
            if (link.getAttribute('data-route') === hash) {
                link.classList.add('sidebar__link--active');
            } else {
                link.classList.remove('sidebar__link--active');
            }
        });
    }
};

function _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export default Sidebar;
