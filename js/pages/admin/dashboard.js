/**
 * dashboard.js — Admin Dashboard
 * * Updated with direct backend port mapping and complete UI sync.
 */

import API from '../../core/api.js';
import Auth from '../../core/auth.js';
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

                <div class="kpi-grid" id="kpi-grid">
                    <div class="kpi-card" style="opacity:0.5;">
                        <div class="kpi-card__content"><div class="kpi-card__label">Loading...</div></div>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="card">
                        <div class="card__header">
                            <div class="card__title">Recent Activity</div>
                            <span class="text-sm text-muted">Last 24 hours</span>
                        </div>
                        <div class="card__body" style="padding:0;" id="recent-activity">
                            <div class="page-loader"><div class="spinner"></div></div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card__header">
                            <div class="card__title">Stage Breakdown</div>
                        </div>
                        <div class="card__body" id="stage-breakdown">
                            <div class="page-loader"><div class="spinner"></div></div>
                        </div>
                    </div>

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

        (function setupDashboardWS() {
            const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
            const token = Auth.getToken();
            const qs = token ? `?token=${encodeURIComponent(token)}` : '';
            
            // FIX: Point to port 8000 and use the correct /admin prefix
            const primaryUrl = `${scheme}//127.0.0.1:8000/admin/ws/dashboard${qs}`;
            const fallbackUrl = `${scheme}//localhost:8000/admin/ws/dashboard${qs}`;

            let ws = null;
            let attempt = 0;
            let reconnectTimer = null;
            let statusEl = null;

            function setStatus(text, color) {
                if (statusEl) { statusEl.textContent = text; if (color) statusEl.style.color = color; }
                console.debug('[Dashboard WS Status]', text);
            }

            function connect(urls) {
                const url = urls.shift();
                attempt += 1;
                setStatus(`connecting (${attempt}) → ${url}`, 'var(--color-text-secondary)');
                try {
                    ws = new WebSocket(url);
                } catch (err) {
                    console.error('Dashboard WS constructor failed', err);
                    scheduleReconnect(urls);
                    return;
                }

                ws.onopen = () => {
                    attempt = 0;
                    setStatus('connected', 'var(--color-success)');
                    console.log('Dashboard WebSocket connected', url);
                    window._dashboardWS = ws;
                };

                ws.onmessage = (event) => {
                    try {
                        const result = JSON.parse(event.data);
                        if (result && result.success) {
                            _renderKPIs(result.data.kpis);
                            _renderRecentActivity(result.data.recent_activity);
                            _renderTodayOutput(result.data.today_output);
                            // FIX: Added stage breakdown render for full UI sync
                            _renderStageBreakdown(result.data.stage_breakdown);
                        } else {
                            console.warn('Dashboard WS message without success flag', result);
                        }
                    } catch (err) {
                        console.error('Dashboard WS message parse error', err, event.data);
                    }
                };

                ws.onerror = (e) => {
                    console.error('Dashboard WebSocket error', e);
                    setStatus('error', 'var(--color-error)');
                };

                ws.onclose = (ev) => {
                    console.warn('Dashboard WebSocket closed', ev);
                    setStatus('disconnected', 'var(--color-text-tertiary)');
                    scheduleReconnect([primaryUrl, fallbackUrl]);
                };
            }

            function scheduleReconnect(urls) {
                if (reconnectTimer) return;
                attempt = Math.min(attempt + 1, 6);
                const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
                setStatus(`reconnecting in ${Math.round(delay/1000)}s`, 'var(--color-text-secondary)');
                reconnectTimer = setTimeout(() => {
                    reconnectTimer = null;
                    connect(urls.slice());
                }, delay);
            }

            connect([primaryUrl, fallbackUrl]);
        })();

        return null;
    }
};

// ... Render functions (_loadDashboardData, _renderKPIs, etc.) remain below
// Ensure _renderStageBreakdown is called in the REST load as well.

async function _loadDashboardData() {
    const result = await API.get('/admin/dashboard');

    if (result.success && result.data) {
        _renderKPIs(result.data.kpis);
        _renderRecentActivity(result.data.recent_activity);
        _renderStageBreakdown(result.data.stage_breakdown);
        _renderTodayOutput(result.data.today_output);
    } else {
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

    const kpiGrid = document.getElementById('kpi-grid');
    if (!kpiGrid) return;

    kpiGrid.innerHTML = `
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
    if (!el) return;
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
    if (!el) return;
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
    if (!el) return;
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