/**
 * dashboard.js — Admin Dashboard
 * 
 * KPI cards, summary counts, and high-level production overview.
 * Read-only monitoring interface for managers.
 * 
 * API: GET /api/v1/admin/dashboard
 */

import API from '../../core/api.js';
import KpiCard from '../../components/kpiCard.js';
import Table from '../../components/table.js';
import StatusBadge from '../../components/statusBadge.js';

const AdminDashboard = {
    render() {
        return `
            <div class="content__inner">
                <div class="page-header">
                    <h1 class="page-header__title">Dashboard</h1>
                    <p class="page-header__subtitle">Production overview and key performance indicators</p>
                </div>

                <!-- KPI Cards -->
                <div class="kpi-grid" id="kpi-grid">
                    <div class="kpi-card" style="opacity:0.5;">
                        <div class="kpi-card__content"><div class="kpi-card__label">Loading...</div></div>
                    </div>
                </div>

                <!-- Two-column layout -->
                <div class="dashboard-grid">
                    <!-- Recent Activity -->
                    <div class="card">
                        <div class="card__header">
                            <div class="card__title">Recent Activity</div>
                            <span class="text-sm text-muted">Last 24 hours</span>
                        </div>
                        <div class="card__body" style="padding:0;" id="recent-activity">
                            <div class="page-loader"><div class="spinner"></div></div>
                        </div>
                    </div>

                    <!-- Production Status -->
                    <div class="card">
                        <div class="card__header">
                            <div class="card__title">Stage Breakdown</div>
                        </div>
                        <div class="card__body" id="stage-breakdown">
                            <div class="page-loader"><div class="spinner"></div></div>
                        </div>
                    </div>

                    <!-- Today's Output (full width) -->
                    <div class="card dashboard-grid__item--full">
                        <div class="card__header">
                            <div class="card__title">Today's Production Output</div>
                        </div>
                        <div class="card__body" style="padding:0;" id="today-output">
                            <div class="page-loader"><div class="spinner"></div></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    async init() {
        await _loadDashboardData();
        return null;
    }
};

async function _loadDashboardData() {
    const result = await API.get('/admin/dashboard');

    if (result.success && result.data) {
        _renderKPIs(result.data.kpis);
        _renderRecentActivity(result.data.recent_activity);
        _renderStageBreakdown(result.data.stage_breakdown);
        _renderTodayOutput(result.data.today_output);
    } else {
        // Render with placeholder/demo data for structure
        _renderKPIs(null);
        _renderRecentActivity(null);
        _renderStageBreakdown(null);
        _renderTodayOutput(null);
    }
}

function _renderKPIs(kpis) {
    const data = kpis || {
        total_cells: { value: '—', change: '' },
        batteries_assembled: { value: '—', change: '' },
        pdi_pass_rate: { value: '—', change: '' },
        dispatched_today: { value: '—', change: '' },
        failed_batteries: { value: '—', change: '' },
        pending_inspection: { value: '—', change: '' }
    };

    document.getElementById('kpi-grid').innerHTML = `
        ${KpiCard.render({ label: 'Total Cells Registered', value: data.total_cells?.value ?? '—', icon: 'battery_std', variant: 'primary', change: data.total_cells?.change })}
        ${KpiCard.render({ label: 'Batteries Assembled', value: data.batteries_assembled?.value ?? '—', icon: 'build', variant: 'info', change: data.batteries_assembled?.change })}
        ${KpiCard.render({ label: 'PDI Pass Rate', value: data.pdi_pass_rate?.value ?? '—', icon: 'verified', variant: 'success', change: data.pdi_pass_rate?.change })}
        ${KpiCard.render({ label: 'Dispatched Today', value: data.dispatched_today?.value ?? '—', icon: 'local_shipping', variant: 'primary', change: data.dispatched_today?.change })}
        ${KpiCard.render({ label: 'Failed / Rejected', value: data.failed_batteries?.value ?? '—', icon: 'error_outline', variant: 'error', change: data.failed_batteries?.change })}
        ${KpiCard.render({ label: 'Pending Inspection', value: data.pending_inspection?.value ?? '—', icon: 'pending_actions', variant: 'warning', change: data.pending_inspection?.change })}
    `;
}

function _renderRecentActivity(activities) {
    const el = document.getElementById('recent-activity');
    if (!activities || activities.length === 0) {
        el.innerHTML = Table.render({
            columns: [
                { key: 'time', label: 'Time', width: '100px' },
                { key: 'action', label: 'Action' },
                { key: 'id', label: 'ID' },
                { key: 'status', label: 'Status', render: (v) => StatusBadge.render(v) }
            ],
            rows: [],
            emptyText: 'No recent activity data available.'
        });
        return;
    }

    el.innerHTML = Table.render({
        columns: [
            { key: 'time', label: 'Time', width: '100px' },
            { key: 'action', label: 'Action' },
            { key: 'id', label: 'ID', render: (v) => `<span class="text-mono">${v}</span>` },
            { key: 'status', label: 'Status', render: (v) => StatusBadge.render(v) }
        ],
        rows: activities
    });
}

function _renderStageBreakdown(stages) {
    const el = document.getElementById('stage-breakdown');
    const data = stages || [
        { stage: 'Cell Registration', count: '—', status: 'PENDING' },
        { stage: 'Cell Grading', count: '—', status: 'PENDING' },
        { stage: 'Battery Assembly', count: '—', status: 'PENDING' },
        { stage: 'Pack Testing', count: '—', status: 'PENDING' },
        { stage: 'BMS Mounting', count: '—', status: 'PENDING' },
        { stage: 'PDI Inspection', count: '—', status: 'PENDING' },
        { stage: 'Dispatch', count: '—', status: 'PENDING' }
    ];

    el.innerHTML = `
        <div class="operation-summary">
            ${data.map(s => `
                <div class="operation-summary__row">
                    <span class="operation-summary__key">${s.stage}</span>
                    <span style="display:flex;align-items:center;gap:12px;">
                        <span class="fw-semibold">${s.count}</span>
                        ${StatusBadge.render(s.status)}
                    </span>
                </div>
            `).join('')}
        </div>
    `;
}

function _renderTodayOutput(output) {
    const el = document.getElementById('today-output');
    if (!output || output.length === 0) {
        el.innerHTML = Table.render({
            columns: [
                { key: 'battery_id', label: 'Battery ID' },
                { key: 'model', label: 'Model' },
                { key: 'stage', label: 'Current Stage' },
                { key: 'status', label: 'Status', render: (v) => StatusBadge.render(v) },
                { key: 'updated_at', label: 'Last Updated' }
            ],
            rows: [],
            emptyText: 'No production output recorded today.'
        });
        return;
    }

    el.innerHTML = Table.render({
        columns: [
            { key: 'battery_id', label: 'Battery ID', render: (v) => `<span class="text-mono fw-semibold">${v}</span>` },
            { key: 'model', label: 'Model' },
            { key: 'stage', label: 'Current Stage' },
            { key: 'status', label: 'Status', render: (v) => StatusBadge.render(v) },
            { key: 'updated_at', label: 'Last Updated' }
        ],
        rows: output
    });
}

export default AdminDashboard;
