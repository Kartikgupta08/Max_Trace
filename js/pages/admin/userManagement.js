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
                        <select id="role" class="form-input" required>
                            <option value="">Select Role</option>
                            <option value="admin">Admin</option>
                            <option value="Cell Registeration">Cell Registeration</option>
                            <option value="Cell Grading">Cell Grading</option>
                            <option value="Cell Sorting">Cell Sorting</option>
                            <option value="Assembly and Mapping">Assembly and Mapping</option>
                            <option value="Welding">Welding</option>
                            <option value="BMS Mounting">BMS Mounting</option>
                            <option value="Pack Testing">Pack Testing</option>
                            <option value="PDI Inspection">PDI Inspection</option>
                            <option value="Dispatch">Dispatch</option>
                        </select>
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

    init() {
        const form = document.getElementById('add-user-form');
        const userList = document.getElementById('user-list');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = {
                username: form.username.value.trim(),
                password: form.password.value,
                full_name: form.full_name.value.trim(),
                role: form.role.value
            };
            UserManagement.users.push(user);
            UserManagement.renderUserList();
            form.reset();
        });
        this.renderUserList();
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
                        <th>Role</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.users.map(u => `
                        <tr>
                            <td>${u.username}</td>
                            <td>${u.full_name}</td>
                            <td>${u.role}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
};

export default UserManagement;
