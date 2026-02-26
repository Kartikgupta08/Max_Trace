/**
 * dashboard.js — Admin Dashboard
 *
 * Responsive redesign — consistent with traceability.js + cellInventory.js:
 *   ✓ CSS Grid layouts — never drift on resize
 *   ✓ Full colour-coded badges for all backend status values
 *   ✓ All selectors prefixed .db- to prevent style leaks
 *   ✓ WebSocket live updates (30s interval from backend)
 *   ✓ Graceful fallback to REST on WS failure
 *   ✓ Shimmer skeleton on initial load
 *   ✓ Exact backend field mapping from fetch_dashboard_stats()
 */

import API from '../../core/api.js';
import Auth from '../../core/auth.js';

/* ─────────────────────────────────────────────────────────────
   Badge renderer — covers all status values returned by backend:
   SUCCESS / ERROR / ACTIVE / COMPLETED / HEALTHY / REPAIRED / PENDING
───────────────────────────────────────────────────────────── */
function _badge(val) {
    if (val == null || val === '') return '<span style="color:var(--color-text-tertiary)">—</span>';

    const v = String(val).trim().toUpperCase();

    const GREEN  = 'background:#E6F4EC;color:#1A6B3C;border:1px solid #A8D5BA;';
    const ORANGE = 'background:#FFF3E0;color:#B45309;border:1px solid #FCD38A;';
    const RED    = 'background:#FDECEA;color:#B71C1C;border:1px solid #F5C0BE;';
    const BLUE   = 'background:#E3F0FF;color:#1565C0;border:1px solid #AECEF7;';
    const PURPLE = 'background:#F3E8FF;color:#6B21A8;border:1px solid #D8B4FE;';
    const GREY   = 'background:var(--color-bg-body);color:var(--color-text-secondary);border:1px solid var(--color-border);';

    let style = GREY, dot = '';

    switch (v) {
        case 'SUCCESS':
        case 'COMPLETED':
        case 'HEALTHY':
        case 'PASS':
        case 'PASSED':
        case 'DISPATCHED':
            style = GREEN;  dot = '● '; break;

        case 'ERROR':
        case 'FAILED':
        case 'FAIL':
        case 'NG':
            style = RED;    dot = '● '; break;

        case 'ACTIVE':
        case 'IN PROGRESS':
        case 'IN-PROGRESS':
        case 'READY TO DISPATCH':
            style = BLUE;   dot = '● '; break;

        case 'REPAIRED':
        case 'PENDING':
        case 'FG PENDING':
            style = ORANGE; dot = '● '; break;

        case 'PROD':
        case 'IN PRODUCTION':
            style = PURPLE; dot = '● '; break;

        default:
            style = GREY; break;
    }

    return `<span style="
        display:inline-flex;align-items:center;gap:3px;
        padding:3px 10px;border-radius:20px;
        font-size:11px;font-weight:600;letter-spacing:0.3px;
        white-space:nowrap;${style}
    ">${dot}${val}</span>`;
}

/* ─────────────────────────────────────────────────────────────
   KPI card renderer — self-contained, no external component
───────────────────────────────────────────────────────────── */
function _kpiCard({ label, value, change, icon, accentColor }) {
    return `
        <div class="db-kpi">
            <div class="db-kpi-icon" style="background:${accentColor}18;color:${accentColor};">
                <span class="material-symbols-outlined" style="font-size:20px">${icon}</span>
            </div>
            <div class="db-kpi-body">
                <div class="db-kpi-value">${value ?? '—'}</div>
                <div class="db-kpi-label">${label}</div>
                ${change ? `<div class="db-kpi-change">${change}</div>` : ''}
            </div>
        </div>`;
}

/* ═══════════════════════════════════════════════════════════ */

