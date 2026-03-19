/**
 * login.js — Login Page
 *
 * Split-screen layout:
 *   Left  — animated traceability cycle infographic (CSS-only, no external assets)
 *   Right — login form with MaxVolt logo
 *
 * Fix: Login API call now uses raw fetch instead of API.post.
 *   api.js treats every 401 as "Session expired" and fires a toast —
 *   correct for all other pages, but on the login page a 401 means
 *   "wrong credentials" and must show the inline error, not a toast.
 *   Bypassing api.js for this one call solves it completely.
 */

import Auth from '../core/auth.js';
import Router from '../core/router.js';

// ── API base — same logic as api.js, kept in sync ──────────────────────────
const _API_BASE = 'https://maxtraceapi.maxvoltenergy.com';

const Login = {
    render() {
        return `
        <style>
            /* ── Reset for login page ── */
            .login-page *,
            .login-page *::before,
            .login-page *::after {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            .login-page {
                display: flex;
                min-height: 100vh;
                font-family: var(--font-family);
                background: #F2F4F7;
            }

            /* ════════════════════════════════════════
               LEFT PANEL — Traceability Visual
            ════════════════════════════════════════ */
            .login-left {
                flex: 1.1;
                background: var(--color-primary);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 48px 40px;
                position: relative;
                overflow: hidden;
            }

            .login-left::before {
                content: '';
                position: absolute;
                width: 600px;
                height: 600px;
                border-radius: 50%;
                border: 1px solid rgba(255,255,255,0.05);
                top: -100px;
                right: -150px;
                pointer-events: none;
            }

            .login-left::after {
                content: '';
                position: absolute;
                width: 400px;
                height: 400px;
                border-radius: 50%;
                border: 1px solid rgba(255,255,255,0.06);
                bottom: -80px;
                left: -80px;
                pointer-events: none;
            }

            .login-logo-wrap {
                position: absolute;
                top: 32px;
                left: 36px;
                display: flex;
                align-items: center;
                gap: 12px;
                animation: lf-fade 0.5s ease both;
            }

            .login-logo-wrap img {
                height: 44px;
                width: auto;
                object-fit: contain;
                filter: brightness(0) invert(1);
                opacity: 0.92;
            }

            .login-logo-fallback {
                display: none;
                background: rgba(255,255,255,0.15);
                color: #fff;
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 1.5px;
                padding: 6px 12px;
                border-radius: 6px;
                border: 1px solid rgba(255,255,255,0.2);
            }

            .login-logo-wrap img.errored + .login-logo-fallback { display: flex; }
            .login-logo-wrap img.errored { display: none; }

            .login-left-headline {
                text-align: center;
                margin-bottom: 40px;
                animation: lf-fade 0.5s 0.1s ease both;
                position: relative;
                z-index: 1;
            }

            .login-left-headline h2 {
                font-size: 22px;
                font-weight: 700;
                color: #fff;
                letter-spacing: -0.3px;
                margin-bottom: 6px;
            }

            .login-left-headline p {
                font-size: 13px;
                color: rgba(255,255,255,0.6);
                line-height: 1.5;
            }

            /* ── Traceability Cycle ── */
            .trace-cycle {
                position: relative;
                width: 320px;
                height: 320px;
                flex-shrink: 0;
                z-index: 1;
                animation: lf-fade 0.5s 0.15s ease both;
            }

            .trace-ring {
                position: absolute;
                inset: 0;
                border-radius: 50%;
                border: 1.5px dashed rgba(255,255,255,0.15);
            }

            .trace-ring-inner {
                position: absolute;
                inset: 48px;
                border-radius: 50%;
                border: 1px solid rgba(255,255,255,0.08);
            }

            .trace-center {
                position: absolute;
                inset: 96px;
                border-radius: 50%;
                background: rgba(255,255,255,0.07);
                border: 1px solid rgba(255,255,255,0.12);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 4px;
            }

            .trace-center-icon {
                font-size: 22px;
                color: rgba(255,255,255,0.9);
            }

            .trace-center-text {
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 1.2px;
                color: rgba(255,255,255,0.5);
                text-transform: uppercase;
            }

            .trace-step {
                position: absolute;
                width: 52px;
                height: 52px;
                border-radius: 50%;
                background: rgba(255,255,255,0.1);
                border: 1.5px solid rgba(255,255,255,0.2);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 2px;
                cursor: default;
                transition: background 0.25s, border-color 0.25s, transform 0.25s;
                transform: translate(-50%, -50%);
            }

            .trace-step:hover {
                background: rgba(255,255,255,0.18);
                border-color: rgba(255,255,255,0.5);
                transform: translate(-50%, -50%) scale(1.12);
            }

            .trace-step-icon {
                font-size: 16px;
                color: rgba(255,255,255,0.9);
                line-height: 1;
            }

            .trace-step-label {
                font-size: 7.5px;
                font-weight: 600;
                letter-spacing: 0.4px;
                color: rgba(255,255,255,0.65);
                text-align: center;
                text-transform: uppercase;
                line-height: 1.2;
                max-width: 44px;
            }

            .trace-arrow {
                position: absolute;
                width: 28px;
                height: 2px;
                background: rgba(255,255,255,0.15);
                transform-origin: center center;
                transform: translate(-50%, -50%);
                border-radius: 1px;
            }

            .trace-arrow::after {
                content: '';
                position: absolute;
                right: -1px;
                top: -3px;
                width: 0;
                height: 0;
                border-left: 5px solid rgba(255,255,255,0.2);
                border-top: 4px solid transparent;
                border-bottom: 4px solid transparent;
            }

            @keyframes trace-spin {
                from { transform: rotate(0deg); }
                to   { transform: rotate(360deg); }
            }
            .trace-ring { animation: trace-spin 40s linear infinite; }

            @keyframes trace-pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50%       { opacity: 0.75; transform: scale(0.96); }
            }
            .trace-center { animation: trace-pulse 3s ease-in-out infinite; }

            @keyframes trace-pop {
                from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            .trace-step                { animation: trace-pop 0.4s ease both; }
            .trace-step:nth-child(3)   { animation-delay: 0.20s; }
            .trace-step:nth-child(4)   { animation-delay: 0.28s; }
            .trace-step:nth-child(5)   { animation-delay: 0.36s; }
            .trace-step:nth-child(6)   { animation-delay: 0.44s; }
            .trace-step:nth-child(7)   { animation-delay: 0.52s; }
            .trace-step:nth-child(8)   { animation-delay: 0.60s; }
            .trace-step:nth-child(9)   { animation-delay: 0.68s; }
            .trace-step:nth-child(10)  { animation-delay: 0.76s; }
            .trace-step:nth-child(11)  { animation-delay: 0.84s; }

            .trace-caption {
                margin-top: 32px;
                display: flex;
                flex-wrap: wrap;
                gap: 8px 14px;
                justify-content: center;
                max-width: 340px;
                z-index: 1;
                position: relative;
                animation: lf-fade 0.5s 0.6s ease both;
            }

            .trace-tag {
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 11px;
                color: rgba(255,255,255,0.55);
                font-weight: 500;
            }

            .trace-tag::before {
                content: '';
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: rgba(255,255,255,0.3);
                flex-shrink: 0;
            }

            /* ════════════════════════════════════════
               RIGHT PANEL — Login Form
            ════════════════════════════════════════ */
            .login-right {
                flex: 0 0 420px;
                background: #fff;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 56px 48px;
                box-shadow: -4px 0 32px rgba(0,0,0,0.06);
                position: relative;
                z-index: 2;
            }

            .login-form-wrap {
                width: 100%;
                max-width: 320px;
            }

            .login-brand {
                margin-bottom: 36px;
                text-align: center;
            }

            .login-brand-logo {
                width: 56px;
                height: 56px;
                background: var(--color-primary);
                border-radius: 14px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 14px;
                box-shadow: 0 4px 16px rgba(27,58,92,0.25);
            }

            .login-brand-logo span {
                font-size: 20px;
                font-weight: 800;
                color: #fff;
                letter-spacing: -1px;
            }

            .login-brand h1 {
                font-size: 22px;
                font-weight: 700;
                color: var(--color-text-primary);
                letter-spacing: -0.4px;
                margin-bottom: 4px;
            }

            .login-brand p {
                font-size: 13px;
                color: var(--color-text-tertiary);
                line-height: 1.5;
            }

            .login-divider {
                height: 1px;
                background: var(--color-border-light);
                margin-bottom: 28px;
            }

            .login-field { margin-bottom: 18px; }

            .login-label {
                display: block;
                font-size: 11px;
                font-weight: 700;
                color: var(--color-text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.8px;
                margin-bottom: 7px;
            }

            .login-input-wrap { position: relative; }

            .login-input-icon {
                position: absolute;
                left: 12px;
                top: 50%;
                transform: translateY(-50%);
                color: var(--color-text-tertiary);
                display: flex;
                align-items: center;
                pointer-events: none;
            }

            .login-input {
                width: 100%;
                background: var(--color-bg-input);
                border: 1.5px solid var(--color-border-input);
                border-radius: 8px;
                color: var(--color-text-primary);
                font-family: var(--font-family);
                font-size: 14px;
                padding: 10px 12px 10px 38px;
                outline: none;
                transition: border-color 150ms ease, box-shadow 150ms ease;
            }

            .login-input:focus {
                border-color: var(--color-primary);
                box-shadow: 0 0 0 3px var(--color-primary-surface);
            }

            .login-input.login-input--error {
                border-color: var(--color-error, #dc2626);
                box-shadow: 0 0 0 3px rgba(220,38,38,0.1);
            }

            .login-input::placeholder { color: var(--color-text-tertiary); }

            .login-error {
                display: none;
                align-items: center;
                gap: 8px;
                background: var(--color-error-bg, #FEF2F2);
                border: 1px solid var(--color-error-border, #FECACA);
                border-radius: 8px;
                color: var(--color-error, #DC2626);
                font-size: 13px;
                font-weight: 500;
                padding: 10px 12px;
                margin-bottom: 16px;
                line-height: 1.4;
            }

            .login-error.visible { display: flex; }

            .login-btn {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 11px 16px;
                background: var(--color-primary);
                color: #fff;
                border: none;
                border-radius: 8px;
                font-family: var(--font-family);
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                outline: none;
                transition: background 150ms ease, box-shadow 150ms ease;
                margin-top: 4px;
                box-shadow: 0 2px 8px rgba(27,58,92,0.2);
            }

            .login-btn:hover:not(:disabled) {
                background: var(--color-primary-light);
                box-shadow: 0 4px 16px rgba(27,58,92,0.3);
            }

            .login-btn:disabled { opacity: 0.65; cursor: not-allowed; box-shadow: none; }

            @keyframes login-spin { to { transform: rotate(360deg); } }

            .login-spinner {
                width: 15px;
                height: 15px;
                border: 2px solid rgba(255,255,255,0.3);
                border-top-color: #fff;
                border-radius: 50%;
                animation: login-spin 0.7s linear infinite;
                flex-shrink: 0;
            }

            .login-note {
                text-align: center;
                margin-top: 28px;
                padding-top: 20px;
                border-top: 1px solid var(--color-border-light);
                font-size: 11.5px;
                color: var(--color-text-tertiary);
                line-height: 1.6;
            }

            @keyframes lf-fade {
                from { opacity: 0; transform: translateY(10px); }
                to   { opacity: 1; transform: translateY(0); }
            }

            .login-form-wrap { animation: lf-fade 0.4s 0.1s ease both; }

            @media (max-width: 800px) {
                .login-page { flex-direction: column; }
                .login-left { flex: none; min-height: 300px; padding: 40px 24px 32px; }
                .login-right { flex: none; padding: 40px 28px; box-shadow: none; }
                .trace-cycle { width: 240px; height: 240px; }
                .login-logo-wrap { top: 20px; left: 20px; }
            }
        </style>

        <div class="login-page">

            <!-- ── LEFT: Traceability visual ── -->
            <div class="login-left">

                <div class="login-logo-wrap">
                    <img
                        src="Assets/maxvolt-logo.png.png"
                        alt="MaxVolt Energy"
                        onerror="this.classList.add('errored')"
                    />
                    <span class="login-logo-fallback">MAXVOLT</span>
                </div>

                <div class="login-left-headline">
                    <h2>Battery Traceability Platform</h2>
                    <p>End-to-end manufacturing visibility<br/>from cell to dispatch</p>
                </div>

                <div class="trace-cycle" id="trace-cycle">
                    <div class="trace-ring"></div>
                    <div class="trace-ring-inner"></div>
                    <div class="trace-center">
                        <span class="trace-center-icon">⚡</span>
                        <span class="trace-center-text">MaxTrace</span>
                    </div>
                </div>

                <div class="trace-caption">
                    <span class="trace-tag">Full Traceability</span>
                    <span class="trace-tag">Real-time Monitoring</span>
                    <span class="trace-tag">Quality Control</span>
                    <span class="trace-tag">Dispatch Tracking</span>
                </div>

            </div>

            <!-- ── RIGHT: Login form ── -->
            <div class="login-right">
                <div class="login-form-wrap">

                    <div class="login-brand">
                        <img
                            src="Assets/maxvolt-logo.png.png"
                            alt="MaxVolt Energy"
                            id="login-brand-img"
                            style="height:64px;width:auto;object-fit:contain;margin-bottom:14px;display:block;margin-left:auto;margin-right:auto;"
                            onerror="this.style.display='none';document.getElementById('login-brand-fallback').style.display='inline-flex';"
                        />
                        <div id="login-brand-fallback"
                             style="display:none;width:56px;height:56px;background:var(--color-primary);border-radius:14px;align-items:center;justify-content:center;margin:0 auto 14px;box-shadow:0 4px 16px rgba(27,58,92,0.25);">
                            <span style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-1px;">MT</span>
                        </div>
                        <h1>MaxTrace</h1>
                        <p>Sign in to access the manufacturing portal</p>
                    </div>

                    <div class="login-divider"></div>

                    <form id="login-form" autocomplete="off" novalidate>

                        <div class="login-field">
                            <label class="login-label" for="login-username">Username</label>
                            <div class="login-input-wrap">
                                <span class="login-input-icon">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    id="login-username"
                                    class="login-input"
                                    placeholder="Enter your username"
                                    required
                                    autofocus
                                    autocomplete="username"
                                />
                            </div>
                        </div>

                        <div class="login-field">
                            <label class="login-label" for="login-password">Password</label>
                            <div class="login-input-wrap">
                                <span class="login-input-icon">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                </span>
                                <input
                                    type="password"
                                    id="login-password"
                                    class="login-input"
                                    placeholder="Enter your password"
                                    required
                                    autocomplete="current-password"
                                />
                            </div>
                        </div>

                        <div id="login-error" class="login-error" role="alert">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            <span id="login-error-msg"></span>
                        </div>

                        <button type="submit" id="btn-login" class="login-btn">
                            Sign In
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                        </button>

                    </form>

                    <div class="login-note">
                        Factory Manufacturing Execution System<br/>
                        For authorized personnel only<br/>
                        <span style="margin-top:6px;display:inline-block;color:var(--color-text-tertiary);">
                            &copy; 2026 MaxVolt Energy Industries Ltd. All rights reserved.
                        </span>
                    </div>

                </div>
            </div>

        </div>`;
    },

    init() {
        // ── Build cycle diagram ───────────────────────────────────────────────
        const STEPS = [
            { icon: '🔋', label: 'Cell\nReg.' },
            { icon: '⚖️',  label: 'Grading' },
            { icon: '🔀',  label: 'Sorting' },
            { icon: '🔧',  label: 'Assembly' },
            { icon: '⚡',  label: 'Welding' },
            { icon: '💾',  label: 'BMS\nMount' },
            { icon: '🧪',  label: 'Pack\nTest' },
            { icon: '✅',  label: 'PDI' },
            { icon: '🚚',  label: 'Dispatch' },
        ];

        const cycleEl = document.getElementById('trace-cycle');
        if (cycleEl) {
            const count  = STEPS.length;
            const radius = 120;
            const cx     = 160;
            const cy     = 160;

            STEPS.forEach((step, i) => {
                const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
                const x = cx + radius * Math.cos(angle);
                const y = cy + radius * Math.sin(angle);

                const node = document.createElement('div');
                node.className = 'trace-step';
                node.style.left = `${x}px`;
                node.style.top  = `${y}px`;
                node.innerHTML  = `
                    <span class="trace-step-icon">${step.icon}</span>
                    <span class="trace-step-label">${step.label.replace('\n', '<br>')}</span>`;
                cycleEl.appendChild(node);
            });
        }

        // ── Auth redirect ─────────────────────────────────────────────────────
        if (Auth.isAuthenticated()) {
            window.location.hash = Router.getDefaultRoute();
            return;
        }

        const shell = document.querySelector('.app-shell');
        if (shell) shell.classList.add('app-shell--auth');

        // ── Form elements ─────────────────────────────────────────────────────
        const form      = document.getElementById('login-form');
        const userInput = document.getElementById('login-username');
        const passInput = document.getElementById('login-password');
        const btn       = document.getElementById('btn-login');
        const errorEl   = document.getElementById('login-error');
        const errorMsg  = document.getElementById('login-error-msg');

        let submitting = false;

        const showError = (msg) => {
            errorMsg.textContent = msg;
            errorEl.classList.add('visible');
            // Highlight both fields on credential error
            userInput.classList.add('login-input--error');
            passInput.classList.add('login-input--error');
        };

        const hideError = () => {
            errorEl.classList.remove('visible');
            userInput.classList.remove('login-input--error');
            passInput.classList.remove('login-input--error');
        };

        // Clear field-level errors as the user starts typing again
        [userInput, passInput].forEach(el =>
            el.addEventListener('input', hideError)
        );

        // ── Submit ────────────────────────────────────────────────────────────
        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (submitting) return;

            const username = userInput.value.trim();
            const password = passInput.value;

            if (!username || !password) {
                showError('Please enter both username and password.');
                return;
            }

            submitting   = true;
            btn.disabled = true;
            btn.innerHTML = `<span class="login-spinner"></span> Signing In…`;
            hideError();

            try {
                // ── Raw fetch — intentionally bypasses api.js ─────────────
                // api.js converts every 401 into a "Session expired" toast,
                // which is correct everywhere EXCEPT the login page where
                // 401 means "wrong credentials". Using raw fetch here lets
                // us handle the response ourselves and show the right message.
                const response = await fetch(`${_API_BASE}/users/login`, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ username, password }),
                });

                let data;
                try {
                    data = await response.json();
                } catch {
                    throw new Error('Unexpected server response. Please try again.');
                }

                // ── 401 / 403 → wrong credentials ─────────────────────────
                if (response.status === 401 || response.status === 403) {
                    const msg = typeof data?.detail === 'string'
                        ? data.detail
                        : 'Invalid username or password.';
                    throw new Error(msg);
                }

                // ── 422 → validation error (empty fields reaching backend) ─
                if (response.status === 422) {
                    const msg = Array.isArray(data?.detail)
                        ? data.detail.map(d => d.msg).join('; ')
                        : 'Please check your username and password.';
                    throw new Error(msg);
                }

                // ── Any other non-2xx ──────────────────────────────────────
                if (!response.ok) {
                    const msg = typeof data?.detail === 'string'
                        ? data.detail
                        : `Server error (${response.status}). Please try again.`;
                    throw new Error(msg);
                }

                // ── Success ────────────────────────────────────────────────
                // Support both envelope { success, data: {...} } and flat { username, ... }
                const payload = data?.data ?? data;

                if (!payload?.assigned_roles || !Array.isArray(payload.assigned_roles)) {
                    throw new Error('Invalid server response. Contact your administrator.');
                }

                Auth.login({
                    username:       payload.username,
                    full_name:      payload.full_name,
                    assigned_roles: payload.assigned_roles,
                    token:          payload.access_token ?? payload.token ?? null,
                });

                if (shell) shell.classList.remove('app-shell--auth');
                window.location.hash = Router.getDefaultRoute();

            } catch (err) {
                showError(err.message || 'Login failed. Please try again.');
                passInput.value = '';
                passInput.focus();
            } finally {
                submitting   = false;
                btn.disabled = false;
                btn.innerHTML = `Sign In <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
            }
        });

        return () => {
            const s = document.querySelector('.app-shell');
            if (s) s.classList.remove('app-shell--auth');
        };
    }
};

export default Login;