/**
 * cellInventory.js — Cell Inventory Status (Admin)
 *
 * Responsive redesign — consistent with traceability.js:
 *   ✓ CSS Grid filter bar — no drift on resize
 *   ✓ Native <select> styled cleanly — no floating DOM panels
 *   ✓ Table in overflow-x:auto wrapper — never breaks layout
 *   ✓ Full colour-coded status badges matching backend values
 *   ✓ All selectors prefixed .ci- to prevent style leaks
 *   ✓ voltage + ir columns added (returned by API)
 *   ✓ Shimmer skeleton on load
 */

import API from '../../core/api.js';
import Pagination from '../../components/pagination.js';

/* ─────────────────────────────────────────────────────────────
   Badge renderer — colour coded for all cell inventory statuses
───────────────────────────────────────────────────────────── */
function _badge(val) {
    if (val == null || val === '') return '<span style="color:var(--color-text-tertiary)">—</span>';

    const v = String(val).trim().toUpperCase();

    const GREEN  = 'background:#E6F4EC;color:#1A6B3C;border:1px solid #A8D5BA;';
    const ORANGE = 'background:#FFF3E0;color:#B45309;border:1px solid #FCD38A;';
    const RED    = 'background:#FDECEA;color:#B71C1C;border:1px solid #F5C0BE;';
    const BLUE   = 'background:#E3F0FF;color:#1565C0;border:1px solid #AECEF7;';
    const GREY   = 'background:var(--color-bg-body);color:var(--color-text-secondary);border:1px solid var(--color-border);';

    let style = GREY, dot = '';

    switch (v) {
        case 'GRADED':    style = GREEN;  dot = '● '; break;
        case 'ASSIGNED':  style = BLUE;   dot = '● '; break;
        case 'REGISTERED':style = ORANGE; dot = '○ '; break;
        case 'FAILED':    style = RED;    dot = '● '; break;
        default:          style = GREY;               break;
    }

    return `<span style="
        display:inline-flex;align-items:center;gap:3px;
        padding:3px 10px;border-radius:20px;
        font-size:11px;font-weight:600;letter-spacing:0.3px;
        white-space:nowrap;${style}
    ">${dot}${val}</span>`;
}

