/**
 * table.js — Reusable Data Table Component
 * 
 * Renders structured data tables with optional expandable rows.
 * Supports sorting indicators and empty states.
 */

const Table = {
    /**
     * Render a data table.
     * @param {Object} config
     * @param {Array<{key: string, label: string, width?: string, render?: Function}>} config.columns
     * @param {Array<Object>} config.rows
     * @param {string} [config.emptyText='No records found.']
     * @param {boolean} [config.expandable=false]
     * @param {Function} [config.expandRender] - Render expansion content for a row
     * @param {string} [config.className='']
     * @returns {string} HTML string
     */
    render({ columns, rows, emptyText = 'No records found.', expandable = false, expandRender = null, className = '' }) {
        if (!rows || rows.length === 0) {
            return `
                <div class="data-table-wrapper ${className}">
                    <table class="data-table">
                        <thead>
                            <tr>
                                ${expandable ? '<th style="width:40px"></th>' : ''}
                                ${columns.map(col => `
                                    <th ${col.width ? `style="width:${col.width}"` : ''}>${col.label}</th>
                                `).join('')}
                            </tr>
                        </thead>
                    </table>
                    <div class="data-table__empty">
                        <div class="data-table__empty-icon">📋</div>
                        <p>${emptyText}</p>
                    </div>
                </div>
            `;
        }

        const tbody = rows.map((row, idx) => {
            const mainRow = `
                <tr data-row-idx="${idx}">
                    ${expandable ? `
                        <td>
                            <button class="data-table__expand-btn" data-expand-idx="${idx}" title="Expand details">
                                <span class="material-symbols-outlined" style="font-size:18px">chevron_right</span>
                            </button>
                        </td>
                    ` : ''}
                    ${columns.map(col => {
                        const value = col.render ? col.render(row[col.key], row) : _escapeHtml(row[col.key] ?? '—');
                        return `<td>${value}</td>`;
                    }).join('')}
                </tr>
            `;

            const detailRow = expandable && expandRender ? `
                <tr class="data-table__detail-row" data-detail-idx="${idx}">
                    <td colspan="${columns.length + 1}">${expandRender(row)}</td>
                </tr>
            ` : '';

            return mainRow + detailRow;
        }).join('');

        return `
            <div class="data-table-wrapper ${className}">
                <table class="data-table">
                    <thead>
                        <tr>
                            ${expandable ? '<th style="width:40px"></th>' : ''}
                            ${columns.map(col => `
                                <th ${col.width ? `style="width:${col.width}"` : ''}>${col.label}</th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${tbody}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Initialize expandable row toggle listeners within a container.
     * @param {HTMLElement} container
     */
    initExpandable(container) {
        container.querySelectorAll('.data-table__expand-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = btn.getAttribute('data-expand-idx');
                const detailRow = container.querySelector(`[data-detail-idx="${idx}"]`);
                if (detailRow) {
                    const isOpen = detailRow.classList.contains('data-table__detail-row--open');
                    detailRow.classList.toggle('data-table__detail-row--open', !isOpen);
                    btn.classList.toggle('data-table__expand-btn--open', !isOpen);
                }
            });
        });
    }
};

function _escapeHtml(val) {
    if (val === null || val === undefined) return '—';
    const div = document.createElement('div');
    div.textContent = String(val);
    return div.innerHTML;
}

export default Table;
