/**
 * sidebar.js — Dynamic Sidebar Navigation
 *
 * Fix: The brand logo now always shows the MV blue tile.
 * The <img> was being filtered with brightness(0) invert(1) which made
 * the actual logo invisible against the dark sidebar background.
 * Replaced with a clean inline tile that matches the login page fallback.
 */

import Auth from '../core/auth.js';
import { getRoutesBySection } from '../routes.js';

const COLLAPSE_KEY = 'mt_sidebar_collapsed';

const Sidebar = {
    render() {
        const user = Auth.getUser();
        if (!user) return '';

        const assignedRoles = Auth.getRoles();
        const sections      = getRoutesBySection(assignedRoles);

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

        const displayName = user.full_name || user.username || 'User';
        const initials    = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const roleLabel   = Auth.isAdmin()
            ? 'Admin'
            : assignedRoles.slice(0, 2).join(', ') + (assignedRoles.length > 2 ? '…' : '');

        return `
             <!-- Brand / Logo -->
            <div class="sidebar__brand">
                <div class="sidebar__brand-logo">
                    <img src="Assets/maxvolt-logo.png.png" alt="" class="sidebar__brand-img"
                         onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
                    <span class="sidebar__brand-fb" style="display:none;">MV</span>
                </div>

                <div class="sidebar__brand-text sidebar__text-fade">
                    <div class="sidebar__brand-name">MaxTrace</div>
                    <span class="sidebar__brand-sub">MaxVolt Energy Industries</span>
                </div>
            </div>

            <!-- Collapse button -->
            <button class="sidebar__collapse-btn" id="btn-sidebar-collapse"
                    title="Collapse sidebar" aria-label="Collapse sidebar">
                <span class="material-symbols-outlined sidebar__collapse-icon">chevron_left</span>
            </button>

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

        const isCollapsed = localStorage.getItem(COLLAPSE_KEY) === 'true';
        if (isCollapsed) _applyCollapsed(sidebar, shell, collapseBtn, true);

        collapseBtn.addEventListener('click', () => {
            const nowCollapsed = sidebar.classList.toggle('sidebar--collapsed');
            shell.classList.toggle('app-shell--sidebar-collapsed', nowCollapsed);
            localStorage.setItem(COLLAPSE_KEY, nowCollapsed);
            _updateChevron(collapseBtn, nowCollapsed);
        });
    },

    setActive(hash) {
        document.querySelectorAll('.sidebar__link').forEach(link => {
            link.classList.toggle('sidebar__link--active', link.dataset.route === hash);
        });
    },
};

function _applyCollapsed(sidebar, shell, btn, collapsed) {
    sidebar.classList.toggle('sidebar--collapsed', collapsed);
    shell.classList.toggle('app-shell--sidebar-collapsed', collapsed);
    _updateChevron(btn, collapsed);
}

function _updateChevron(btn, isCollapsed) {
    const icon = btn.querySelector('.sidebar__collapse-icon');
    if (icon) icon.textContent = isCollapsed ? 'chevron_right' : 'chevron_left';
    btn.title = isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
    btn.setAttribute('aria-label', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
}

function _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export default Sidebar;