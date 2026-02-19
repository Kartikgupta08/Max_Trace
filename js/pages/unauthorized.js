/**
 * unauthorized.js — Unauthorized Access Page
 * 
 * Shown when an authenticated user tries to access a route
 * their role is not allowed to view (e.g., operator → admin pages).
 */

import Auth from '../core/auth.js';
import Router from '../core/router.js';

const Unauthorized = {
    render() {
        const role = Auth.getRole();
        const user = Auth.getUser();

        return `
            <div class="unauthorized-page">
                <div class="unauthorized-page__icon">
                    <span class="material-symbols-outlined">lock</span>
                </div>
                <h1>Access Denied</h1>
                <p>
                    You do not have permission to view this page.
                    ${role ? `Your current role (<strong>${role}</strong>) does not have access to this section.` : 'Please log in with an authorized account.'}
                </p>
                <div style="display:flex; gap:12px;">
                    ${Auth.isAuthenticated() ? `
                        <button class="btn btn--primary" id="btn-go-home">
                            Return to Home
                        </button>
                    ` : `
                        <button class="btn btn--primary" id="btn-go-login">
                            Go to Login
                        </button>
                    `}
                </div>
            </div>
        `;
    },

    init() {
        // Hide sidebar/header for this page
        const shell = document.querySelector('.app-shell');
        if (shell) shell.classList.add('app-shell--auth');

        const homeBtn = document.getElementById('btn-go-home');
        const loginBtn = document.getElementById('btn-go-login');

        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                if (shell) shell.classList.remove('app-shell--auth');
                window.location.hash = Router.getDefaultRoute();
            });
        }

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                window.location.hash = '#/login';
            });
        }

        return () => {
            if (shell) shell.classList.remove('app-shell--auth');
        };
    }
};

export default Unauthorized;
