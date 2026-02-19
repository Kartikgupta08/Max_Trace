/**
 * pagination.js — Reusable Pagination Component
 * 
 * Renders pagination controls. Stateless — just renders based on params.
 */

const Pagination = {
    /**
     * Render pagination controls.
     * @param {Object} config
     * @param {number} config.currentPage - 1-based
     * @param {number} config.totalPages
     * @param {number} config.totalItems
     * @param {number} config.pageSize
     * @param {string} [config.containerId='pagination']
     * @returns {string}
     */
    render({ currentPage, totalPages, totalItems, pageSize, containerId = 'pagination' }) {
        if (totalPages <= 1) {
            return `<div class="pagination" id="${containerId}">
                <div class="pagination__info">Showing ${totalItems} item${totalItems !== 1 ? 's' : ''}</div>
            </div>`;
        }

        const start = (currentPage - 1) * pageSize + 1;
        const end = Math.min(currentPage * pageSize, totalItems);

        // Generate page buttons (show max 5 with ellipsis)
        const pages = _getVisiblePages(currentPage, totalPages);

        return `
            <div class="pagination" id="${containerId}">
                <div class="pagination__info">
                    Showing ${start}–${end} of ${totalItems} items
                </div>
                <div class="pagination__controls">
                    <button class="pagination__btn" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''}>
                        ‹
                    </button>
                    ${pages.map(p => {
                        if (p === '...') {
                            return '<span class="pagination__btn" style="border:none;cursor:default;color:var(--color-text-tertiary)">…</span>';
                        }
                        return `<button class="pagination__btn ${p === currentPage ? 'pagination__btn--active' : ''}" data-page="${p}">${p}</button>`;
                    }).join('')}
                    <button class="pagination__btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''}>
                        ›
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Attach click handlers to pagination buttons.
     * @param {string} containerId
     * @param {Function} onPageChange - (page: number) => void
     */
    init(containerId, onPageChange) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.querySelectorAll('.pagination__btn[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.getAttribute('data-page'), 10);
                if (!isNaN(page) && !btn.disabled) {
                    onPageChange(page);
                }
            });
        });
    }
};

/**
 * Calculate which page numbers to display.
 * Shows first, last, and neighbors of current page.
 */
function _getVisiblePages(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = [1];

    if (current > 3) pages.push('...');

    const rangeStart = Math.max(2, current - 1);
    const rangeEnd = Math.min(total - 1, current + 1);

    for (let i = rangeStart; i <= rangeEnd; i++) {
        pages.push(i);
    }

    if (current < total - 2) pages.push('...');

    pages.push(total);
    return pages;
}

export default Pagination;
