const API_BASE = 'http://localhost:8000';

/**
 * userManagement.js — Admin User Management Page
 * Allows admin to view, add, and manage users.
 */

const UserManagement = {
    users: [],

    // ─── Render ───────────────────────────────────────────────────────────────

    render() {
        return `
        <div class="content user-management-page">
            <div class="page-header">
                <h1 class="page-header__title">User Management</h1>
            </div>
            <div class="user-management__form-card">
                <form id="add-user-form" class="user-form">
                    <div class="user-form__row">
                        <input type="text" id="username" class="form-input" placeholder="Username" required />
                        <input type="password" id="password" class="form-input" placeholder="Password" required />
                        <input type="text" id="full_name" class="form-input" placeholder="Full Name" required />
                        <div class="role-select-group" style="position:relative;">
                            <button type="button" id="role-select-btn" class="form-input" style="width:320px; text-align:left; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">Select Role(s)</button>
                            <div id="role-checkbox-menu" class="role-checkbox-menu" style="display:none; position:absolute; background:#fff; border:1px solid #ccc; z-index:10; padding:10px; min-width:320px;">
                                <label><input type="checkbox" value="admin"> Admin</label><br>
                                <label><input type="checkbox" value="Cell Registeration"> Cell Registeration</label><br>
                                <label><input type="checkbox" value="Cell Grading"> Cell Grading</label><br>
                                <label><input type="checkbox" value="Cell Sorting"> Cell Sorting</label><br>
                                <label><input type="checkbox" value="Assembly and Mapping"> Assembly and Mapping</label><br>
                                <label><input type="checkbox" value="Welding"> Welding</label><br>
                                <label><input type="checkbox" value="BMS Mounting"> BMS Mounting</label><br>
                                <label><input type="checkbox" value="Pack Testing"> Pack Testing</label><br>
                                <label><input type="checkbox" value="PDI Inspection"> PDI Inspection</label><br>
                                <label><input type="checkbox" value="Dispatch"> Dispatch</label>
                            </div>
                        </div>
                        <button type="submit" class="btn btn--primary">Add User</button>
                    </div>
                </form>
            </div>
            <div class="user-management__list-card">
                <div id="user-list"></div>
            </div>
        </div>
        `;
    },

    users: [],

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

        // Role select button logic
        const roleBtn = document.getElementById('role-select-btn');
        const roleMenu = document.getElementById('role-checkbox-menu');
        let selectedRoles = [];

        roleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            roleMenu.style.display = roleMenu.style.display === 'none' ? 'block' : 'none';
        });

        // Hide menu when clicking outside
        document.addEventListener('mousedown', (e) => {
            if (!roleMenu.contains(e.target) && e.target !== roleBtn) {
                roleMenu.style.display = 'none';
            }
        });

        // Update button text with selected roles (show only first, truncate if needed)
        roleMenu.addEventListener('change', () => {
            selectedRoles = Array.from(roleMenu.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
            if (selectedRoles.length === 0) {
                roleBtn.textContent = 'Select Role(s)';
            } else {
                // Show only the first selected role, truncate if too long
                let firstRole = selectedRoles[0];
                if (firstRole.length > 30) {
                    firstRole = firstRole.slice(0, 27) + '...';
                }
                roleBtn.textContent = firstRole;
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            // Get selected roles as array
            selectedRoles = Array.from(roleMenu.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
            if (selectedRoles.length === 0) {
                alert('Please select at least one role.');
                return;
            }
            const user = {
                username: form.username.value.trim(),
                full_name: form.full_name.value.trim(),
                assigned_roles: selectedRoles,
                is_active: true,
                password: form.password.value
            };
            try {
                const newUser = await this.addUser(user);
                this.users.push(newUser);
                this.renderUserList();
                form.reset();
                // Reset role selection
                roleMenu.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
                roleBtn.textContent = 'Select Role(s)';
                selectedRoles = [];
                UserManagement.showToast('User added successfully.', 'success');
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
        let editForm = document.getElementById('edit-user-form');
        if (editForm) editForm.remove();
        const container = document.createElement('div');
        container.id = 'edit-user-form';
        container.style.background = '#fff';
        container.style.border = '1px solid #ccc';
        container.style.borderRadius = '8px';
        container.style.padding = '24px';
        container.style.margin = '24px auto';
        container.style.maxWidth = '480px';
        container.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)';
        container.innerHTML = `
            <h2 style="margin-top:0;">Edit User</h2>
            <form id="edit-user-detail-form">
                <label>Username:<input type="text" name="username" value="${user.username}" required class="form-input" readonly /></label><br><br>
                <label>Full Name:<input type="text" name="full_name" value="${user.full_name}" required class="form-input" /></label><br><br>
                <label>Roles:<input type="text" name="assigned_roles" value="${user.assigned_roles.join(', ')}" required class="form-input" /></label><br><br>
                <label>Active:<input type="checkbox" name="is_active" ${user.is_active ? 'checked' : ''} /></label><br><br>
                <button type="submit" class="btn btn--primary">Save</button>
                <button type="button" id="cancel-edit-user" class="btn">Cancel</button>
            </form>
        `;
        document.body.appendChild(container);
        document.getElementById('cancel-edit-user').onclick = () => {
            container.remove();
            // Reset add user form after closing edit modal
            const addUserForm = document.getElementById('add-user-form');
            if (addUserForm) {
                addUserForm.reset();
                // Also reset role selection UI
                const roleMenu = document.getElementById('role-checkbox-menu');
                const roleBtn = document.getElementById('role-select-btn');
                if (roleMenu) roleMenu.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
                if (roleBtn) roleBtn.textContent = 'Select Role(s)';
            }
        };
        document.getElementById('edit-user-detail-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            // Only send fields that are editable
            const patchData = {
                full_name: formData.get('full_name'),
                assigned_roles: formData.get('assigned_roles').split(',').map(r => r.trim()),
                is_active: formData.get('is_active') === 'on',
            };
            try {
                const res = await fetch(`${API_BASE}/users/${encodeURIComponent(user.username)}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patchData)
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