const CellInventory = {

    render() {
        return `
        <style>
            /* ── Reset ── */
            .ci-page *, .ci-page *::before, .ci-page *::after { box-sizing: border-box; }

            /* ── Page wrapper ── */
            .ci-page {
                padding: var(--content-padding, 24px);
                font-family: var(--font-family);
                animation: ci-fade 0.22s ease both;
            }

            @keyframes ci-fade {
                from { opacity: 0; transform: translateY(6px); }
                to   { opacity: 1; transform: translateY(0); }
            }

            /* ── Header ── */
            .ci-header { margin-bottom: 24px; }

            .ci-header h1 {
                font-size: var(--text-xl);
                font-weight: var(--weight-bold);
                color: var(--color-text-primary);
                margin: 0 0 4px;
                line-height: 1.25;
            }

            .ci-header p {
                font-size: var(--text-sm);
                color: var(--color-text-secondary);
                margin: 0;
            }

            /* ════════════════════════
               FILTER CARD
            ════════════════════════ */
            .ci-filter-card {
                background: var(--color-bg-card);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-sm);
                padding: 20px 24px 14px;
                margin-bottom: 16px;
            }

            .ci-filter-eyebrow {
                display: flex;
                align-items: center;
                gap: 7px;
                font-size: 11px;
                font-weight: 700;
                color: var(--color-text-tertiary);
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 14px;
            }

            /*
             * CSS Grid — 6 defined columns on desktop.
             * Collapses cleanly at two breakpoints.
             * Desktop: [Cell ID wide] [From] [To] [Brand] [Status] [Btn]
             * Tablet:  3-col, btn spans full row
             * Mobile:  1-col stack
             */
            .ci-filter-grid {
                display: grid;
                grid-template-columns: 2fr 1fr 1fr 1.2fr 1.2fr auto;
                gap: 12px;
                align-items: end;
            }

            @media (max-width: 1100px) {
                .ci-filter-grid { grid-template-columns: 1fr 1fr 1fr; }
                .ci-btn-col     { grid-column: 1 / -1; }
            }

            @media (max-width: 640px) {
                .ci-filter-grid { grid-template-columns: 1fr; }
                .ci-btn-col     { grid-column: 1; }
                .ci-filter-card { padding: 16px 16px 12px; }
            }

            .ci-field {
                display: flex;
                flex-direction: column;
                gap: 5px;
                min-width: 0;
            }

            .ci-label {
                font-size: 11px;
                font-weight: 700;
                color: var(--color-text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.7px;
                white-space: nowrap;
            }

            .ci-input-wrap {
                position: relative;
                display: flex;
                align-items: center;
            }

            .ci-input-icon {
                position: absolute;
                left: 10px;
                color: var(--color-text-tertiary);
                display: flex;
                align-items: center;
                pointer-events: none;
                z-index: 1;
            }

            /* Shared control base */
            .ci-ctrl {
                width: 100%;
                height: 40px;
                background: var(--color-bg-input);
                border: 1.5px solid var(--color-border-input);
                border-radius: var(--radius-md);
                color: var(--color-text-primary);
                font-family: var(--font-family);
                font-size: var(--text-sm);
                padding: 0 12px;
                outline: none;
                transition: border-color 140ms ease, box-shadow 140ms ease;
            }

            .ci-ctrl:focus {
                border-color: var(--color-primary);
                box-shadow: 0 0 0 3px var(--color-primary-surface);
            }

            .ci-ctrl::placeholder { color: var(--color-text-tertiary); }
            .ci-ctrl--icon { padding-left: 34px; }

            /* Native select */
            .ci-ctrl.ci-select {
                appearance: none;
                -webkit-appearance: none;
                cursor: pointer;
                background-image: url("data:image/svg+xml,%3Csvg width='11' height='7' viewBox='0 0 11 7' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4.5 4.5L10 1' stroke='%238B90A0' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 11px center;
                padding-right: 30px;
            }

            /* Search button */
            .ci-search-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 7px;
                height: 40px;
                width: 100%;
                padding: 0 20px;
                background: var(--color-primary);
                color: #fff;
                border: none;
                border-radius: var(--radius-md);
                font-family: var(--font-family);
                font-size: var(--text-sm);
                font-weight: 600;
                cursor: pointer;
                white-space: nowrap;
                box-shadow: 0 1px 4px rgba(27,58,92,0.18);
                transition: background 140ms ease, box-shadow 140ms ease, transform 100ms ease;
            }

            .ci-search-btn:hover  { background: var(--color-primary-light); box-shadow: 0 3px 10px rgba(27,58,92,0.24); }
            .ci-search-btn:active { transform: scale(0.98); }

            /* Clear link */
            .ci-clear-row {
                display: flex;
                justify-content: flex-end;
                margin-top: 10px;
            }

            .ci-clear-btn {
                background: none;
                border: none;
                font-family: var(--font-family);
                font-size: 12px;
                color: var(--color-text-tertiary);
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 0;
                transition: color 140ms ease;
            }
            .ci-clear-btn:hover { color: var(--color-text-primary); }

            /* ════════════════════════
               STATS BAR
            ════════════════════════ */
            .ci-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
                gap: 12px;
                margin-bottom: 16px;
            }

            .ci-stat {
                background: var(--color-bg-card);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                padding: 14px 18px;
                box-shadow: var(--shadow-sm);
            }

            .ci-stat-label {
                font-size: 11px;
                font-weight: 700;
                color: var(--color-text-tertiary);
                text-transform: uppercase;
                letter-spacing: 0.7px;
                margin-bottom: 4px;
            }

            .ci-stat-value {
                font-size: 22px;
                font-weight: 700;
                color: var(--color-text-primary);
                line-height: 1.2;
            }

            .ci-stat-sub {
                font-size: 11px;
                color: var(--color-text-tertiary);
                margin-top: 2px;
            }

            /* ════════════════════════
               RESULTS CARD
            ════════════════════════ */
            .ci-card {
                background: var(--color-bg-card);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-sm);
                overflow: hidden;
            }

            .ci-card-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 14px 20px;
                border-bottom: 1px solid var(--color-border-light);
                flex-wrap: wrap;
                gap: 8px;
            }

            .ci-card-title {
                font-size: 11px;
                font-weight: 700;
                color: var(--color-text-secondary);
                text-transform: uppercase;
                letter-spacing: 1px;
                margin: 0;
            }

            .ci-count {
                font-size: 11px;
                font-weight: 600;
                color: var(--color-text-tertiary);
                background: var(--color-bg-body);
                border: 1px solid var(--color-border);
                border-radius: 20px;
                padding: 2px 10px;
            }

            /* Horizontal scroll wrapper */
            .ci-scroll {
                width: 100%;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
            }

            .ci-table {
                width: 100%;
                border-collapse: collapse;
                min-width: 680px;
            }

            .ci-table thead {
                background: var(--color-bg-table-header);
                position: sticky;
                top: 0;
                z-index: 2;
            }

            .ci-table th {
                padding: 10px 14px;
                text-align: left;
                font-size: 11px;
                font-weight: 700;
                color: var(--color-text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.8px;
                border-bottom: 1px solid var(--color-border);
                white-space: nowrap;
            }

            .ci-table td {
                padding: 11px 14px;
                font-size: var(--text-sm);
                color: var(--color-text-primary);
                border-bottom: 1px solid var(--color-border-light);
                vertical-align: middle;
                white-space: nowrap;
            }

            .ci-table tbody tr:last-child td { border-bottom: none; }

            .ci-table tbody tr {
                transition: background 120ms ease;
            }

            .ci-table tbody tr:hover td {
                background: var(--color-bg-table-row-hover);
            }

            /* Mono text */
            .ci-mono {
                font-family: var(--font-mono);
                font-size: 12px;
                font-weight: 500;
            }

            /* Numeric cells — right-aligned */
            .ci-num {
                font-family: var(--font-mono);
                font-size: 12px;
                color: var(--color-text-secondary);
                text-align: right;
            }

            .ci-table th.ci-th-num { text-align: right; }

            /* Skeleton shimmer */
            @keyframes ci-shimmer {
                0%   { background-position: -800px 0; }
                100% { background-position:  800px 0; }
            }

            .ci-skel {
                display: inline-block;
                height: 12px;
                border-radius: 4px;
                background: linear-gradient(
                    90deg,
                    var(--color-border-light) 25%,
                    var(--color-border)       50%,
                    var(--color-border-light) 75%
                );
                background-size: 1600px 100%;
                animation: ci-shimmer 1.4s ease-in-out infinite;
            }

            /* Empty state */
            .ci-empty {
                text-align: center;
                padding: 52px 24px;
                color: var(--color-text-tertiary);
            }
            .ci-empty svg { opacity: 0.22; margin-bottom: 14px; }
            .ci-empty-ttl {
                font-size: var(--text-base);
                font-weight: 600;
                color: var(--color-text-secondary);
                margin: 0 0 4px;
            }
            .ci-empty-sub { font-size: var(--text-sm); margin: 0; }

            /* Pagination */
            .ci-pag { padding: 14px 20px; border-top: 1px solid var(--color-border-light); }
        </style>

        <div class="ci-page">

            <!-- Header -->
            <div class="ci-header">
                <h1>Cell Inventory</h1>
                <p>All registered cells with grading status, brand, and assignment</p>
            </div>

            <!-- Filter Card -->
            <div class="ci-filter-card">
                <div class="ci-filter-eyebrow">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                    </svg>
                    Search &amp; Filter
                </div>

                <div class="ci-filter-grid">

                    <!-- Cell ID -->
                    <div class="ci-field">
                        <label class="ci-label" for="ci-cell-id">Cell ID</label>
                        <div class="ci-input-wrap">
                            <span class="ci-input-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <ellipse cx="12" cy="5" rx="9" ry="3"/>
                                    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
                                    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
                                </svg>
                            </span>
                            <input
                                type="text"
                                id="ci-cell-id"
                                class="ci-ctrl ci-ctrl--icon"
                                placeholder="Scan or type Cell ID…"
                                autocomplete="off"
                                spellcheck="false"
                            />
                        </div>
                    </div>

                    <!-- From date -->
                    <div class="ci-field">
                        <label class="ci-label" for="ci-dfrom">From Date</label>
                        <input type="date" id="ci-dfrom" class="ci-ctrl" />
                    </div>

                    <!-- To date -->
                    <div class="ci-field">
                        <label class="ci-label" for="ci-dto">To Date</label>
                        <input type="date" id="ci-dto" class="ci-ctrl" />
                    </div>

                    <!-- Brand -->
                    <div class="ci-field">
                        <label class="ci-label" for="ci-brand">Brand</label>
                        <select id="ci-brand" class="ci-ctrl ci-select">
                            <option value="">All Brands</option>
                        </select>
                    </div>

                    <!-- Status -->
                    <div class="ci-field">
                        <label class="ci-label" for="ci-status">Status</label>
                        <select id="ci-status" class="ci-ctrl ci-select">
                            <option value="">All Statuses</option>
                            <option value="REGISTERED">Registered</option>
                            <option value="GRADED">Graded (Pass)</option>
                            <option value="ASSIGNED">Assigned to Pack</option>
                            <option value="FAILED">Failed</option>
                        </select>
                    </div>

                    <!-- Search button -->
                    <div class="ci-field ci-btn-col">
                        <label class="ci-label" style="visibility:hidden" aria-hidden="true">Search</label>
                        <button id="ci-search" class="ci-search-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                            </svg>
                            Apply Filters
                        </button>
                    </div>

                </div>

                <div class="ci-clear-row">
                    <button class="ci-clear-btn" id="ci-clear">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                        </svg>
                        Clear filters
                    </button>
                </div>
            </div>

            <!-- Stats injected by JS -->
            <div id="ci-stats"></div>

            <!-- Results -->
            <div class="ci-card">
                <div class="ci-card-header">
                    <p class="ci-card-title">Cell Records</p>
                    <span class="ci-count" id="ci-count">—</span>
                </div>
                <div class="ci-scroll">
                    <div id="ci-results">${_emptyHtml('Loading cell inventory…')}</div>
                </div>
                <div class="ci-pag" id="ci-pag"></div>
            </div>

        </div>`;
    },

    /* ═══════════════════════════════════════════════════ */

    async init() {
        let page = 1;

        /* Set today's date as default range */
        const today = _isoToday();
        const dfromEl = document.getElementById('ci-dfrom');
        const dtoEl   = document.getElementById('ci-dto');
        if (dfromEl) dfromEl.value = today;
        if (dtoEl)   dtoEl.value   = today;

        /* Load brands dropdown */
        await _loadBrands();

        /* Initial data fetch */
        await _fetch(1);

        /* Event listeners */
        document.getElementById('ci-search').addEventListener('click', () => { page = 1; _fetch(1); });

        document.getElementById('ci-cell-id').addEventListener('keydown', e => {
            if (e.key === 'Enter') { page = 1; _fetch(1); }
        });

        document.getElementById('ci-clear').addEventListener('click', () => {
            document.getElementById('ci-cell-id').value = '';
            document.getElementById('ci-dfrom').value   = '';
            document.getElementById('ci-dto').value     = '';
            document.getElementById('ci-brand').value   = '';
            document.getElementById('ci-status').value  = '';
            page = 1;
            _fetch(1);
        });

        /* ── Brands dropdown ── */
        async function _loadBrands() {
            const res = await API.get('/admin/cells/brands');
            if (res?.success && Array.isArray(res.data)) {
                const sel = document.getElementById('ci-brand');
                // Remove existing options beyond "All Brands"
                while (sel.options.length > 1) sel.remove(1);
                res.data.forEach(brand => {
                    const opt = document.createElement('option');
                    opt.value = brand;
                    opt.textContent = brand;
                    sel.appendChild(opt);
                });
            }
        }

        /* ── Fetch ── */
        async function _fetch(p) {
            _skeleton();

            const cellId = document.getElementById('ci-cell-id').value.trim();
            const dfrom  = _nd(document.getElementById('ci-dfrom').value);
            const dto    = _nd(document.getElementById('ci-dto').value);
            const brand  = document.getElementById('ci-brand').value;
            const status = document.getElementById('ci-status').value;

            const params = { page: p, page_size: 20 };

            if (cellId) {
                params.cell_id = cellId;
                if (status) params.status = status;
            } else {
                if (dfrom)  params.date_from = dfrom;
                if (dto)    params.date_to   = dto;
                if (brand)  params.model     = brand;
                if (status) params.status    = status;
            }

            const res = await API.get('/admin/cells/inventory', params);

            if (res?.success && res.data) {
                const items = res.data.items || [];
                const pag   = res.data;

                _renderStats(items, pag);
                _renderTable(items);
                _setCount(items.length, pag);
                _renderPag(pag, p);

            } else {
                _renderStats([], null);
                document.getElementById('ci-results').innerHTML =
                    _emptyHtml('No cell records found for the given criteria.');
                _setCount(0, null);
                document.getElementById('ci-pag').innerHTML = '';
            }
        }

        /* ── Stats ── */
        function _renderStats(items, pag) {
            const el = document.getElementById('ci-stats');
            if (!el) return;
            if (!items?.length) { el.innerHTML = ''; return; }

            const total      = pag ? (pag.total_items || items.length) : items.length;
            const graded     = items.filter(i => i.status === 'GRADED').length;
            const assigned   = items.filter(i => i.status === 'ASSIGNED').length;
            const failed     = items.filter(i => i.status === 'FAILED').length;
            const registered = items.filter(i => i.status === 'REGISTERED').length;

            el.innerHTML = `
                <div class="ci-stats" style="margin-bottom:16px;">
                    ${_sc('Total Cells',  total.toLocaleString(), 'in view')}
                    ${_sc('Graded',       graded,     'passed grading',   '#1A6B3C')}
                    ${_sc('Assigned',     assigned,   'in battery packs', '#1565C0')}
                    ${_sc('Registered',   registered, 'awaiting grading', '#B45309')}
                    ${_sc('Failed',       failed,     'did not pass',     '#B71C1C')}
                </div>`;
        }

        function _sc(label, val, sub, color = '') {
            return `
                <div class="ci-stat">
                    <div class="ci-stat-label">${label}</div>
                    <div class="ci-stat-value"${color ? ` style="color:${color}"` : ''}>${val}</div>
                    <div class="ci-stat-sub">${sub}</div>
                </div>`;
        }

        /* ── Table ── */
        function _renderTable(items) {
            const el = document.getElementById('ci-results');
            if (!items?.length) {
                el.innerHTML = _emptyHtml('No cell records found for the given criteria.');
                return;
            }

            const rows = items.map(row => `
                <tr>
                    <td><span class="ci-mono">${row.cell_id || '—'}</span></td>
                    <td>${row.model && row.model !== 'N/A' ? row.model : '<span style="color:var(--color-text-tertiary)">N/A</span>'}</td>
                    <td>${_badge(row.status)}</td>
                    <td class="ci-num">${row.voltage != null ? Number(row.voltage).toFixed(3) + ' V' : '—'}</td>
                    <td class="ci-num">${row.ir != null ? Number(row.ir).toFixed(2) + ' mΩ' : '—'}</td>
                    <td style="color:var(--color-text-secondary);font-size:12px">${_fmtDate(row.registered_at)}</td>
                </tr>`).join('');

            el.innerHTML = `
                <table class="ci-table">
                    <thead><tr>
                        <th>Cell ID</th>
                        <th>Brand</th>
                        <th>Status</th>
                        <th class="ci-th-num">Voltage</th>
                        <th class="ci-th-num">IR (mΩ)</th>
                        <th>Registered At</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>`;
        }

        /* ── Pagination ── */
        function _renderPag(data, p) {
            const el         = document.getElementById('ci-pag');
            const totalPages = data.total_pages || 1;
            const totalItems = data.total_items || 0;

            el.innerHTML = Pagination.render({
                currentPage: p,
                totalPages,
                totalItems,
                pageSize: 20,
                containerId: 'ci-pag-ctrl'
            });

            Pagination.init('ci-pag-ctrl', np => {
                page = np;
                _fetch(np);
                document.querySelector('.ci-page')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }

        /* ── Helpers ── */
        function _setCount(n, pag) {
            const el    = document.getElementById('ci-count');
            if (!el) return;
            const total = pag ? (pag.total_items || n) : n;
            el.textContent = total > 0
                ? `${total.toLocaleString()} cell${total !== 1 ? 's' : ''}`
                : 'No records';
        }

        function _skeleton() {
            const el = document.getElementById('ci-results');
            const sk = ws =>
                `<tr>${ws.map(w => `<td><span class="ci-skel" style="width:${w}"></span></td>`).join('')}</tr>`;
            el.innerHTML = `
                <table class="ci-table">
                    <thead><tr>
                        <th>Cell ID</th><th>Brand</th><th>Status</th>
                        <th class="ci-th-num">Voltage</th>
                        <th class="ci-th-num">IR (mΩ)</th>
                        <th>Registered At</th>
                    </tr></thead>
                    <tbody>
                        ${sk(['90px','80px','70px','52px','52px','100px'])}
                        ${sk(['80px','90px','80px','52px','52px','100px'])}
                        ${sk(['100px','70px','65px','52px','52px','100px'])}
                        ${sk(['85px','85px','75px','52px','52px','100px'])}
                        ${sk(['95px','75px','70px','52px','52px','100px'])}
                    </tbody>
                </table>`;
        }

        function _nd(s) {
            if (!s) return '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
            const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
            if (m) return `${m[3]}-${m[2]}-${m[1]}`;
            const d = new Date(s);
            if (!isNaN(d))
                return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            return s;
        }

        function _fmtDate(v) {
            if (!v) return '—';
            const d = new Date(v);
            if (isNaN(d)) return v;
            return d.toLocaleString(undefined, {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        }

        return null;
    }
};

/* ── Module-level helpers ── */
function _emptyHtml(msg) {
    return `
        <div class="ci-empty">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
                <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
            </svg>
            <p class="ci-empty-ttl">No results</p>
            <p class="ci-empty-sub">${msg}</p>
        </div>`;
}

function _isoToday() {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
}

export default CellInventory;