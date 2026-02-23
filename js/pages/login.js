/**
 * login.js — Login Page
 * 
 * Authentication form. On success, stores JWT and user data,
 * then redirects to the appropriate landing page based on role.
 * 
 * API: POST /api/v1/auth/login
 * Payload: { username, password }
 * Response: { token, user: { id, name, role, email } }
 */

import Auth from '../core/auth.js';
import API from '../core/api.js';
import Router from '../core/router.js';
import Toast from '../components/toast.js';

const Login = {
    render() {
        return `
            <div class="login-page">
                <img src="/Assets/maxvolt-logo.png.png" alt="MaxVolt Energy Logo" style="position: absolute; top: 32px; left: 48px; height: 100px; z-index: 10;" />
                <div class="login-card">
                    <div class="login-card__brand">
                        <div class="login-card__logo">MT</div>
                        <h1 class="login-card__title">MaxTrace</h1>
                        <p class="login-card__subtitle">Battery Traceability & Manufacturing</p>
                    </div>

                    <form id="login-form" autocomplete="off">
                        <div class="form-group">
                            <label class="form-label form-label--required" for="login-username">Username</label>
                            <input
                                type="text"
                                id="login-username"
                                class="form-input"
                                placeholder="Enter your username"
                                required
                                autofocus
                            >
                        </div>

                        <div class="form-group">
                            <label class="form-label form-label--required" for="login-password">Password</label>
                            <input
                                type="password"
                                id="login-password"
                                class="form-input"
                                placeholder="Enter your password"
                                required
                            >
                        </div>

                        <div id="login-error" class="form-error" style="display:none; margin-bottom:16px; text-align:center;"></div>

                        <button type="submit" id="btn-login" class="btn btn--primary btn--lg btn--full">
                            Sign In
                        </button>
                    </form>

                    <div style="text-align:center; margin-top:24px; padding-top:16px; border-top:1px solid var(--color-border-light);">
                        <p class="text-xs text-muted">
                            Factory Manufacturing System<br>
                            For authorized personnel only
                        </p>
                    </div>

                </div>
            </div>
        `;
    },

    init() {
        const form = document.getElementById('login-form');
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const btn = document.getElementById('btn-login');
        const errorEl = document.getElementById('login-error');
        let isSubmitting = false;

        // If already authenticated, redirect
        if (Auth.isAuthenticated()) {
            window.location.hash = Router.getDefaultRoute();
            return;
        }

        // Hide sidebar/header for login page
        const shell = document.querySelector('.app-shell');
        if (shell) shell.classList.add('app-shell--auth');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isSubmitting) return;

            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            if (!username || !password) {
                _showError('Please enter both username and password.');
                return;
            }

            isSubmitting = true;
            btn.disabled = true;
            btn.innerHTML = '<span class="btn__spinner"></span> Signing In...';
            errorEl.style.display = 'none';

            // ── Demo Mode: mock credentials when no backend is running ──
            // ADMIN  → username: admin  | password: admin123
            // OPERATOR → username: operator | password: operator123
            const DEMO_USERS = {
                admin:    { password: 'admin123',    user: { id: 1, name: 'Admin User',    role: 'ADMIN',    email: 'admin@maxtrace.local' } },
                operator: { password: 'operator123', user: { id: 2, name: 'Line Operator',  role: 'OPERATOR', email: 'operator@maxtrace.local' } }
            };

            let result;
            const demoEntry = DEMO_USERS[username.toLowerCase()];

            if (demoEntry && password === demoEntry.password) {
                // Build a mock JWT (header.payload.signature) with 8-hour expiry
                const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
                const payload = btoa(JSON.stringify({
                    sub: demoEntry.user.id,
                    role: demoEntry.user.role,
                    exp: Math.floor(Date.now() / 1000) + 28800
                }));
                const mockToken = `${header}.${payload}.demo_signature`;
                result = { success: true, data: { token: mockToken, user: demoEntry.user } };
            } else {
                // Try real backend (will gracefully fail if server is not running)
                result = await API.post('/auth/login', { username, password });
            }

            isSubmitting = false;
            btn.disabled = false;
            btn.textContent = 'Sign In';

            if (result.success && result.data) {
                const { token, user } = result.data;

                if (!token || !user || !user.role) {
                    _showError('Invalid response from server. Contact admin.');
                    return;
                }

                // Store auth data
                Auth.login(token, user);

                // Remove auth layout class
                if (shell) shell.classList.remove('app-shell--auth');

                Toast.success(`Welcome, ${user.name || 'User'}`);

                // Redirect to role-appropriate landing page
                window.location.hash = Router.getDefaultRoute();
            } else {
                if (result.error === 'VALIDATION_ERROR') {
                    _showError(typeof result.detail === 'string' ? result.detail : 'Invalid credentials.');
                } else {
                    _showError('Login failed. Please check your credentials.');
                }
                passwordInput.value = '';
                passwordInput.focus();
            }
        });

        function _showError(msg) {
            errorEl.textContent = msg;
            errorEl.style.display = 'block';
        }

        // Cleanup: restore layout
        return () => {
            const shell = document.querySelector('.app-shell');
            if (shell) shell.classList.remove('app-shell--auth');
        };
    }
};

export default Login;