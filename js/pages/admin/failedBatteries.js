/**
 * failedBatteries.js — Failed / Rejected Batteries (Admin)
 * 
 * View all batteries that failed grading, PDI, or were rejected.
 * Filterable by failure stage, date, and model.
 * 
 * API: GET /api/v1/admin/batteries/failed
 */

import API from '../../core/api.js';
import Table from '../../components/table.js';
import StatusBadge from '../../components/statusBadge.js';
import Pagination from '../../components/pagination.js';

const FailedBatteries = {
    render() {
        return `
            <div class="content__inner">
                <div class="page-header">
                    <h1 class="page-header__title">Failed / Rejected Batteries</h1>
                    <p class="page-header__subtitle">All batteries that failed at any stage of the manufacturing process</p>
                </div>

                <!-- KPI Summary -->
                <div class="kpi-grid" id="failed-kpis">
                    <!-- Loaded dynamically -->
                </div>

                <!-- Filters -->
                <div class="filter-bar">
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">Failure Stage</label>
                        <select id="failed-stage" class="filter-bar__select">
                            <option value="">All Stages</option>
                            <option value="CELL_GRADING">Cell Grading</option>
                            <option value="PACK_GRADING">Pack Testing</option>
                            <option value="PDI">PDI Inspection</option>
                        </select>
                    </div>
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">Model</label>
                        <select id="failed-model" class="filter-bar__select">
                            <option value="">All Models</option>
                            <option value="MAXPACK-48V-100AH">MAXPACK-48V-100AH</option>
                            <option value="MAXPACK-48V-150AH">MAXPACK-48V-150AH</option>
                            <option value="MAXPACK-51V-100AH">MAXPACK-51V-100AH</option>
                        </select>
                    </div>
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">Date From</label>
                        <input type="date" id="failed-from" class="filter-bar__input">
                    </div>
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">Date To</label>
                        <input type="date" id="failed-to" class="filter-bar__input">
                    </div>
                    <button id="btn-failed-search" class="btn btn--primary">Apply</button>
                </div>

                <!-- Table -->
                <div id="failed-table">
                    <div class="page-loader"><div class="spinner"></div></div>
                </div>

                <div id="failed-pagination"></div>
            </div>
        `;
    },

    async init() {
        let currentPage = 1;

        document.getElementById('btn-failed-search').addEventListener('click', () => {
            currentPage = 1;
            _fetchFailed(currentPage);
        });

        await _fetchFailed(currentPage);

        async function _fetchFailed(page) {
            const params = { page, page_size: 15 };
            const stage = document.getElementById('failed-stage').value;
            const model = document.getElementById('failed-model').value;
            const from = document.getElementById('failed-from').value;
            const to = document.getElementById('failed-to').value;
            if (stage) params.failure_stage = stage;
            if (model) params.model = model;
            if (from) params.date_from = from;
            if (to) params.date_to = to;

            const result = await API.get('/admin/batteries/failed', params);

            if (result.success && result.data) {
                _renderKPIs(result.data.summary);
                _renderTable(result.data.items || [], page, result.data);
            } else {
                _renderKPIs(null);
                _renderTable([], page, {});
            }
        }

        function _renderKPIs(summary) {
            const el = document.getElementById('failed-kpis');
            const d = summary || {};
            el.innerHTML = `
                <div class="kpi-card">
                    <div class="kpi-card__icon kpi-card__icon--error">
                        <span class="material-symbols-outlined">error_outline</span>
                    </div>
                    <div class="kpi-card__content">
                        <div class="kpi-card__label">Total Failed</div>
                        <div class="kpi-card__value">${d.total_failed ?? '—'}</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-card__icon kpi-card__icon--warning">
                        <span class="material-symbols-outlined">speed</span>
                    </div>
                    <div class="kpi-card__content">
                        <div class="kpi-card__label">Failed at Grading</div>
                        <div class="kpi-card__value">${d.grading_failures ?? '—'}</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-card__icon kpi-card__icon--error">
                        <span class="material-symbols-outlined">fact_check</span>
                    </div>
                    <div class="kpi-card__content">
                        <div class="kpi-card__label">Failed at PDI</div>
                        <div class="kpi-card__value">${d.pdi_failures ?? '—'}</div>
                    </div>
                </div>
            `;
        }

        function _renderTable(items, page, data) {
            const tableEl = document.getElementById('failed-table');
            tableEl.innerHTML = Table.render({
                columns: [
                    { key: 'battery_id', label: 'Battery ID', render: (v) => `<span class="text-mono fw-semibold">${v}</span>` },
                    { key: 'model', label: 'Model' },
                    { key: 'failure_stage', label: 'Failed At' },
                    { key: 'failure_reason', label: 'Reason' },
                    { key: 'status', label: 'Status', render: (v) => StatusBadge.render(v) },
                    { key: 'failed_at', label: 'Date' }
                ],
                rows: items,
                expandable: true,
                expandRender: (row) => `
                    <div class="detail-panel">
                        <div class="detail-panel__item">
                            <div class="detail-panel__label">Battery ID</div>
                            <div class="detail-panel__value">${row.battery_id || '—'}</div>
                        </div>
                        <div class="detail-panel__item">
                            <div class="detail-panel__label">Failure Stage</div>
                            <div class="detail-panel__value">${row.failure_stage || '—'}</div>
                        </div>
                        <div class="detail-panel__item">
                            <div class="detail-panel__label">Failure Reason</div>
                            <div class="detail-panel__value">${row.failure_reason || '—'}</div>
                        </div>
                        <div class="detail-panel__item">
                            <div class="detail-panel__label">Operator</div>
                            <div class="detail-panel__value">${row.operator || '—'}</div>
                        </div>
                        <div class="detail-panel__item">
                            <div class="detail-panel__label">Notes</div>
                            <div class="detail-panel__value" style="font-family:var(--font-family)">${row.notes || 'No notes'}</div>
                        </div>
                    </div>
                `,
                emptyText: 'No failed or rejected batteries found.'
            });

            Table.initExpandable(tableEl);

            // Pagination
            const pagEl = document.getElementById('failed-pagination');
            pagEl.innerHTML = Pagination.render({
                currentPage: page,
                totalPages: data.total_pages || 1,
                totalItems: data.total_items || 0,
                pageSize: 15,
                containerId: 'failed-pag-controls'
            });
            Pagination.init('failed-pag-controls', (p) => {
                currentPage = p;
                _fetchFailed(p);
            });
        }

        return null;
    }
};

export default FailedBatteries;