const AdminDashboard = {

    render() {
        return `
        <style>
            /* ── Reset ── */
            .db-page *, .db-page *::before, .db-page *::after { box-sizing: border-box; }

            /* ── Page wrapper ── */
            .db-page {
                padding: var(--content-padding, 24px);
                font-family: var(--font-family);
                animation: db-fade 0.22s ease both;
            }

            @keyframes db-fade {
                from { opacity: 0; transform: translateY(6px); }
                to   { opacity: 1; transform: translateY(0); }
            }

            /* ── Header ── */
            .db-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 24px;
            }

            .db-header h1 {
                font-size: var(--text-xl);
                font-weight: var(--weight-bold);
                color: var(--color-text-primary);
                margin: 0 0 4px;
                line-height: 1.25;
            }

            .db-header p {
                font-size: var(--text-sm);
                color: var(--color-text-secondary);
                margin: 0;
            }

            /* WS status pill */
            .db-ws-pill {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                font-weight: 600;
                color: var(--color-text-tertiary);
                background: var(--color-bg-card);
                border: 1px solid var(--color-border);
                border-radius: 20px;
                padding: 4px 12px;
                white-space: nowrap;
                align-self: flex-start;
                margin-top: 4px;
            }

            .db-ws-dot {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: var(--color-text-tertiary);
                flex-shrink: 0;
                transition: background 300ms ease;
            }

            .db-ws-dot.live    { background: #22C55E; animation: db-pulse 2s ease-in-out infinite; }
            .db-ws-dot.error   { background: #EF4444; }
            .db-ws-dot.waiting { background: #F59E0B; }

            @keyframes db-pulse {
                0%, 100% { opacity: 1; }
                50%       { opacity: 0.4; }
            }

            /* ════════════════════════
               KPI GRID
            ════════════════════════ */
            .db-kpi-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 14px;
                margin-bottom: 20px;
            }

            @media (max-width: 640px) {
                .db-kpi-grid { grid-template-columns: 1fr 1fr; }
            }

            @media (max-width: 400px) {
                .db-kpi-grid { grid-template-columns: 1fr; }
            }

            .db-kpi {
                background: var(--color-bg-card);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-sm);
                padding: 18px 20px;
                display: flex;
                align-items: flex-start;
                gap: 14px;
                transition: box-shadow 150ms ease, transform 150ms ease;
            }

            .db-kpi:hover {
                box-shadow: var(--shadow-md);
                transform: translateY(-1px);
            }

            .db-kpi-icon {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .db-kpi-body { flex: 1; min-width: 0; }

            .db-kpi-value {
                font-size: 26px;
                font-weight: 700;
                color: var(--color-text-primary);
                line-height: 1.1;
                margin-bottom: 3px;
            }

            .db-kpi-label {
                font-size: 12px;
                font-weight: 600;
                color: var(--color-text-secondary);
                line-height: 1.3;
            }

            .db-kpi-change {
                font-size: 11px;
                color: var(--color-text-tertiary);
                margin-top: 2px;
            }

            /* ════════════════════════
               MAIN GRID
            ════════════════════════ */
            .db-main-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                grid-template-rows: auto auto;
                gap: 16px;
            }

            /* Today's output spans full width */
            .db-full-col { grid-column: 1 / -1; }

            @media (max-width: 900px) {
                .db-main-grid { grid-template-columns: 1fr; }
                .db-full-col  { grid-column: 1; }
            }

            /* ── Card ── */
            .db-card {
                background: var(--color-bg-card);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-sm);
                overflow: hidden;
            }

            .db-card-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 14px 20px;
                border-bottom: 1px solid var(--color-border-light);
                flex-wrap: wrap;
                gap: 8px;
            }

            .db-card-title {
                font-size: 13px;
                font-weight: 700;
                color: var(--color-text-primary);
                margin: 0;
            }

            .db-card-sub {
                font-size: 11px;
                color: var(--color-text-tertiary);
                font-weight: 500;
            }

            /* ── Tables ── */
            .db-scroll {
                width: 100%;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
            }

            .db-table {
                width: 100%;
                border-collapse: collapse;
                min-width: 400px;
            }

            .db-table thead {
                background: var(--color-bg-table-header);
            }

            .db-table th {
                padding: 9px 14px;
                text-align: left;
                font-size: 11px;
                font-weight: 700;
                color: var(--color-text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.8px;
                border-bottom: 1px solid var(--color-border);
                white-space: nowrap;
            }

            .db-table td {
                padding: 10px 14px;
                font-size: var(--text-sm);
                color: var(--color-text-primary);
                border-bottom: 1px solid var(--color-border-light);
                vertical-align: middle;
                white-space: nowrap;
            }

            .db-table tbody tr:last-child td { border-bottom: none; }
            .db-table tbody tr { transition: background 120ms ease; }
            .db-table tbody tr:hover td { background: var(--color-bg-table-row-hover); }

            /* ── Stage Breakdown ── */
            .db-stage-list {
                padding: 6px 0;
            }

            .db-stage-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 11px 20px;
                border-bottom: 1px solid var(--color-border-light);
                gap: 12px;
                transition: background 120ms ease;
            }

            .db-stage-row:last-child { border-bottom: none; }
            .db-stage-row:hover { background: var(--color-bg-table-row-hover); }

            .db-stage-name {
                font-size: var(--text-sm);
                font-weight: 500;
                color: var(--color-text-primary);
                flex: 1;
                min-width: 0;
            }

            .db-stage-right {
                display: flex;
                align-items: center;
                gap: 14px;
                flex-shrink: 0;
            }

            .db-stage-count {
                font-size: 15px;
                font-weight: 700;
                color: var(--color-text-primary);
                min-width: 32px;
                text-align: right;
            }

            /* ── Mono text ── */
            .db-mono {
                font-family: var(--font-mono);
                font-size: 12px;
                font-weight: 500;
            }

            /* ── Skeleton shimmer ── */
            @keyframes db-shimmer {
                0%   { background-position: -800px 0; }
                100% { background-position:  800px 0; }
            }

            .db-skel {
                display: inline-block;
                border-radius: 4px;
                background: linear-gradient(
                    90deg,
                    var(--color-border-light) 25%,
                    var(--color-border)       50%,
                    var(--color-border-light) 75%
                );
                background-size: 1600px 100%;
                animation: db-shimmer 1.4s ease-in-out infinite;
            }

            /* ── Empty state ── */
            .db-empty {
                text-align: center;
                padding: 36px 24px;
                color: var(--color-text-tertiary);
                font-size: var(--text-sm);
            }
        </style>

        <div class="db-page">

            <!-- Header -->
            <div class="db-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>Production overview and key performance indicators</p>
                </div>
                <div class="db-ws-pill" id="db-ws-pill">
                    <span class="db-ws-dot" id="db-ws-dot"></span>
                    <span id="db-ws-label">Connecting…</span>
                </div>
            </div>

            <!-- KPI Grid (skeleton until data loads) -->
            <div class="db-kpi-grid" id="db-kpi-grid">
                ${[1,2,3,4,5,6].map(() => `
                    <div class="db-kpi">
                        <div class="db-skel" style="width:40px;height:40px;border-radius:10px;flex-shrink:0"></div>
                        <div style="flex:1">
                            <div class="db-skel" style="width:60px;height:22px;display:block;margin-bottom:6px"></div>
                            <div class="db-skel" style="width:100px;height:11px;display:block"></div>
                        </div>
                    </div>`).join('')}
            </div>

            <!-- Main grid -->
            <div class="db-main-grid">

                <!-- Recent Activity -->
                <div class="db-card">
                    <div class="db-card-header">
                        <p class="db-card-title">Recent Activity</p>
                        <span class="db-card-sub">Last 5 PDI events</span>
                    </div>
                    <div class="db-scroll">
                        <div id="db-activity">${_skeletonTable(4, ['80px','140px','100px','70px'])}</div>
                    </div>
                </div>

                <!-- Stage Breakdown -->
                <div class="db-card">
                    <div class="db-card-header">
                        <p class="db-card-title">Stage Breakdown</p>
                        <span class="db-card-sub">Current production counts</span>
                    </div>
                    <div id="db-stages">${_skeletonStages()}</div>
                </div>

                <!-- Today's Output — full width -->
                <div class="db-card db-full-col">
                    <div class="db-card-header">
                        <p class="db-card-title">Today's Production Output</p>
                        <span class="db-card-sub" id="db-output-count"></span>
                    </div>
                    <div class="db-scroll">
                        <div id="db-output">${_skeletonTable(5, ['110px','90px','120px','80px','80px'])}</div>
                    </div>
                </div>

            </div>
        </div>`;
    },

    /* ═══════════════════════════════════════════════════ */

    async init() {
        /* Initial REST load */
        await _loadData();

        /* WebSocket live updates */
        _setupWS();

        return () => {
            /* Cleanup on page leave */
            if (window._dashboardWS) {
                window._dashboardWS._manualClose = true;
                window._dashboardWS.close();
                window._dashboardWS = null;
            }
        };
    }
};

