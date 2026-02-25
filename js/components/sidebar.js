/**
 * sidebar.js — Dynamic Sidebar Navigation
 *
 * Renders ONLY the routes the current user is permitted to see,
 * derived from their assigned_roles array (not a single role string).
 *
 * Admin users (assigned_roles includes "admin") see every section.
 * All other users see only routes whose roles[] intersect their assigned_roles.
 */

import Auth from '../core/auth.js';
import { getRoutesBySection } from '../routes.js';

const Sidebar = {
    /**
     * Render the full sidebar HTML.
     * @returns {string}
     */
    render() {
        const user  = Auth.getUser();
        if (!user) return '';

        const assignedRoles = Auth.getRoles();   // string[]
        const sections      = getRoutesBySection(assignedRoles);

        // Build nav links
        let navHtml = '';
        sections.forEach((routes, sectionName) => {
            navHtml += `<div class="sidebar__section-title">${_escapeHtml(sectionName)}</div>`;
            routes.forEach(route => {
                navHtml += `
                    <a class="sidebar__link" href="${route.path}" data-route="${route.path}">
                        <span class="sidebar__link-icon material-symbols-outlined">${route.icon}</span>
                        <span>${_escapeHtml(route.title)}</span>
                    </a>`;
            });
        });

        // Avatar initials from full_name
        const displayName = user.full_name || user.username || 'User';
        const initials = displayName
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

        // Role label shown in footer
        // Show "Admin" for admins, otherwise list roles (truncated)
        const roleLabel = Auth.isAdmin()
            ? 'Admin'
            : assignedRoles.slice(0, 2).join(', ') + (assignedRoles.length > 2 ? '…' : '');

        return `
            <div class="sidebar__brand">
                <div class="sidebar__brand-logo">MT</div>
                <div>
                    <div class="sidebar__brand-name">MaxTrace</div>
                    <span class="sidebar__brand-sub">Battery Traceability</span>
                </div>
            </div>
            <nav class="sidebar__nav" id="sidebar-nav">
                ${navHtml || '<p style="padding:16px;font-size:12px;color:var(--color-text-tertiary)">No pages assigned.</p>'}
            </nav>
            <div class="sidebar__footer">
                <div class="sidebar__user">
                    <div class="sidebar__user-avatar">${initials}</div>
                    <div class="sidebar__user-info">
                        <div class="sidebar__user-name">${_escapeHtml(displayName)}</div>
                        <div class="sidebar__user-role">${_escapeHtml(roleLabel)}</div>
                    </div>
                    <button class="sidebar__logout-btn" id="btn-logout" title="Logout">
                        <span class="material-symbols-outlined" style="font-size:20px;">logout</span>
                    </button>
                </div>
            </div>`;
    },

    /**
     * Bind sidebar event listeners (logout button).
     */
    init() {
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', e => {
                e.preventDefault();
                Auth.logout();
            });
        }
    },

    /**
     * Highlight the active nav link.
     * @param {string} hash
     */
    setActive(hash) {
        document.querySelectorAll('.sidebar__link').forEach(link => {
            link.classList.toggle('sidebar__link--active', link.dataset.route === hash);
        });
    },
};

function _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export default Sidebar;