/**
 * toast.js — Toast Notification System
 * 
 * Global notification system for success, error, warning, and info messages.
 * Auto-dismisses. Stacks vertically. Used by API module and page actions.
 */

const Toast = (() => {
    let _container = null;
    const ICONS = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    const TITLES = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info'
    };

    /**
     * Ensure toast container exists in DOM.
     */
    function _ensureContainer() {
        if (!_container) {
            _container = document.createElement('div');
            _container.className = 'toast-container';
            _container.setAttribute('aria-live', 'polite');
            document.body.appendChild(_container);
        }
    }

    /**
     * Show a toast notification.
     * @param {string} type - 'success' | 'error' | 'warning' | 'info'
     * @param {string} message - Toast message text
     * @param {number} [duration=4000] - Auto-dismiss in ms (0 = manual)
     */
    function show(type, message, duration = 4000) {
        _ensureContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.innerHTML = `
            <span class="toast__icon material-symbols-outlined">${ICONS[type]}</span>
            <div class="toast__content">
                <div class="toast__title">${TITLES[type]}</div>
                <div class="toast__message">${_escapeHtml(message)}</div>
            </div>
            <button class="toast__close" aria-label="Dismiss">✕</button>
        `;

        // Close button handler
        toast.querySelector('.toast__close').addEventListener('click', () => _dismiss(toast));

        _container.appendChild(toast);

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => _dismiss(toast), duration);
        }
    }

    /**
     * Dismiss a toast with animation.
     */
    function _dismiss(toast) {
        if (!toast.parentNode) return;
        toast.classList.add('toast--leaving');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 250);
    }

    /**
     * Escape HTML to prevent XSS in toast messages.
     */
    function _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    return Object.freeze({
        show,
        success: (msg, dur) => show('success', msg, dur),
        error: (msg, dur) => show('error', msg, dur || 6000),
        warning: (msg, dur) => show('warning', msg, dur),
        info: (msg, dur) => show('info', msg, dur)
    });
})();

export default Toast;