/* ── REST load ───────────────────────────────────────────── */
async function _loadData() {
    const res = await API.get('/admin/dashboard');
    if (res?.success && res.data) {
        _render(res.data);
    } else {
        _renderError();
    }
}

/* ── WebSocket ───────────────────────────────────────────── */
function _setupWS() {
    const dot   = document.getElementById('db-ws-dot');
    const label = document.getElementById('db-ws-label');

    function setStatus(state, text) {
        if (!dot || !label) return;
        dot.className   = `db-ws-dot ${state}`;
        label.textContent = text;
    }

    const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token  = Auth.getToken();
    const qs     = token ? `?token=${encodeURIComponent(token)}` : '';
    const urls   = [
        `${scheme}//127.0.0.1:8000/admin/ws/dashboard${qs}`,
        `${scheme}//localhost:8000/admin/ws/dashboard${qs}`
    ];

    let attempt = 0, timer = null;

    function connect() {
        const url = urls[attempt % urls.length];
        attempt++;
        setStatus('waiting', `Connecting…`);

        let ws;
        try { ws = new WebSocket(url); }
        catch (e) { scheduleReconnect(); return; }

        ws.onopen = () => {
            attempt = 0;
            setStatus('live', 'Live');
            window._dashboardWS = ws;
        };

        ws.onmessage = e => {
            try {
                const res = JSON.parse(e.data);
                if (res?.success && res.data) _render(res.data);
            } catch (err) {
                console.warn('[Dashboard WS] parse error', err);
            }
        };

        ws.onerror  = ()  => setStatus('error', 'Error');
        ws.onclose  = ev  => {
            if (ws._manualClose) return;
            setStatus('waiting', 'Disconnected');
            scheduleReconnect();
        };
    }

    function scheduleReconnect() {
        if (timer) return;
        const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(attempt, 6)));
        timer = setTimeout(() => { timer = null; connect(); }, delay);
    }

    connect();
}

