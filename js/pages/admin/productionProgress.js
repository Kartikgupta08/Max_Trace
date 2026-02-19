/**
 * productionProgress.js — Production Progress Monitor (Admin)
 * 
 * Real-time view of how many units are at each production stage.
 * Date and model filters. Visual stage pipeline.
 * 
 * API: GET /api/v1/admin/production/progress
 */

import API from '../../core/api.js';
import StatusBadge from '../../components/statusBadge.js';
import Table from '../../components/table.js';

const STAGES = [
    { key: 'cell_registration', label: 'Cell Registration', icon: 'battery_std' },
    { key: 'cell_grading', label: 'Cell Grading', icon: 'speed' },
    { key: 'assembly', label: 'Assembly', icon: 'build' },
    { key: 'pack_grading', label: 'Pack Testing', icon: 'assessment' },
    { key: 'bms_mounting', label: 'BMS Mounting', icon: 'memory' },
    { key: 'pdi_inspection', label: 'PDI Inspection', icon: 'fact_check' },
    { key: 'dispatch', label: 'Dispatch', icon: 'local_shipping' }
];

const ProductionProgress = {
    render() {
        return `
            <div class="content__inner">
                <div class="page-header">
                    <h1 class="page-header__title">Production Progress</h1>
                    <p class="page-header__subtitle">Real-time production pipeline status across all manufacturing stages</p>
                </div>

                <!-- Filters -->
                <div class="filter-bar">
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">Model</label>
                        <select id="prog-model" class="filter-bar__select">
                            <option value="">All Models</option>
                            <option value="MAXPACK-48V-100AH">MAXPACK-48V-100AH</option>
                            <option value="MAXPACK-48V-150AH">MAXPACK-48V-150AH</option>
                            <option value="MAXPACK-51V-100AH">MAXPACK-51V-100AH</option>
                        </select>
                    </div>
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">Date</label>
                        <input type="date" id="prog-date" class="filter-bar__input">
                    </div>
                    <button id="btn-prog-refresh" class="btn btn--primary">Refresh</button>
                </div>

                <!-- Stage Pipeline -->
                <div class="card mb-6">
                    <div class="card__header">
                        <div class="card__title">Stage Pipeline</div>
                    </div>
                    <div class="card__body" id="pipeline-view">
                        <div class="page-loader"><div class="spinner"></div></div>
                    </div>
                </div>

                <!-- Detailed Table -->
                <div class="card">
                    <div class="card__header">
                        <div class="card__title">Batteries In Progress</div>
                    </div>
                    <div class="card__body" style="padding:0;" id="progress-table">
                        <div class="page-loader"><div class="spinner"></div></div>
                    </div>
                </div>
            </div>
        `;
    },

    async init() {
        document.getElementById('btn-prog-refresh').addEventListener('click', _loadData);
        await _loadData();

        async function _loadData() {
            const model = document.getElementById('prog-model').value;
            const date = document.getElementById('prog-date').value;

            const params = {};
            if (model) params.model = model;
            if (date) params.date = date;

            const result = await API.get('/admin/production/progress', params);

            if (result.success && result.data) {
                _renderPipeline(result.data.stages);
                _renderTable(result.data.recent_batteries || []);
            } else {
                _renderPipeline(null);
                _renderTable([]);
            }
        }

        function _renderPipeline(stageData) {
            const el = document.getElementById('pipeline-view');
            const data = stageData || {};

            el.innerHTML = `
                <div style="display:flex;align-items:stretch;gap:4px;overflow-x:auto;">
                    ${STAGES.map((stage, idx) => {
                        const count = data[stage.key]?.count ?? '—';
                        const passed = data[stage.key]?.passed ?? 0;
                        const failed = data[stage.key]?.failed ?? 0;
                        const total = passed + failed || 1;
                        const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

                        return `
                            <div style="flex:1;min-width:140px;text-align:center;padding:16px 12px;background:var(--color-bg-body);border-radius:var(--radius-md);border:1px solid var(--color-border-light);">
                                <div style="font-size:24px;color:var(--color-primary);margin-bottom:8px;">
                                    <span class="material-symbols-outlined">${stage.icon}</span>
                                </div>
                                <div style="font-size:var(--text-2xl);font-weight:700;color:var(--color-text-primary);margin-bottom:4px;">
                                    ${count}
                                </div>
                                <div style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
                                    ${stage.label}
                                </div>
                                ${stageData ? `
                                    <div class="progress-bar" style="margin-top:4px;">
                                        <div class="progress-bar__fill ${passRate >= 80 ? 'progress-bar__fill--success' : passRate < 50 ? 'progress-bar__fill--error' : ''}" style="width:${passRate}%"></div>
                                    </div>
                                    <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:4px;">
                                        ${passRate}% pass
                                    </div>
                                ` : ''}
                            </div>
                            ${idx < STAGES.length - 1 ? '<div style="display:flex;align-items:center;color:var(--color-border);font-size:20px;">→</div>' : ''}
                        `;
                    }).join('')}
                </div>
            `;
        }

        function _renderTable(items) {
            const el = document.getElementById('progress-table');
            el.innerHTML = Table.render({
                columns: [
                    { key: 'battery_id', label: 'Battery ID', render: (v) => `<span class="text-mono fw-semibold">${v}</span>` },
                    { key: 'model', label: 'Model' },
                    { key: 'current_stage', label: 'Current Stage' },
                    { key: 'status', label: 'Status', render: (v) => StatusBadge.render(v) },
                    { key: 'operator', label: 'Operator' },
                    { key: 'updated_at', label: 'Last Updated' }
                ],
                rows: items,
                emptyText: 'No batteries currently in production pipeline.'
            });
        }

        return null;
    }
};

export default ProductionProgress;
