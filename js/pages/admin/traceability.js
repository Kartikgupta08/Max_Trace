/**
 * traceability.js — Battery Traceability Viewer
 * 
 * Search by Battery ID and view the full manufacturing trace:
 * cells used, grading results, BMS mapping, PDI, and dispatch info.
 * Expandable rows with detailed traceability trees.
 * 
 * API: GET /api/v1/admin/traceability?battery_id=...
 */

import API from '../../core/api.js';
import Table from '../../components/table.js';
import StatusBadge from '../../components/statusBadge.js';
import Pagination from '../../components/pagination.js';

const Traceability = {
    render() {
        return `
            <div class="content__inner">
                <div class="page-header">
                    <h1 class="page-header__title">Battery Traceability</h1>
                    <p class="page-header__subtitle">Full manufacturing history and component trace for every battery pack</p>
                </div>

                <!-- Search / Filter -->
                <div class="filter-bar">
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">Battery ID</label>
                        <input type="text" id="trace-search" class="filter-bar__input" placeholder="Enter Battery ID..." style="width:240px;" autofocus>
                    </div>
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">Status</label>
                        <select id="trace-status-filter" class="filter-bar__select">
                            <option value="">All</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="FAILED">Failed</option>
                            <option value="DISPATCHED">Dispatched</option>
                        </select>
                    </div>
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">Date</label>
                        <input type="date" id="trace-date-filter" class="filter-bar__input">
                    </div>
                    <button id="btn-trace-search" class="btn btn--primary">Search</button>
                </div>

                <!-- Results Table -->
                <div id="trace-results">
                    <div class="data-table-wrapper">
                        <div class="data-table__empty">
                            <div class="data-table__empty-icon">🔍</div>
                            <p>Enter a Battery ID or apply filters to view traceability data</p>
                        </div>
                    </div>
                </div>

                <!-- Pagination -->
                <div id="trace-pagination"></div>
            </div>
        `;
    },

    init() {
        const searchInput = document.getElementById('trace-search');
        const searchBtn = document.getElementById('btn-trace-search');
        let currentPage = 1;

        searchBtn.addEventListener('click', () => {
            currentPage = 1;
            _fetchTraceData(currentPage);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                currentPage = 1;
                _fetchTraceData(currentPage);
            }
        });

        async function _fetchTraceData(page) {
            const batteryId = document.getElementById('trace-search').value.trim();
            const status = document.getElementById('trace-status-filter').value;
            const date = document.getElementById('trace-date-filter').value;

            const params = { page, page_size: 15 };
            if (batteryId) params.battery_id = batteryId;
            if (status) params.status = status;
            if (date) params.date = date;

            const result = await API.get('/admin/traceability', params);

            if (result.success && result.data) {
                _renderResults(result.data.items || []);
                _renderPagination(result.data, page);
            } else {
                _renderResults([]);
            }
        }

        function _renderResults(items) {
            const container = document.getElementById('trace-results');
            container.innerHTML = Table.render({
                columns: [
                    { key: 'battery_id', label: 'Battery ID', render: (v) => `<span class="text-mono fw-semibold">${v}</span>` },
                    { key: 'model', label: 'Model' },
                    { key: 'cell_count', label: 'Cells' },
                    { key: 'bms_id', label: 'BMS ID', render: (v) => v ? `<span class="text-mono">${v}</span>` : '—' },
                    { key: 'grading_result', label: 'Grading', render: (v) => StatusBadge.render(v) },
                    { key: 'pdi_result', label: 'PDI', render: (v) => StatusBadge.render(v) },
                    { key: 'status', label: 'Status', render: (v) => StatusBadge.render(v) },
                    { key: 'created_at', label: 'Date' }
                ],
                rows: items,
                expandable: true,
                expandRender: (row) => _renderTraceDetail(row),
                emptyText: 'No traceability records found for the given criteria.'
            });

            Table.initExpandable(container);
        }

        function _renderTraceDetail(row) {
            const cells = row.cells || [];
            return `
                <div class="detail-panel">
                    <div class="detail-panel__item">
                        <div class="detail-panel__label">Battery ID</div>
                        <div class="detail-panel__value">${row.battery_id || '—'}</div>
                    </div>
                    <div class="detail-panel__item">
                        <div class="detail-panel__label">Model</div>
                        <div class="detail-panel__value">${row.model || '—'}</div>
                    </div>
                    <div class="detail-panel__item">
                        <div class="detail-panel__label">BMS ID</div>
                        <div class="detail-panel__value">${row.bms_id || '—'}</div>
                    </div>
                    <div class="detail-panel__item">
                        <div class="detail-panel__label">Assembled On</div>
                        <div class="detail-panel__value">${row.assembled_at || '—'}</div>
                    </div>
                    <div class="detail-panel__item">
                        <div class="detail-panel__label">Grading Result</div>
                        <div class="detail-panel__value">${StatusBadge.render(row.grading_result)}</div>
                    </div>
                    <div class="detail-panel__item">
                        <div class="detail-panel__label">PDI Result</div>
                        <div class="detail-panel__value">${StatusBadge.render(row.pdi_result)}</div>
                    </div>
                    <div class="detail-panel__item">
                        <div class="detail-panel__label">Dispatched To</div>
                        <div class="detail-panel__value">${row.dispatch_destination || '—'}</div>
                    </div>
                    <div class="detail-panel__item">
                        <div class="detail-panel__label">Dispatched At</div>
                        <div class="detail-panel__value">${row.dispatched_at || '—'}</div>
                    </div>
                </div>
                ${cells.length > 0 ? `
                    <div style="margin-top:16px;">
                        <div style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
                            Mapped Cells (${cells.length})
                        </div>
                        <div style="display:flex;flex-wrap:wrap;gap:8px;">
                            ${cells.map(c => `<span class="badge badge--info">${c}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
            `;
        }

        function _renderPagination(data, page) {
            const container = document.getElementById('trace-pagination');
            const totalPages = data.total_pages || 1;
            const totalItems = data.total_items || 0;

            container.innerHTML = Pagination.render({
                currentPage: page,
                totalPages,
                totalItems,
                pageSize: 15,
                containerId: 'trace-pag-controls'
            });

            Pagination.init('trace-pag-controls', (newPage) => {
                currentPage = newPage;
                _fetchTraceData(newPage);
            });
        }

        return null;
    }
};

export default Traceability;