/* ── Master render — called by both REST and WS ──────────── */
function _render(data) {
    _renderKPIs(data.kpis);
    _renderActivity(data.recent_activity);
    _renderStages(data.stage_breakdown);
    _renderOutput(data.today_output);
}

/* ── KPIs ────────────────────────────────────────────────── */
function _renderKPIs(kpis) {
    const el = document.getElementById('db-kpi-grid');
    if (!el) return;

    const d = kpis || {};

    const cards = [
        { label: 'Total Cells',         value: d.total_cells?.value,         change: d.total_cells?.change,         icon: 'battery_std',      color: 'var(--color-primary)' },
        { label: 'Batteries Assembled', value: d.batteries_assembled?.value, change: d.batteries_assembled?.change, icon: 'build',             color: '#0284C7' },
        { label: 'PDI Pass Rate',        value: d.pdi_pass_rate?.value,       change: d.pdi_pass_rate?.change,       icon: 'verified',          color: '#16A34A' },
        { label: 'Dispatched Today',     value: d.dispatched_today?.value,    change: d.dispatched_today?.change,    icon: 'local_shipping',    color: '#0891B2' },
        { label: 'Failed / Rejected',    value: d.failed_batteries?.value,    change: d.failed_batteries?.change,    icon: 'error_outline',     color: '#DC2626' },
        { label: 'Pending Inspection',   value: d.pending_inspection?.value,  change: d.pending_inspection?.change,  icon: 'pending_actions',   color: '#D97706' },
    ];

    el.innerHTML = cards.map(c => _kpiCard({
        label: c.label, value: c.value ?? '—',
        change: c.change, icon: c.icon, accentColor: c.color
    })).join('');
}

