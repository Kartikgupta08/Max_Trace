/**
 * cellInventory.js — Cell Inventory Status (Admin)
 * 
 * View all registered cells with their current status,
 * grading results, and assignment to battery packs.
 * Filterable, paginated table.
 * 
 * API: GET /api/v1/admin/cells/inventory
 */

import API from '../../core/api.js';
import Table from '../../components/table.js';
import StatusBadge from '../../components/statusBadge.js';
import Pagination from '../../components/pagination.js';

const CellInventory = {
    render() {
        return `
            <div class="content__inner">
                <div class="page-header">
                    <h1 class="page-header__title">Cell Inventory Status</h1>
                    <p class="page-header__subtitle">View all registered cells, their grading status and assignment</p>
                </div>

                <!-- Filters -->
                <div class="filter-bar">
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">Model</label>
                        <select id="inv-model" class="filter-bar__select">
                            <option value="">All Models</option>
                            <option value="INR18650-25R">INR18650-25R</option>
                            <option value="INR18650-30Q">INR18650-30Q</option>
                            <option value="INR21700-40T">INR21700-40T</option>
                            <option value="INR21700-50E">INR21700-50E</option>
                        </select>
                    </div>
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">Status</label>
                        <select id="inv-status" class="filter-bar__select">
                            <option value="">All</option>
                            <option value="REGISTERED">Registered</option>
                            <option value="GRADED">Graded</option>
                            <option value="ASSIGNED">Assigned to Pack</option>
                            <option value="FAILED">Failed</option>
                        </select>
                    </div>
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">Supplier</label>
                        <select id="inv-supplier" class="filter-bar__select">
                            <option value="">All</option>
                            <option value="Samsung SDI">Samsung SDI</option>
                            <option value="LG Energy">LG Energy</option>
                            <option value="CATL">CATL</option>
                            <option value="Panasonic">Panasonic</option>
                        </select>
                    </div>
                    <button id="btn-inv-search" class="btn btn--primary">Apply Filters</button>
                </div>

                <!-- Table -->
                <div id="inv-table">
                    <div class="page-loader"><div class="spinner"></div></div>
                </div>

                <div id="inv-pagination"></div>
            </div>
        `;
    },

    async init() {
        let currentPage = 1;

        document.getElementById('btn-inv-search').addEventListener('click', () => {
            currentPage = 1;
            _fetchInventory(currentPage);
        });

        // Load initial data
        await _fetchInventory(currentPage);

        async function _fetchInventory(page) {
            const params = { page, page_size: 20 };
            const model = document.getElementById('inv-model').value;
            const status = document.getElementById('inv-status').value;
            const supplier = document.getElementById('inv-supplier').value;
            if (model) params.model = model;
            if (status) params.status = status;
            if (supplier) params.supplier = supplier;

            const result = await API.get('/admin/cells/inventory', params);

            const tableEl = document.getElementById('inv-table');
            if (result.success && result.data) {
                tableEl.innerHTML = Table.render({
                    columns: [
                        { key: 'cell_id', label: 'Cell ID', render: (v) => `<span class="text-mono fw-semibold">${v}</span>` },
                        { key: 'model', label: 'Model' },
                        { key: 'supplier', label: 'Supplier' },
                        { key: 'grade', label: 'Grade', render: (v) => v || '—' },
                        { key: 'grading_status', label: 'Grading', render: (v) => StatusBadge.render(v) },
                        { key: 'battery_id', label: 'Assigned to Pack', render: (v) => v ? `<span class="text-mono">${v}</span>` : '<span class="text-muted">Unassigned</span>' },
                        { key: 'status', label: 'Status', render: (v) => StatusBadge.render(v) },
                        { key: 'registered_at', label: 'Registered' }
                    ],
                    rows: result.data.items || [],
                    emptyText: 'No cells match the selected filters.'
                });

                // Pagination
                const pagEl = document.getElementById('inv-pagination');
                const totalPages = result.data.total_pages || 1;
                const totalItems = result.data.total_items || 0;
                pagEl.innerHTML = Pagination.render({
                    currentPage: page,
                    totalPages,
                    totalItems,
                    pageSize: 20,
                    containerId: 'inv-pag-controls'
                });
                Pagination.init('inv-pag-controls', (p) => {
                    currentPage = p;
                    _fetchInventory(p);
                });
            } else {
                tableEl.innerHTML = Table.render({
                    columns: [
                        { key: 'cell_id', label: 'Cell ID' },
                        { key: 'model', label: 'Model' },
                        { key: 'status', label: 'Status' }
                    ],
                    rows: [],
                    emptyText: 'Unable to load cell inventory data.'
                });
            }
        }

        return null;
    }
};

export default CellInventory;
