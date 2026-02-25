const API_BASE = 'http://localhost:8000';
/**
 * userManagement.js — Admin User Management Page
 * Allows admin to view, add, and manage users.
 */

const UserManagement = {
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
        if (!res.ok) return [];
        return await res.json();
    },

    async addUser(user) {
        const res = await fetch(`${API_BASE}/users/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        if (res.status === 201) {
            return await res.json();
        } else {
            let errMsg = 'Failed to add user';
            try {
                const err = await res.json();
                if (err.detail && Array.isArray(err.detail)) {
                    errMsg += ': ' + err.detail.map(d => d.msg).join('; ');
                }
            } catch {}
            throw new Error(errMsg);
        }
    },

    async init() {
        const form = document.getElementById('add-user-form');
        const userList = document.getElementById('user-list');
        // Fetch users from backend
        this.users = await this.fetchUsers();
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
                alert('Failed to add user: ' + err.message);
            }
        });

    },

    showToast(message, type = 'success') {
        // Remove any existing toast
        const oldToast = document.getElementById('custom-toast');
        if (oldToast) oldToast.remove();
        // Create toast container
        const toast = document.createElement('div');
        toast.id = 'custom-toast';
        toast.style.position = 'fixed';
        toast.style.top = '32px';
        toast.style.right = '32px';
        toast.style.background = '#fff';
        toast.style.borderRadius = '12px';
        toast.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)';
        toast.style.padding = '20px 32px 20px 20px';
        toast.style.display = 'flex';
        toast.style.alignItems = 'flex-start';
        toast.style.minWidth = '320px';
        toast.style.zIndex = 9999;
        toast.style.borderLeft = type === 'success' ? '4px solid #22c55e' : '4px solid #dc3545';
        toast.innerHTML = `
            <div style="margin-right:16px;margin-top:2px;">
                ${type === 'success' ? '<span style=\'color:#22c55e;font-size:22px;\'>&#10003;</span>' : '<span style=\'color:#dc3545;font-size:22px;\'>&#10007;</span>'}
            </div>
            <div style="flex:1;">
                <div style="font-weight:600;font-size:17px;color:#222;">${type === 'success' ? 'Success' : 'Error'}</div>
                <div style="color:#6b7280;font-size:15px;margin-top:2px;">${message}</div>
            </div>
            <button id="close-toast-btn" style="background:none;border:none;font-size:20px;color:#888;cursor:pointer;margin-left:16px;">&times;</button>
        `;
        document.body.appendChild(toast);
        document.getElementById('close-toast-btn').onclick = () => toast.remove();
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);
    },
    renderUserList() {
        const userList = document.getElementById('user-list');
        if (!userList) return;
        if (this.users.length === 0) {
            userList.innerHTML = '<p>No users added yet.</p>';
            return;
        }
        userList.innerHTML = `
            <table class="user-table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Full Name</th>
                        <th>Roles</th>
                        <th>Last Login</th>
                        <th>Created At</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.users.map(u => `
                        <tr data-username="${u.username}">
                            <td>${u.username}</td>
                            <td>${u.full_name}</td>
                            <td>${Array.isArray(u.assigned_roles) ? u.assigned_roles.join(', ') : u.assigned_roles}</td>
                            <td>${u.last_login ? new Date(u.last_login).toLocaleString() : '-'}</td>
                            <td>${u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</td>
                            <td style="display:flex;flex-direction:row;gap:18px;align-items:center;justify-content:center;">
                                    <button class="edit-user-btn" title="Edit" style="background:none;border:none;cursor:pointer;padding:0;display:flex;align-items:center;">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3 17.25V21h3.75l11.06-11.06-3.75-3.75L3 17.25z" fill="#16213E"/>
                                            <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#16213E"/>
                                        </svg>
                                    </button>
                                    <button class="delete-user-btn" title="Delete" style="background:none;border:none;cursor:pointer;padding:0;display:flex;align-items:center;">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="#16213E"/>
                                        </svg>
                                    </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Add event listeners for edit and delete
        userList.querySelectorAll('.delete-user-btn').forEach((btn, idx) => {
            btn.onclick = (e) => {
                e.preventDefault();
                const tr = btn.closest('tr');
                const username = tr.querySelector('td').textContent.trim();
                if (confirm('Delete this user?')) {
                    UserManagement.deleteUser(username);
                }
            };
        });
        userList.querySelectorAll('.edit-user-btn').forEach((btn, idx) => {
            btn.onclick = (e) => {
                e.preventDefault();
                const tr = btn.closest('tr');
                const username = tr.getAttribute('data-username');
                UserManagement.showEditUserForm(username);
            };
        });
    },

    async deleteUser(userId) {
        // Call backend to delete user by username
        try {
            await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
            this.users = this.users.filter(u => u.username !== userId);
            this.renderUserList();
        } catch (err) {
            alert('Failed to delete user: ' + err.message);
        }
    },

    showEditUserForm(userId) {
        const user = this.users.find(u => u.username === userId);
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
                if (!res.ok) {
                    let errMsg = 'Failed to update user';
                    try {
                        const err = await res.json();
                        if (err.detail && Array.isArray(err.detail)) {
                            errMsg += ': ' + err.detail.map(d => d.msg).join('; ');
                        }
                    } catch {}
                    throw new Error(errMsg);
                }
                const updatedUser = await res.json();
                // Update local user
                const idx = UserManagement.users.findIndex(u => String(u.id) === String(user.id));
                if (idx !== -1) UserManagement.users[idx] = updatedUser;
                UserManagement.renderUserList();
                container.remove();
                UserManagement.showToast('User updated successfully.', 'success');
                // Reset add user form after editing
                const addUserForm = document.getElementById('add-user-form');
                if (addUserForm) {
                    addUserForm.reset();
                    // Also reset role selection UI
                    const roleMenu = document.getElementById('role-checkbox-menu');
                    const roleBtn = document.getElementById('role-select-btn');
                    if (roleMenu) roleMenu.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
                    if (roleBtn) roleBtn.textContent = 'Select Role(s)';
                }
            } catch (err) {
                alert('Failed to update user: ' + err.message);
            }
        };
    }
};

export default UserManagement;