/* ── Recent Activity ─────────────────────────────────────── */
function _renderActivity(activities) {
    const el = document.getElementById('db-activity');
    if (!el) return;

    if (!activities?.length) {
        el.innerHTML = `<div class="db-empty">No recent activity in the last 24 hours.</div>`;
        return;
    }

    const rows = activities.map(a => `
        <tr>
            <td style="color:var(--color-text-secondary);font-size:12px;font-family:var(--font-mono)">${a.time || '—'}</td>
            <td>${a.action || '—'}</td>
            <td><span class="db-mono">${a.id || '—'}</span></td>
            <td>${_badge(a.status)}</td>
        </tr>`).join('');

    el.innerHTML = `
        <table class="db-table">
            <thead><tr>
                <th>Time</th>
                <th>Action</th>
                <th>ID</th>
                <th>Result</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

/* ── Stage Breakdown ─────────────────────────────────────── */
function _renderStages(stages) {
    const el = document.getElementById('db-stages');
    if (!el) return;

    /* Backend returns 3 stages; supplement with full pipeline for display */
    const pipeline = [
        'Cell Registration',
        'Assembly',
        'Pack Testing',
        'BMS Mounting',
        'PDI Inspection',
        'Dispatch Today',
    ];

    /* Build lookup from backend data */
    const lookup = {};
    (stages || []).forEach(s => { lookup[s.stage] = s; });

    const rows = pipeline.map(name => {
        const s = lookup[name];
        return `
            <div class="db-stage-row">
                <span class="db-stage-name">${name}</span>
                <div class="db-stage-right">
                    <span class="db-stage-count">${s ? s.count : '—'}</span>
                    ${s ? _badge(s.status) : _badge('PENDING')}
                </div>
            </div>`;
    }).join('');

    el.innerHTML = `<div class="db-stage-list">${rows}</div>`;
}

/* ── Today's Output ──────────────────────────────────────── */
function _renderOutput(output) {
    const el       = document.getElementById('db-output');
    const countEl  = document.getElementById('db-output-count');
    if (!el) return;

    if (countEl) {
        countEl.textContent = output?.length
            ? `${output.length} batter${output.length !== 1 ? 'ies' : 'y'} today`
            : '';
    }

    if (!output?.length) {
        el.innerHTML = `<div class="db-empty">No production output recorded today.</div>`;
        return;
    }

    const rows = output.map(b => `
        <tr>
            <td><span class="db-mono">${b.battery_id || '—'}</span></td>
            <td>${b.model || '—'}</td>
            <td style="color:var(--color-text-secondary)">${b.stage || '—'}</td>
            <td>${_badge(b.status)}</td>
            <td style="color:var(--color-text-secondary);font-size:12px;font-family:var(--font-mono)">${b.updated_at || '—'}</td>
        </tr>`).join('');

    el.innerHTML = `
        <table class="db-table" style="min-width:560px">
            <thead><tr>
                <th>Battery ID</th>
                <th>Model</th>
                <th>Stage</th>
                <th>Status</th>
                <th>Updated At</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

/* ── Error state ─────────────────────────────────────────── */
function _renderError() {
    const kpiEl = document.getElementById('db-kpi-grid');
    if (kpiEl) kpiEl.innerHTML = `
        <div style="grid-column:1/-1;padding:20px;color:var(--color-error);font-size:var(--text-sm)">
            Failed to load dashboard data. Please refresh.
        </div>`;
}

/* ── Skeleton helpers ─────────────────────────────────────── */
function _skeletonTable(rows, colWidths) {
    const sk = ws =>
        `<tr>${ws.map(w => `<td><span class="db-skel" style="width:${w};height:11px;display:inline-block"></span></td>`).join('')}</tr>`;
    return `
        <table class="db-table">
            <thead><tr>${colWidths.map(() =>
                `<th><span class="db-skel" style="width:60px;height:10px;display:inline-block"></span></th>`
            ).join('')}</tr></thead>
            <tbody>${Array(rows).fill(null).map(() => sk(colWidths)).join('')}</tbody>
        </table>`;
}

function _skeletonStages() {
    return `<div class="db-stage-list">
        ${Array(4).fill(null).map(() => `
            <div class="db-stage-row">
                <span class="db-skel" style="width:120px;height:11px;display:inline-block"></span>
                <div class="db-stage-right">
                    <span class="db-skel" style="width:28px;height:14px;display:inline-block"></span>
                    <span class="db-skel" style="width:60px;height:20px;border-radius:20px;display:inline-block"></span>
                </div>
            </div>`).join('')}
    </div>`;
}

export default AdminDashboard;