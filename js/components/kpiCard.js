/**
 * kpiCard.js — KPI Summary Card Component
 */

const KpiCard = {
    /**
     * Render a KPI card.
     * @param {Object} config
     * @param {string} config.label - e.g. "Total Cells Registered"
     * @param {string|number} config.value
     * @param {string} config.icon - Material icon name
     * @param {string} [config.variant='primary'] - primary | success | warning | error | info
     * @param {string} [config.change] - e.g. "+12%" or "-3%"
     * @returns {string}
     */
    render({ label, value, icon, variant = 'primary', change = '' }) {
        const changeClass = change.startsWith('+') ? 'kpi-card__change--up'
            : change.startsWith('-') ? 'kpi-card__change--down' : '';

        return `
            <div class="kpi-card">
                <div class="kpi-card__icon kpi-card__icon--${variant}">
                    <span class="material-symbols-outlined">${icon}</span>
                </div>
                <div class="kpi-card__content">
                    <div class="kpi-card__label">${label}</div>
                    <div class="kpi-card__value">${value}</div>
                    ${change ? `<div class="kpi-card__change ${changeClass}">${change}</div>` : ''}
                </div>
            </div>
        `;
    }
};

export default KpiCard;
