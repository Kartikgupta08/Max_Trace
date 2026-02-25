const API_BASE = 'http://localhost:8000';

/**
 * userManagement.js — Admin User Management Page
 * Fully matched to the app design system (variables.css + existing component classes).
 */

const ROLES = [
    'admin',
    'Cell Registeration',
    'Cell Grading',
    'Cell Sorting',
    'Assembly and Mapping',
    'Welding',
    'BMS Mounting',
    'Pack Testing',
    'PDI Inspection',
    'Dispatch',
];

const UserManagement = {
    users: [],

    // ─── Render ───────────────────────────────────────────────────────────────

    render() {
        return `
        <style>
            /* ── User Management Scoped Styles ── */

            .user-management-page {
                padding: var(--content-padding);
                background: var(--color-bg-body);
                min-height: 100vh;
                font-family: var(--font-family);
            }

            /* ── Page Header ── */
            .um-page-header {
                margin-bottom: var(--space-6);
            }

            .um-page-header h1 {
                font-size: var(--text-xl);
                font-weight: var(--weight-bold);
                color: var(--color-text-primary);
                margin: 0 0 var(--space-1) 0;
                line-height: var(--leading-tight);
            }

            .um-page-header p {
                font-size: var(--text-sm);
                color: var(--color-text-secondary);
                margin: 0;
            }

            /* ── Cards ── */
            .um-card {
                background: var(--color-bg-card);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-md);
                padding: var(--space-6);
                margin-bottom: var(--space-6);
                max-width: 1100px;
            }

            .um-card-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: var(--space-5);
            }

            .um-card-title {
                font-size: var(--text-sm);
                font-weight: var(--weight-semibold);
                color: var(--color-text-secondary);
                text-transform: uppercase;
                letter-spacing: 1px;
                margin: 0;
            }

            .um-user-count {
                font-size: var(--text-xs);
                font-weight: var(--weight-semibold);
                color: var(--color-text-tertiary);
                background: var(--color-bg-body);
                border: 1px solid var(--color-border);
                border-radius: 20px;
                padding: 2px 10px;
            }

            /* ── Add User Form Grid ── */
            .um-form-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr 1.3fr auto;
                gap: var(--space-3);
                align-items: end;
            }

            @media (max-width: 960px) {
                .um-form-grid {
                    grid-template-columns: 1fr 1fr;
                }
                .um-submit-btn { grid-column: 1 / -1; }
            }

            .um-field {
                display: flex;
                flex-direction: column;
                gap: var(--space-1);
            }

            .um-field label,
            .um-modal-label {
                display: block;
                font-size: var(--text-xs);
                font-weight: var(--weight-semibold);
                color: var(--color-text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.6px;
                margin-bottom: var(--space-1);
            }

            /* ── Form Input (shared with rest of app) ── */
            .form-input {
                background: var(--color-bg-input);
                border: 1px solid var(--color-border-input);
                border-radius: var(--radius-md);
                color: var(--color-text-primary);
                font-family: var(--font-family);
                font-size: var(--text-sm);
                padding: 9px var(--space-3);
                width: 100%;
                box-sizing: border-box;
                outline: none;
                transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
            }

            .form-input:focus {
                border-color: var(--color-border-focus);
                box-shadow: 0 0 0 3px var(--color-primary-surface);
            }

            .form-input::placeholder { color: var(--color-text-tertiary); }

            .form-input[readonly] {
                background: var(--color-bg-body);
                color: var(--color-text-secondary);
                cursor: not-allowed;
            }

            /* ── Role Dropdown ── */
            .um-role-wrap {
                position: relative;
                display: flex;
                flex-direction: column;
                gap: var(--space-1);
            }

            .um-role-wrap > label {
                font-size: var(--text-xs);
                font-weight: var(--weight-semibold);
                color: var(--color-text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.6px;
            }

            .um-role-btn {
                background: var(--color-bg-input);
                border: 1px solid var(--color-border-input);
                border-radius: var(--radius-md);
                color: var(--color-text-primary);
                font-family: var(--font-family);
                font-size: var(--text-sm);
                padding: 9px var(--space-3);
                width: 100%;
                text-align: left;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: var(--space-2);
                outline: none;
                box-sizing: border-box;
                transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
            }

            .um-role-btn:focus,
            .um-role-btn.open {
                border-color: var(--color-border-focus);
                box-shadow: 0 0 0 3px var(--color-primary-surface);
            }

            .um-role-label {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                color: var(--color-text-tertiary);
            }

            .um-role-btn.has-selection .um-role-label {
                color: var(--color-text-primary);
            }

            .um-chevron {
                flex-shrink: 0;
                color: var(--color-text-tertiary);
                transition: transform var(--transition-fast);
            }

            .um-role-btn.open .um-chevron { transform: rotate(180deg); }

            .um-role-badge {
                background: var(--color-primary);
                color: var(--color-text-inverse);
                font-size: var(--text-xs);
                font-weight: var(--weight-semibold);
                border-radius: 20px;
                padding: 1px 7px;
                flex-shrink: 0;
            }

            .um-role-menu {
                display: none;
                position: absolute;
                top: calc(100% + 4px);
                left: 0;
                right: 0;
                background: var(--color-bg-card);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-md);
                z-index: 200;
                box-shadow: var(--shadow-lg);
                overflow: hidden;
                max-height: 260px;
                overflow-y: auto;
            }

            .um-role-menu.open { display: block; }

            .um-role-menu label {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                padding: 9px var(--space-3);
                font-size: var(--text-sm);
                font-weight: var(--weight-regular);
                color: var(--color-text-primary);
                text-transform: none;
                letter-spacing: 0;
                cursor: pointer;
                transition: background var(--transition-fast);
                user-select: none;
            }

            .um-role-menu label:hover { background: var(--color-bg-table-row-hover); }

            .um-role-menu input[type="checkbox"] {
                accent-color: var(--color-primary);
                width: 14px;
                height: 14px;
                cursor: pointer;
                flex-shrink: 0;
            }

            /* ── Buttons ── */
            .btn {
                display: inline-flex;
                align-items: center;
                gap: var(--space-2);
                padding: 9px var(--space-4);
                border-radius: var(--radius-md);
                font-family: var(--font-family);
                font-size: var(--text-sm);
                font-weight: var(--weight-semibold);
                cursor: pointer;
                border: 1px solid transparent;
                outline: none;
                transition: background var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
                white-space: nowrap;
                line-height: 1;
            }

            .btn:active:not(:disabled) { transform: scale(0.98); }
            .btn:disabled { opacity: 0.6; cursor: not-allowed; }

            .btn--primary {
                background: var(--color-primary);
                color: var(--color-text-inverse);
                border-color: var(--color-primary);
            }
            .btn--primary:hover:not(:disabled) {
                background: var(--color-primary-light);
                border-color: var(--color-primary-light);
            }

            .btn--ghost {
                background: transparent;
                color: var(--color-text-secondary);
                border-color: var(--color-border);
            }
            .btn--ghost:hover:not(:disabled) {
                background: var(--color-bg-body);
            }

            .btn--danger {
                background: var(--color-error);
                color: var(--color-text-inverse);
                border-color: var(--color-error);
            }
            .btn--danger:hover:not(:disabled) {
                background: #A82020;
                border-color: #A82020;
            }

            .btn--icon-ghost {
                background: transparent;
                color: var(--color-text-secondary);
                border-color: transparent;
                padding: 6px var(--space-2);
            }
            .btn--icon-ghost:hover:not(:disabled) {
                background: var(--color-primary-surface);
                color: var(--color-primary);
            }

            .btn--danger-ghost {
                background: transparent;
                color: var(--color-error);
                border-color: transparent;
                padding: 6px var(--space-2);
            }
            .btn--danger-ghost:hover:not(:disabled) {
                background: var(--color-error-bg);
                border-color: var(--color-error-border);
            }

            /* ── Table ── */
            .user-table {
                width: 100%;
                border-collapse: collapse;
            }

            .user-table thead {
                background: var(--color-bg-table-header);
            }

            .user-table th {
                padding: var(--space-3);
                text-align: left;
                font-size: var(--text-xs);
                font-weight: var(--weight-semibold);
                color: var(--color-text-secondary);
                text-transform: uppercase;
                letter-spacing: 1px;
                border-bottom: 1px solid var(--color-border);
                white-space: nowrap;
            }

            .user-table td {
                padding: var(--space-3);
                font-size: var(--text-sm);
                color: var(--color-text-primary);
                border-bottom: 1px solid var(--color-border-light);
                vertical-align: middle;
            }

            .user-table tbody tr:last-child td { border-bottom: none; }

            .user-table tbody tr:hover td {
                background: var(--color-bg-table-row-hover);
            }

            .um-actions-cell {
                display: flex !important;
                align-items: center;
                gap: var(--space-1);
            }

            /* ── Role Pills ── */
            .um-pills {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
            }

            .um-pill {
                display: inline-block;
                font-size: var(--text-xs);
                font-weight: var(--weight-medium);
                border-radius: 20px;
                padding: 2px 9px;
                background: var(--color-primary-surface);
                color: var(--color-primary);
                border: 1px solid #C5D5E8;
                white-space: nowrap;
            }

            .um-pill--admin {
                background: #F3E8FF;
                color: #6B21A8;
                border-color: #D8B4FE;
            }

            /* ── Status Badge ── */
            .um-status {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                font-size: var(--text-xs);
                font-weight: var(--weight-semibold);
                border-radius: 20px;
                padding: 2px 10px;
                white-space: nowrap;
            }

            .um-status::before {
                content: '';
                width: 6px;
                height: 6px;
                border-radius: 50%;
                flex-shrink: 0;
            }

            .um-status--active {
                background: var(--color-success-bg);
                color: var(--color-success);
                border: 1px solid var(--color-success-border);
            }
            .um-status--active::before { background: var(--color-success); }

            .um-status--inactive {
                background: var(--color-inactive-bg);
                color: var(--color-inactive);
                border: 1px solid #E0E0E0;
            }
            .um-status--inactive::before { background: var(--color-inactive); }

            /* ── Table text helpers ── */
            .um-username {
                font-weight: var(--weight-semibold);
                color: var(--color-text-primary);
            }

            .um-muted {
                color: var(--color-text-tertiary);
                font-size: var(--text-xs);
            }

            /* ── Skeleton ── */
            @keyframes um-shimmer {
                0%   { background-position: -600px 0; }
                100% { background-position:  600px 0; }
            }

            .um-skeleton {
                height: 13px;
                border-radius: var(--radius-sm);
                background: linear-gradient(
                    90deg,
                    var(--color-border-light) 25%,
                    var(--color-border) 50%,
                    var(--color-border-light) 75%
                );
                background-size: 1200px 100%;
                animation: um-shimmer 1.5s infinite;
            }

            /* ── Empty state ── */
            .um-empty {
                text-align: center;
                padding: var(--space-16) var(--space-8);
                color: var(--color-text-tertiary);
            }

            .um-empty svg { margin-bottom: var(--space-4); opacity: 0.3; }

            .um-empty-title {
                font-size: var(--text-base);
                font-weight: var(--weight-semibold);
                color: var(--color-text-secondary);
                margin: 0 0 var(--space-1) 0;
            }

            .um-empty-sub {
                font-size: var(--text-sm);
                margin: 0;
            }

            /* ── Modal ── */
            .um-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(26, 29, 38, 0.5);
                backdrop-filter: blur(2px);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: um-fade 0.15s ease;
            }

            @keyframes um-fade {
                from { opacity: 0; }
                to   { opacity: 1; }
            }

            @keyframes um-rise {
                from { opacity: 0; transform: translateY(10px) scale(0.99); }
                to   { opacity: 1; transform: translateY(0)   scale(1); }
            }

            .um-modal {
                background: var(--color-bg-card);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-xl);
                box-shadow: var(--shadow-xl);
                padding: var(--space-6) var(--space-8);
                width: 100%;
                max-width: 500px;
                animation: um-rise 0.18s ease;
            }

            .um-modal-sm { max-width: 400px; }

            .um-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: var(--space-5);
                padding-bottom: var(--space-4);
                border-bottom: 1px solid var(--color-border-light);
            }

            .um-modal-title {
                font-size: var(--text-md);
                font-weight: var(--weight-bold);
                color: var(--color-text-primary);
                margin: 0;
            }

            .um-modal-close {
                background: none;
                border: none;
                color: var(--color-text-tertiary);
                cursor: pointer;
                font-size: 18px;
                width: 32px;
                height: 32px;
                border-radius: var(--radius-md);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background var(--transition-fast), color var(--transition-fast);
            }

            .um-modal-close:hover {
                background: var(--color-bg-body);
                color: var(--color-text-primary);
            }

            .um-modal-field { margin-bottom: var(--space-4); }

            /* Modal role grid */
            .um-modal-role-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 2px;
                border: 1px solid var(--color-border-input);
                border-radius: var(--radius-md);
                overflow: hidden;
                background: var(--color-bg-body);
                max-height: 220px;
                overflow-y: auto;
            }

            .um-modal-role-grid label {
                display: flex;
                align-items: center;
                gap: var(--space-2);
                padding: 8px var(--space-3);
                font-size: var(--text-sm);
                font-weight: var(--weight-regular);
                color: var(--color-text-primary);
                text-transform: none;
                letter-spacing: 0;
                cursor: pointer;
                transition: background var(--transition-fast);
                user-select: none;
                background: var(--color-bg-card);
            }

            .um-modal-role-grid label:hover {
                background: var(--color-bg-table-row-hover);
            }

            .um-modal-role-grid input[type="checkbox"] {
                accent-color: var(--color-primary);
                width: 14px;
                height: 14px;
                flex-shrink: 0;
                cursor: pointer;
            }

            /* Toggle */
            .um-toggle-row {
                display: flex;
                align-items: center;
                gap: var(--space-3);
            }

            .um-toggle {
                position: relative;
                width: 38px;
                height: 21px;
                flex-shrink: 0;
            }

            .um-toggle input { opacity: 0; width: 0; height: 0; }

            .um-toggle-track {
                position: absolute;
                inset: 0;
                background: var(--color-border-input);
                border-radius: 21px;
                cursor: pointer;
                transition: background var(--transition-fast);
            }

            .um-toggle-track::before {
                content: '';
                position: absolute;
                width: 15px;
                height: 15px;
                left: 3px;
                top: 3px;
                background: #fff;
                border-radius: 50%;
                transition: transform var(--transition-fast);
                box-shadow: var(--shadow-sm);
            }

            .um-toggle input:checked + .um-toggle-track { background: var(--color-primary); }
            .um-toggle input:checked + .um-toggle-track::before { transform: translateX(17px); }

            .um-toggle-label {
                font-size: var(--text-sm);
                color: var(--color-text-secondary);
            }

            /* Modal footer */
            .um-modal-footer {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: var(--space-3);
                margin-top: var(--space-6);
                padding-top: var(--space-5);
                border-top: 1px solid var(--color-border-light);
            }

            /* Confirm delete body */
            .um-confirm-body {
                font-size: var(--text-sm);
                color: var(--color-text-secondary);
                line-height: var(--leading-relaxed);
                padding: var(--space-2) 0 var(--space-4);
                margin: 0;
            }

            .um-confirm-body strong {
                color: var(--color-text-primary);
                font-weight: var(--weight-semibold);
            }

            /* ── Toasts ── */
            #um-toasts {
                position: fixed;
                top: var(--space-6);
                right: var(--space-6);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: var(--space-2);
                pointer-events: none;
            }

            .um-toast {
                display: flex;
                align-items: flex-start;
                gap: var(--space-3);
                background: var(--color-bg-card);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                padding: var(--space-3) var(--space-4);
                min-width: 300px;
                box-shadow: var(--shadow-lg);
                pointer-events: all;
                animation: um-rise 0.2s ease;
            }

            .um-toast--success { border-left: 3px solid var(--color-success); }
            .um-toast--error   { border-left: 3px solid var(--color-error); }

            .um-toast-icon {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: var(--weight-bold);
                flex-shrink: 0;
                margin-top: 1px;
            }

            .um-toast--success .um-toast-icon {
                background: var(--color-success-bg);
                color: var(--color-success);
            }

            .um-toast--error .um-toast-icon {
                background: var(--color-error-bg);
                color: var(--color-error);
            }

            .um-toast-body { flex: 1; }

            .um-toast-title {
                font-size: var(--text-sm);
                font-weight: var(--weight-semibold);
                color: var(--color-text-primary);
                margin-bottom: 1px;
            }

            .um-toast-msg {
                font-size: var(--text-xs);
                color: var(--color-text-secondary);
                line-height: var(--leading-normal);
            }

            .um-toast-close {
                background: none;
                border: none;
                color: var(--color-text-tertiary);
                cursor: pointer;
                font-size: 14px;
                padding: 0;
                line-height: 1;
                align-self: center;
                transition: color var(--transition-fast);
            }

            .um-toast-close:hover { color: var(--color-text-primary); }
        </style>

        <div id="um-toasts"></div>

        <div class="user-management-page">

            <!-- Page Header -->
            <div class="um-page-header">
                <h1>User Management</h1>
                <p>Create and manage operator accounts and their role access.</p>
            </div>

            <!-- Add User Form -->
            <div class="um-card">
                <div class="um-card-header">
                    <p class="um-card-title">Add New User</p>
                </div>
                <form id="um-add-form" autocomplete="off">
                    <div class="um-form-grid">
                        <div class="um-field">
                            <label for="um-username">Username</label>
                            <input type="text" id="um-username" class="form-input" placeholder="e.g. Admin" required />
                        </div>
                        <div class="um-field">
                            <label for="um-password">Password</label>
                            <input type="password" id="um-password" class="form-input" placeholder="Set a password" required autocomplete="new-password" />
                        </div>
                        <div class="um-field">
                            <label for="um-fullname">Full Name</label>
                            <input type="text" id="um-fullname" class="form-input" placeholder="e.g. Enter Full Name" required />
                        </div>
                        <div class="um-role-wrap">
                            <label>Assigned Roles</label>
                            <button type="button" id="um-role-btn" class="um-role-btn">
                                <span class="um-role-label">Select role(s)</span>
                                <svg class="um-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                            <div id="um-role-menu" class="um-role-menu">
                                ${ROLES.map(r => `
                                    <label>
                                        <input type="checkbox" value="${r}" />
                                        ${r}
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <button type="submit" class="btn btn--primary um-submit-btn" id="um-add-btn">
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                                <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                            </svg>
                            Add User
                        </button>
                    </div>
                </form>
            </div>

            <!-- User List -->
            <div class="um-card">
                <div class="um-card-header">
                    <p class="um-card-title">All Users</p>
                    <span class="um-user-count" id="um-count">—</span>
                </div>
                <div id="um-user-list">${this._skeletonTable()}</div>
            </div>

        </div>`;
    },

    _skeletonTable() {
        const row = (widths) =>
            `<tr>${widths.map(w => `<td><div class="um-skeleton" style="width:${w}"></div></td>`).join('')}</tr>`;
        return `
            <table class="user-table">
                <thead><tr>
                    <th>Username</th><th>Full Name</th><th>Roles</th>
                    <th>Status</th><th>Last Login</th><th>Actions</th>
                </tr></thead>
                <tbody>
                    ${row(['80px', '130px', '210px', '65px', '110px', '90px'])}
                    ${row(['70px', '150px', '170px', '65px', '110px', '90px'])}
                    ${row(['90px', '120px', '230px', '65px', '110px', '90px'])}
                </tbody>
            </table>`;
    },

    // ─── API ──────────────────────────────────────────────────────────────────

    async fetchUsers() {
        const res = await fetch(`${API_BASE}/users/`);
        if (!res.ok) throw new Error('Failed to load users');
        return await res.json();
    },

    async addUser(payload) {
        const res = await fetch(`${API_BASE}/users/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.status === 201) return await res.json();
        const err = await res.json().catch(() => ({}));
        throw new Error(
            Array.isArray(err.detail)
                ? err.detail.map(d => d.msg).join('; ')
                : (err.detail || 'Failed to add user')
        );
    },

    async patchUser(username, payload) {
        const res = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.ok) return await res.json();
        const err = await res.json().catch(() => ({}));
        throw new Error(
            Array.isArray(err.detail)
                ? err.detail.map(d => d.msg).join('; ')
                : (err.detail || 'Failed to update user')
        );
    },

    async deleteUser(username) {
        const res = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete user');
    },

    // ─── Init ─────────────────────────────────────────────────────────────────

    async init() {
        try {
            this.users = await this.fetchUsers();
        } catch {
            this.users = [];
            this.showToast('Could not load users from server.', 'error');
        }
        this.renderUserList();
        this._initAddForm();
    },

    _initAddForm() {
        const form     = document.getElementById('um-add-form');
        const roleBtn  = document.getElementById('um-role-btn');
        const roleMenu = document.getElementById('um-role-menu');
        let selectedRoles = [];

        // Toggle dropdown
        roleBtn.addEventListener('click', e => {
            e.preventDefault();
            const open = roleMenu.classList.toggle('open');
            roleBtn.classList.toggle('open', open);
        });

        // Close on outside click
        document.addEventListener('mousedown', e => {
            if (!roleMenu.contains(e.target) && !roleBtn.contains(e.target)) {
                roleMenu.classList.remove('open');
                roleBtn.classList.remove('open');
            }
        });

        // Sync button label & badge
        const syncRoleBtn = () => {
            selectedRoles = Array.from(roleMenu.querySelectorAll('input:checked')).map(cb => cb.value);
            const labelEl = roleBtn.querySelector('.um-role-label');
            let badge = roleBtn.querySelector('.um-role-badge');

            if (selectedRoles.length === 0) {
                labelEl.textContent = 'Select role(s)';
                roleBtn.classList.remove('has-selection');
                if (badge) badge.remove();
            } else {
                labelEl.textContent = selectedRoles[0];
                roleBtn.classList.add('has-selection');
                if (selectedRoles.length > 1) {
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'um-role-badge';
                        roleBtn.querySelector('.um-chevron').before(badge);
                    }
                    badge.textContent = `+${selectedRoles.length - 1}`;
                } else if (badge) {
                    badge.remove();
                }
            }
        };

        roleMenu.addEventListener('change', syncRoleBtn);

        // Submit
        form.addEventListener('submit', async e => {
            e.preventDefault();
            selectedRoles = Array.from(roleMenu.querySelectorAll('input:checked')).map(cb => cb.value);

            if (selectedRoles.length === 0) {
                this.showToast('Please select at least one role.', 'error');
                return;
            }

            const addBtn = document.getElementById('um-add-btn');
            addBtn.disabled = true;
            addBtn.textContent = 'Adding…';

            try {
                const newUser = await this.addUser({
                    username:       document.getElementById('um-username').value.trim(),
                    full_name:      document.getElementById('um-fullname').value.trim(),
                    password:       document.getElementById('um-password').value,
                    assigned_roles: selectedRoles,
                    is_active:      true,
                });
                this.users.push(newUser);
                this.renderUserList();
                form.reset();
                roleMenu.querySelectorAll('input').forEach(cb => cb.checked = false);
                syncRoleBtn();
                this.showToast('User added successfully.', 'success');
            } catch (err) {
                this.showToast(err.message, 'error');
            } finally {
                addBtn.disabled = false;
                addBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg> Add User`;
            }
        });
    },

    // ─── Render List ──────────────────────────────────────────────────────────

    renderUserList() {
        const container = document.getElementById('um-user-list');
        const countEl   = document.getElementById('um-count');
        if (!container) return;

        if (countEl) {
            countEl.textContent = `${this.users.length} user${this.users.length !== 1 ? 's' : ''}`;
        }

        if (this.users.length === 0) {
            container.innerHTML = `
                <div class="um-empty">
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <p class="um-empty-title">No users found</p>
                    <p class="um-empty-sub">Add a user using the form above.</p>
                </div>`;
            return;
        }

        const rows = this.users.map(u => {
            const roles = Array.isArray(u.assigned_roles) ? u.assigned_roles : [u.assigned_roles];
            const pills = roles.map(r =>
                `<span class="um-pill${r === 'admin' ? ' um-pill--admin' : ''}">${r}</span>`
            ).join('');
            const isActive  = u.is_active !== false;
            const lastLogin = u.last_login ? new Date(u.last_login).toLocaleString() : '—';

            return `
                <tr data-username="${u.username}">
                    <td><span class="um-username">${u.username}</span></td>
                    <td>${u.full_name}</td>
                    <td><div class="um-pills">${pills}</div></td>
                    <td>
                        <span class="um-status ${isActive ? 'um-status--active' : 'um-status--inactive'}">
                            ${isActive ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td><span class="${lastLogin === '—' ? 'um-muted' : ''}">${lastLogin}</span></td>
                    <td class="um-actions-cell">
                        <button class="btn btn--icon-ghost um-edit-btn" title="Edit user">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Edit
                        </button>
                        <button class="btn btn--danger-ghost um-delete-btn" title="Delete user">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                            </svg>
                            Delete
                        </button>
                    </td>
                </tr>`;
        }).join('');

        container.innerHTML = `
            <table class="user-table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Full Name</th>
                        <th>Roles</th>
                        <th>Status</th>
                        <th>Last Login</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;

        container.querySelectorAll('.um-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const username = btn.closest('tr').dataset.username;
                this.showEditModal(username);
            });
        });

        container.querySelectorAll('.um-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const username = btn.closest('tr').dataset.username;
                this.showDeleteConfirm(username);
            });
        });
    },

    // ─── Edit Modal ───────────────────────────────────────────────────────────

    showEditModal(username) {
        const user = this.users.find(u => u.username === username);
        if (!user) return;
        this._removeBackdrop();

        const currentRoles = Array.isArray(user.assigned_roles)
            ? user.assigned_roles
            : [user.assigned_roles];

        const roleCheckboxes = ROLES.map(r => `
            <label>
                <input type="checkbox" value="${r}" ${currentRoles.includes(r) ? 'checked' : ''} />
                ${r}
            </label>`).join('');

        const backdrop = this._createBackdrop(`
            <div class="um-modal" id="um-modal-box" role="dialog" aria-modal="true" aria-labelledby="um-modal-title">
                <div class="um-modal-header">
                    <h2 class="um-modal-title" id="um-modal-title">Edit User</h2>
                    <button class="um-modal-close" id="um-modal-close">&#x2715;</button>
                </div>
                <form id="um-edit-form">
                    <div class="um-modal-field">
                        <label class="um-modal-label">Username</label>
                        <input class="form-input" value="${user.username}" readonly />
                    </div>
                    <div class="um-modal-field">
                        <label class="um-modal-label" for="um-edit-fullname">Full Name</label>
                        <input type="text" id="um-edit-fullname" class="form-input"
                               value="${user.full_name}" required />
                    </div>
                    <div class="um-modal-field">
                        <label class="um-modal-label">Assigned Roles</label>
                        <div class="um-modal-role-grid" id="um-edit-roles">
                            ${roleCheckboxes}
                        </div>
                    </div>
                    <div class="um-modal-field">
                        <label class="um-modal-label">Account Status</label>
                        <div class="um-toggle-row">
                            <label class="um-toggle">
                                <input type="checkbox" id="um-edit-active"
                                       ${user.is_active !== false ? 'checked' : ''} />
                                <span class="um-toggle-track"></span>
                            </label>
                            <span class="um-toggle-label" id="um-active-label">
                                ${user.is_active !== false ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                    <div class="um-modal-footer">
                        <button type="button" class="btn btn--ghost" id="um-modal-cancel">Cancel</button>
                        <button type="submit" class="btn btn--primary" id="um-modal-save">Save Changes</button>
                    </div>
                </form>
            </div>`);

        const activeToggle = document.getElementById('um-edit-active');
        const activeLabel  = document.getElementById('um-active-label');
        activeToggle.addEventListener('change', () => {
            activeLabel.textContent = activeToggle.checked ? 'Active' : 'Inactive';
        });

        const closeModal = () => this._removeBackdrop();
        document.getElementById('um-modal-close').addEventListener('click', closeModal);
        document.getElementById('um-modal-cancel').addEventListener('click', closeModal);
        backdrop.addEventListener('mousedown', e => {
            if (!document.getElementById('um-modal-box').contains(e.target)) closeModal();
        });

        document.getElementById('um-edit-form').addEventListener('submit', async e => {
            e.preventDefault();
            const selectedRoles = Array.from(
                document.getElementById('um-edit-roles').querySelectorAll('input:checked')
            ).map(cb => cb.value);

            if (selectedRoles.length === 0) {
                this.showToast('Please select at least one role.', 'error');
                return;
            }

            const saveBtn = document.getElementById('um-modal-save');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving…';

            try {
                const updated = await this.patchUser(user.username, {
                    full_name:      document.getElementById('um-edit-fullname').value.trim(),
                    assigned_roles: selectedRoles,
                    is_active:      activeToggle.checked,
                });
                const idx = this.users.findIndex(u => u.username === user.username);
                if (idx !== -1) this.users[idx] = updated;
                this.renderUserList();
                closeModal();
                this.showToast('User updated successfully.', 'success');
            } catch (err) {
                this.showToast(err.message, 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';
            }
        });
    },

    // ─── Delete Confirm ───────────────────────────────────────────────────────

    showDeleteConfirm(username) {
        this._removeBackdrop();

        const backdrop = this._createBackdrop(`
            <div class="um-modal um-modal-sm" id="um-modal-box" role="dialog" aria-modal="true">
                <div class="um-modal-header">
                    <h2 class="um-modal-title">Delete User</h2>
                    <button class="um-modal-close" id="um-modal-close">&#x2715;</button>
                </div>
                <p class="um-confirm-body">
                    Are you sure you want to delete <strong>${username}</strong>?
                    This action is permanent and cannot be undone.
                </p>
                <div class="um-modal-footer">
                    <button type="button" class="btn btn--ghost" id="um-del-cancel">Cancel</button>
                    <button type="button" class="btn btn--danger" id="um-del-confirm">Delete User</button>
                </div>
            </div>`);

        const closeModal = () => this._removeBackdrop();
        document.getElementById('um-modal-close').addEventListener('click', closeModal);
        document.getElementById('um-del-cancel').addEventListener('click', closeModal);
        backdrop.addEventListener('mousedown', e => {
            if (!document.getElementById('um-modal-box').contains(e.target)) closeModal();
        });

        document.getElementById('um-del-confirm').addEventListener('click', async () => {
            const btn = document.getElementById('um-del-confirm');
            btn.disabled = true;
            btn.textContent = 'Deleting…';
            try {
                await this.deleteUser(username);
                this.users = this.users.filter(u => u.username !== username);
                this.renderUserList();
                closeModal();
                this.showToast(`User "${username}" deleted.`, 'success');
            } catch (err) {
                this.showToast(err.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Delete User';
            }
        });
    },

    // ─── Backdrop Helpers ─────────────────────────────────────────────────────

    _createBackdrop(html) {
        const el = document.createElement('div');
        el.id = 'um-backdrop';
        el.className = 'um-backdrop';
        el.innerHTML = html;
        document.body.appendChild(el);
        return el;
    },

    _removeBackdrop() {
        document.getElementById('um-backdrop')?.remove();
    },

    // ─── Toast ────────────────────────────────────────────────────────────────

    showToast(message, type = 'success') {
        let container = document.getElementById('um-toasts');
        if (!container) {
            container = document.createElement('div');
            container.id = 'um-toasts';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `um-toast um-toast--${type}`;
        toast.innerHTML = `
            <div class="um-toast-icon">${type === 'success' ? '✓' : '✕'}</div>
            <div class="um-toast-body">
                <div class="um-toast-title">${type === 'success' ? 'Success' : 'Error'}</div>
                <div class="um-toast-msg">${message}</div>
            </div>
            <button class="um-toast-close" title="Dismiss">&#x2715;</button>`;

        container.appendChild(toast);
        toast.querySelector('.um-toast-close').addEventListener('click', () => toast.remove());
        setTimeout(() => toast.parentNode && toast.remove(), 4500);
    },
};

export default UserManagement;