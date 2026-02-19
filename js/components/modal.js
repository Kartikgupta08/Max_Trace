/**
 * modal.js — Reusable Modal Component
 * 
 * Controlled via JS. Supports custom content, sizes, and close on overlay click.
 */

const Modal = {
    /**
     * Open a modal.
     * @param {Object} config
     * @param {string} config.title
     * @param {string} config.body - HTML content
     * @param {string} [config.size=''] - '' | 'lg' | 'sm'
     * @param {Array<{label, className, onClick}>} [config.actions=[]]
     * @param {boolean} [config.closeOnOverlay=true]
     * @returns {HTMLElement} The modal overlay element
     */
    open({ title, body, size = '', actions = [], closeOnOverlay = true }) {
        // Remove any existing modal
        Modal.close();

        const sizeClass = size ? `modal--${size}` : '';

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'active-modal-overlay';
        overlay.innerHTML = `
            <div class="modal ${sizeClass}">
                <div class="modal__header">
                    <h3 class="modal__title">${title}</h3>
                    <button class="modal__close" data-modal-close>
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="modal__body">
                    ${body}
                </div>
                ${actions.length > 0 ? `
                    <div class="modal__footer">
                        ${actions.map((a, i) => `
                            <button class="btn ${a.className || 'btn--secondary'}" data-modal-action="${i}">
                                ${a.label}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;

        // Close button
        overlay.querySelector('[data-modal-close]').addEventListener('click', Modal.close);

        // Overlay click
        if (closeOnOverlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) Modal.close();
            });
        }

        // Action buttons
        actions.forEach((action, idx) => {
            const btn = overlay.querySelector(`[data-modal-action="${idx}"]`);
            if (btn && action.onClick) {
                btn.addEventListener('click', action.onClick);
            }
        });

        // Escape key
        overlay._escHandler = (e) => {
            if (e.key === 'Escape') Modal.close();
        };
        document.addEventListener('keydown', overlay._escHandler);

        document.body.appendChild(overlay);
        return overlay;
    },

    /**
     * Close the active modal.
     */
    close() {
        const overlay = document.getElementById('active-modal-overlay');
        if (overlay) {
            if (overlay._escHandler) {
                document.removeEventListener('keydown', overlay._escHandler);
            }
            overlay.remove();
        }
    }
};

export default Modal;
