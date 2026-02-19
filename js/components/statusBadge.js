/**
 * statusBadge.js — Status Badge Component
 * 
 * Returns badge HTML for standard manufacturing statuses.
 */

const StatusBadge = {
    /**
     * Render a status badge.
     * @param {string} status - PASS, FAIL, BLOCKED, PENDING, COMPLETED, REJECTED, etc.
     * @returns {string} HTML string
     */
    render(status) {
        if (!status) return '<span class="badge badge--inactive">—</span>';

        const normalized = status.toUpperCase().trim();
        const classMap = {
            'PASS': 'badge--pass',
            'PASSED': 'badge--pass',
            'COMPLETED': 'badge--completed',
            'SUCCESS': 'badge--success',
            'DISPATCHED': 'badge--success',
            'MOUNTED': 'badge--success',
            'REGISTERED': 'badge--success',
            'ASSEMBLED': 'badge--success',
            'APPROVED': 'badge--success',
            'FAIL': 'badge--fail',
            'FAILED': 'badge--fail',
            'REJECTED': 'badge--rejected',
            'ERROR': 'badge--error',
            'PENDING': 'badge--pending',
            'IN PROGRESS': 'badge--pending',
            'IN_PROGRESS': 'badge--pending',
            'GRADING': 'badge--pending',
            'BLOCKED': 'badge--blocked',
            'HOLD': 'badge--blocked',
            'INACTIVE': 'badge--inactive',
            'UNKNOWN': 'badge--inactive'
        };

        const cls = classMap[normalized] || 'badge--inactive';
        return `<span class="badge ${cls}"><span class="badge__dot"></span>${_escapeHtml(status)}</span>`;
    }
};

function _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export default StatusBadge;
