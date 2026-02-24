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
        const res = await fetch('/api/users');
        if (!res.ok) return [];
        return await res.json();
    },

    async addUser(user) {
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        if (!res.ok) throw new Error('Failed to add user');
        return await res.json();
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
                password: form.password.value,
                full_name: form.full_name.value.trim(),
                assigned_roles: selectedRoles
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
            } catch (err) {
                alert('Failed to add user: ' + err.message);
            }
        });
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
                    </tr>
                </thead>
                <tbody>
                    ${this.users.map(u => `
                        <tr>
                            <td>${u.username}</td>
                            <td>${u.full_name}</td>
                            <td>${Array.isArray(u.roles) ? u.roles.join(', ') : u.roles}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
};

export default UserManagement;
