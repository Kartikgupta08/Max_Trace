/**
 * sidebar.js — Dynamic Sidebar Navigation
 *
 * Renders ONLY the routes the current user is permitted to see,
 * derived from their assigned_roles array (not a single role string).
 *
 * Admin users (assigned_roles includes "admin") see every section.
 * All other users see only routes whose roles[] intersect their assigned_roles.
 *
 * Collapse behaviour:
 *   - Collapsed state stored in localStorage so it persists across page loads.
 *   - Collapsed: sidebar shrinks to icon-only (48px wide), labels hidden.
 *   - Expanded:  sidebar at full width with labels visible.
 */

import Auth from '../core/auth.js';
import { getRoutesBySection } from '../routes.js';

const COLLAPSE_KEY = 'mt_sidebar_collapsed';

const Sidebar = {
    /**
     * Render the full sidebar HTML.
     * @returns {string}
     */
    render() {
        const user = Auth.getUser();
        if (!user) return '';

        const assignedRoles = Auth.getRoles();
        const sections      = getRoutesBySection(assignedRoles);

        // Build nav links
        let navHtml = '';
        sections.forEach((routes, sectionName) => {
            navHtml += `<div class="sidebar__section-title sidebar__text-fade">${_escapeHtml(sectionName)}</div>`;
            routes.forEach(route => {
                navHtml += `
                    <a class="sidebar__link" href="${route.path}" data-route="${route.path}" title="${_escapeHtml(route.title)}">
                        <span class="sidebar__link-icon material-symbols-outlined">${route.icon}</span>
                        <span class="sidebar__text-fade">${_escapeHtml(route.title)}</span>
                    </a>`;
            });
        });

        // Avatar initials
        const displayName = user.full_name || user.username || 'User';
        const initials = displayName
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

        const roleLabel = Auth.isAdmin()
            ? 'Admin'
            : assignedRoles.slice(0, 2).join(', ') + (assignedRoles.length > 2 ? '…' : '');

        return `
            <!-- Brand / Logo -->
            <div class="sidebar__brand">
                <div class="sidebar__brand-logo">MT</div>
                <div class="sidebar__text-fade">
                    <div class="sidebar__brand-name">MaxTrace</div>
                    <span class="sidebar__brand-sub">Battery Traceability</span>
                </div>
                <!-- Collapse toggle button -->
                <button class="sidebar__collapse-btn" id="btn-sidebar-collapse" title="Toggle sidebar">
                    <span class="material-symbols-outlined sidebar__collapse-icon">chevron_left</span>
                </button>
            </div>

            <!-- Nav -->
            <nav class="sidebar__nav" id="sidebar-nav">
                ${navHtml || '<p class="sidebar__text-fade" style="padding:16px;font-size:12px;color:var(--color-text-tertiary)">No pages assigned.</p>'}
            </nav>

            <!-- Footer -->
            <div class="sidebar__footer">
                <div class="sidebar__user">
                    <div class="sidebar__user-avatar" title="${_escapeHtml(displayName)}">${initials}</div>
                    <div class="sidebar__user-info sidebar__text-fade">
                        <div class="sidebar__user-name">${_escapeHtml(displayName)}</div>
                        <div class="sidebar__user-role">${_escapeHtml(roleLabel)}</div>
                    </div>
                    <button class="sidebar__logout-btn sidebar__text-fade" id="btn-logout" title="Logout">
                        <span class="material-symbols-outlined" style="font-size:20px;">logout</span>
                    </button>
                </div>
            </div>`;
    },

    /**
     * Bind sidebar event listeners (logout + collapse).
     */
    init() {
        // ── Logout ────────────────────────────────────────────────
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', e => {
                e.preventDefault();
                Auth.logout();
            });
        }

        // ── Collapse ──────────────────────────────────────────────
        const collapseBtn = document.getElementById('btn-sidebar-collapse');
        const sidebar     = document.querySelector('.sidebar');
        const shell       = document.querySelector('.app-shell');

        if (!collapseBtn || !sidebar || !shell) return;

        // Restore saved state
        const isCollapsed = localStorage.getItem(COLLAPSE_KEY) === 'true';
        if (isCollapsed) _applyCollapsed(sidebar, shell, true);

        collapseBtn.addEventListener('click', () => {
            const nowCollapsed = sidebar.classList.toggle('sidebar--collapsed');
            shell.classList.toggle('app-shell--sidebar-collapsed', nowCollapsed);
            localStorage.setItem(COLLAPSE_KEY, nowCollapsed);
        });
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

/** Apply collapsed state without animation (on initial load). */
function _applyCollapsed(sidebar, shell, collapsed) {
    sidebar.classList.toggle('sidebar--collapsed', collapsed);
    shell.classList.toggle('app-shell--sidebar-collapsed', collapsed);
}

function _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export default Sidebar;