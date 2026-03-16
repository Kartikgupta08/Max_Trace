/**
 * traceability.js — Battery Traceability Viewer
 *
 * Changes vs previous version:
 *   ✓ _API_BASE: dynamic import from core/config.js with safe inline fallback
 *     — no changes to api.js needed, page never breaks if config.js missing
 *   ✓ Checkbox column for per-row selection
 *   ✓ Sticky selection toolbar appears when ≥1 row checked
 *   ✓ "Download Selected" fires sequential downloads for all checked batteries
 *   ✓ Select-all checkbox in table header selects/deselects current page
 *   ✓ Selection persists across pagination
 */

import API from '../../core/api.js';
import Pagination from '../../components/pagination.js';

/* ─────────────────────────────────────────────────────────────
   API base URL
   ─────────────────────────────────────────────────────────────
   Recommended setup (one-time, keeps api.js + traceability.js in sync):

     1. Create  src/core/config.js :
            export const API_BASE = 'http://localhost:8000';

     2. In api.js replace:
            const API_BASE = 'http://localhost:8000';
        with:
            import { API_BASE } from './config.js';

   Until config.js is created the fallback below keeps this page
   working — no page load errors.
───────────────────────────────────────────────────────────── */
let _API_BASE = 'http://localhost:8000';          // ← safe fallback
try {
    const cfg = await import('../../core/config.js');
    if (cfg?.API_BASE) _API_BASE = cfg.API_BASE;
} catch { /* config.js not yet created — fallback stays active */ }

/* ─────────────────────────────────────────────────────────────
   Badge renderer
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
        case 'PASS': case 'PASSED':         style = GREEN;  dot = '● '; break;
        case 'FAIL': case 'FAILED': case 'NG': style = RED; dot = '● '; break;
        case 'PENDING':                     style = ORANGE; dot = '○ '; break;
        case 'FINISHED PASS': case 'FINISH PASS': style = GREEN;  dot = '● '; break;
        case 'FINISHED FAIL': case 'FINISH FAIL': style = RED;    dot = '● '; break;
        case 'IN PROGRESS': case 'IN-PROGRESS':   style = BLUE;   dot = '● '; break;
        case 'DISPATCHED':                  style = GREEN;  dot = '● '; break;
        case 'READY TO DISPATCH':           style = BLUE;   dot = '● '; break;
        case 'FG PENDING':                  style = ORANGE; dot = '● '; break;
        case 'PROD': case 'IN PRODUCTION':  style = PURPLE; dot = '● '; break;
    }
    return `<span style="display:inline-flex;align-items:center;gap:3px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:0.3px;white-space:nowrap;${style}">${dot}${val}</span>`;
}

const Traceability = {

    render() {
        return `
        <style>
            .tr-page*,.tr-page *::before,.tr-page *::after{box-sizing:border-box}
            .tr-page{padding:var(--content-padding,24px);font-family:var(--font-family);animation:tr-fade .22s ease both}
            @keyframes tr-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
            .tr-header{margin-bottom:24px}
            .tr-header h1{font-size:var(--text-xl);font-weight:var(--weight-bold);color:var(--color-text-primary);margin:0 0 4px;line-height:1.25}
            .tr-header p{font-size:var(--text-sm);color:var(--color-text-secondary);margin:0}

            .tr-filter-card{background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);padding:20px 24px 14px;margin-bottom:16px}
            .tr-filter-eyebrow{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:700;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px}
            .tr-filter-grid{display:grid;grid-template-columns:2.2fr 1fr 1fr 1.1fr auto;gap:12px;align-items:end}
            @media(max-width:1080px){.tr-filter-grid{grid-template-columns:1fr 1fr 1fr}.tr-btn-col{grid-column:1/-1}}
            @media(max-width:640px){.tr-filter-grid{grid-template-columns:1fr}.tr-btn-col{grid-column:1}.tr-filter-card{padding:16px 16px 12px}}
            .tr-field{display:flex;flex-direction:column;gap:5px;min-width:0}
            .tr-label{font-size:11px;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.7px;white-space:nowrap}
            .tr-input-wrap{position:relative;display:flex;align-items:center}
            .tr-input-icon{position:absolute;left:10px;color:var(--color-text-tertiary);display:flex;align-items:center;pointer-events:none;z-index:1}
            .tr-ctrl{width:100%;height:40px;background:var(--color-bg-input);border:1.5px solid var(--color-border-input);border-radius:var(--radius-md);color:var(--color-text-primary);font-family:var(--font-family);font-size:var(--text-sm);padding:0 12px;outline:none;transition:border-color 140ms ease,box-shadow 140ms ease}
            .tr-ctrl:focus{border-color:var(--color-primary);box-shadow:0 0 0 3px var(--color-primary-surface)}
            .tr-ctrl::placeholder{color:var(--color-text-tertiary)}
            .tr-ctrl--icon{padding-left:34px}
            .tr-ctrl.tr-select{appearance:none;-webkit-appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='11' height='7' viewBox='0 0 11 7' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4.5 4.5L10 1' stroke='%238B90A0' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 11px center;padding-right:30px}
            .tr-search-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:40px;width:100%;padding:0 20px;background:var(--color-primary);color:#fff;border:none;border-radius:var(--radius-md);font-family:var(--font-family);font-size:var(--text-sm);font-weight:600;cursor:pointer;white-space:nowrap;box-shadow:0 1px 4px rgba(27,58,92,.18);transition:background 140ms ease,box-shadow 140ms ease,transform 100ms ease}
            .tr-search-btn:hover{background:var(--color-primary-light);box-shadow:0 3px 10px rgba(27,58,92,.24)}
            .tr-search-btn:active{transform:scale(.98)}
            .tr-clear-row{display:flex;justify-content:flex-end;margin-top:10px}
            .tr-clear-btn{background:none;border:none;font-family:var(--font-family);font-size:12px;color:var(--color-text-tertiary);cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:0;transition:color 140ms ease}
            .tr-clear-btn:hover{color:var(--color-text-primary)}

            .tr-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px}
            .tr-stat{background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:14px 18px;box-shadow:var(--shadow-sm)}
            .tr-stat-label{font-size:11px;font-weight:700;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:.7px;margin-bottom:4px}
            .tr-stat-value{font-size:22px;font-weight:700;color:var(--color-text-primary);line-height:1.2}
            .tr-stat-sub{font-size:11px;color:var(--color-text-tertiary);margin-top:2px}

            .tr-card{background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);overflow:hidden}
            .tr-card-header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--color-border-light);flex-wrap:wrap;gap:8px}
            .tr-card-title{font-size:11px;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:1px;margin:0}
            .tr-count{font-size:11px;font-weight:600;color:var(--color-text-tertiary);background:var(--color-bg-body);border:1px solid var(--color-border);border-radius:20px;padding:2px 10px}
            .tr-scroll{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
            .tr-table{width:100%;border-collapse:collapse;min-width:900px}
            .tr-table thead{background:var(--color-bg-table-header);position:sticky;top:0;z-index:2}
            .tr-table th{padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid var(--color-border);white-space:nowrap}
            .tr-table td{padding:11px 12px;font-size:var(--text-sm);color:var(--color-text-primary);border-bottom:1px solid var(--color-border-light);vertical-align:middle;white-space:nowrap}
            .tr-table tbody tr:last-child td{border-bottom:none}
            .tr-table tbody tr.tr-row{cursor:pointer;transition:background 120ms ease}
            .tr-table tbody tr.tr-row:hover td{background:var(--color-bg-table-row-hover)}
            .tr-table tbody tr.tr-row.tr-expanded td{background:var(--color-primary-surface);border-bottom-color:transparent}
            .tr-table tbody tr.tr-row.tr-selected td{background:#EFF6FF!important}

            /* Checkbox column */
            .tr-chk-cell{width:36px;text-align:center;padding:0 6px!important}
            .tr-chk{width:16px;height:16px;accent-color:var(--color-primary);cursor:pointer;vertical-align:middle}

            /* Expand button */
            .tr-expand-cell{width:40px;text-align:center;padding:0 8px!important}
            .tr-xbtn{width:26px;height:26px;border-radius:6px;border:1.5px solid var(--color-border);background:none;color:var(--color-text-secondary);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;transition:background 120ms ease,border-color 120ms ease,color 120ms ease,transform 200ms ease}
            .tr-xbtn:hover{background:var(--color-primary-surface);border-color:var(--color-primary);color:var(--color-primary)}
            .tr-xbtn.open{background:var(--color-primary);border-color:var(--color-primary);color:#fff;transform:rotate(90deg)}

            /* Detail row */
            .tr-det-row{display:none}
            .tr-det-row.show{display:table-row}
            .tr-det-row td{padding:0!important;background:var(--color-bg-body)!important;border-bottom:2px solid var(--color-border)!important}
            .tr-det-panel{padding:20px 24px;animation:tr-det-open .15s ease}
            @keyframes tr-det-open{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
            .tr-det-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:16px 24px;margin-bottom:16px}
            .tr-det-lbl{font-size:11px;font-weight:700;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px}
            .tr-det-val{font-size:var(--text-sm);font-weight:500;color:var(--color-text-primary)}
            .tr-cells{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;padding-top:14px;border-top:1px solid var(--color-border-light)}
            .tr-cells-ttl{width:100%;font-size:11px;font-weight:700;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px}
            .tr-cell-tag{background:var(--color-primary-surface);color:var(--color-primary);border:1px solid #C5D5E8;border-radius:20px;font-size:11px;font-weight:500;font-family:var(--font-mono);padding:2px 10px}
            .tr-dl-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:var(--color-primary);color:#fff;border:none;border-radius:var(--radius-md);font-family:var(--font-family);font-size:var(--text-sm);font-weight:600;cursor:pointer;transition:background 140ms ease}
            .tr-dl-btn:hover{background:var(--color-primary-light)}
            .tr-mono{font-family:var(--font-mono);font-size:12px;font-weight:500}

            /* Skeleton */
            @keyframes tr-shimmer{0%{background-position:-800px 0}100%{background-position:800px 0}}
            .tr-skel{display:inline-block;height:12px;border-radius:4px;background:linear-gradient(90deg,var(--color-border-light) 25%,var(--color-border) 50%,var(--color-border-light) 75%);background-size:1600px 100%;animation:tr-shimmer 1.4s ease-in-out infinite}

            /* Empty */
            .tr-empty{text-align:center;padding:52px 24px;color:var(--color-text-tertiary)}
            .tr-empty svg{opacity:.22;margin-bottom:14px}
            .tr-empty-ttl{font-size:var(--text-base);font-weight:600;color:var(--color-text-secondary);margin:0 0 4px}
            .tr-empty-sub{font-size:var(--text-sm);margin:0}
            .tr-pag{padding:14px 20px;border-top:1px solid var(--color-border-light)}

            /* ── Selection toolbar ── */
            .tr-sel-bar{
                position:fixed;bottom:28px;left:50%;
                transform:translateX(-50%) translateY(12px);
                z-index:100;
                display:flex;align-items:center;gap:16px;
                background:#1B3A5C;color:#fff;
                border-radius:14px;padding:12px 20px;
                box-shadow:0 8px 32px rgba(0,0,0,.28);
                opacity:0;pointer-events:none;
                transition:opacity 180ms ease,transform 180ms ease;
            }
            .tr-sel-bar.visible{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0)}
            .tr-sel-bar-label{font-size:13px;font-weight:600;white-space:nowrap}
            .tr-sel-bar-label strong{font-size:16px;font-weight:700;margin-right:4px}
            .tr-sel-dl-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 18px;background:#fff;color:#1B3A5C;border:none;border-radius:8px;font-family:var(--font-family);font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;transition:background 120ms ease,transform 100ms ease}
            .tr-sel-dl-btn:hover{background:#EFF6FF}
            .tr-sel-dl-btn:active{transform:scale(.97)}
            .tr-sel-dl-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
            .tr-sel-clear-btn{background:none;border:none;color:rgba(255,255,255,.65);cursor:pointer;font-size:12px;font-family:var(--font-family);padding:0;transition:color 120ms ease}
            .tr-sel-clear-btn:hover{color:#fff}
            .tr-dl-progress{font-size:12px;color:rgba(255,255,255,.75);white-space:nowrap}
        </style>

        <div class="tr-page">
            <div class="tr-header">
                <h1>Battery Traceability</h1>
                <p>Full manufacturing history and component trace for every battery pack</p>
            </div>

            <div class="tr-filter-card">
                <div class="tr-filter-eyebrow">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                    Search &amp; Filter
                </div>
                <div class="tr-filter-grid">
                    <div class="tr-field">
                        <label class="tr-label" for="tr-bid">Battery ID</label>
                        <div class="tr-input-wrap">
                            <span class="tr-input-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 2v2m4-2v2M10 20v2m4-2v2M6 8h12M6 16h12"/></svg>
                            </span>
                            <input type="text" id="tr-bid" class="tr-ctrl tr-ctrl--icon" placeholder="Scan or type Battery ID…" autocomplete="off" spellcheck="false"/>
                        </div>
                    </div>
                    <div class="tr-field">
                        <label class="tr-label" for="tr-dfrom">From Date</label>
                        <input type="date" id="tr-dfrom" class="tr-ctrl"/>
                    </div>
                    <div class="tr-field">
                        <label class="tr-label" for="tr-dto">To Date</label>
                        <input type="date" id="tr-dto" class="tr-ctrl"/>
                    </div>
                    <div class="tr-field">
                        <label class="tr-label" for="tr-status">Status</label>
                        <select id="tr-status" class="tr-ctrl tr-select">
                            <option value="">All Statuses</option>
                            <option value="PROD">PROD — In Production</option>
                            <option value="FG PENDING">FG Pending — Awaiting FG</option>
                            <option value="READY TO DISPATCH">Ready to Dispatch</option>
                            <option value="DISPATCHED">Dispatched</option>
                            <option value="failed">Failed (NG)</option>
                        </select>
                    </div>
                    <div class="tr-field tr-btn-col">
                        <label class="tr-label" style="visibility:hidden" aria-hidden="true">Search</label>
                        <button id="tr-search" class="tr-search-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                            Search
                        </button>
                    </div>
                </div>
                <div class="tr-clear-row">
                    <button class="tr-clear-btn" id="tr-clear">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                        Clear filters
                    </button>
                </div>
            </div>

            <div id="tr-stats"></div>

            <div class="tr-card">
                <div class="tr-card-header">
                    <p class="tr-card-title">Results</p>
                    <span class="tr-count" id="tr-count">—</span>
                </div>
                <div class="tr-scroll">
                    <div id="tr-results">${_emptyHtml('Enter a Battery ID or apply filters to search')}</div>
                </div>
                <div class="tr-pag" id="tr-pag"></div>
            </div>
        </div>

        <!-- Selection toolbar -->
        <div class="tr-sel-bar" id="tr-sel-bar" role="status" aria-live="polite">
            <div class="tr-sel-bar-label"><strong id="tr-sel-count">0</strong> selected</div>
            <span class="tr-dl-progress" id="tr-dl-progress" style="display:none"></span>
            <button class="tr-sel-dl-btn" id="tr-sel-dl-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Selected
            </button>
            <button class="tr-sel-clear-btn" id="tr-sel-clear-btn" title="Clear selection">✕ Clear</button>
        </div>`;
    },

    init() {
        let page = 1;

        // Persists across pagination pages
        const selectedIds = new Set();

        const bid    = () => document.getElementById('tr-bid').value.trim();
        const dfrom  = () => _nd(document.getElementById('tr-dfrom').value);
        const dto    = () => _nd(document.getElementById('tr-dto').value);
        const status = () => document.getElementById('tr-status').value;

        const selBar      = document.getElementById('tr-sel-bar');
        const selCount    = document.getElementById('tr-sel-count');
        const selDlBtn    = document.getElementById('tr-sel-dl-btn');
        const selClearBtn = document.getElementById('tr-sel-clear-btn');
        const dlProgress  = document.getElementById('tr-dl-progress');

        function _syncToolbar() {
            selCount.textContent = selectedIds.size;
            selBar.classList.toggle('visible', selectedIds.size > 0);
        }

        selClearBtn.addEventListener('click', () => {
            selectedIds.clear();
            document.querySelectorAll('.tr-row-chk').forEach(cb => cb.checked = false);
            document.querySelectorAll('.tr-row').forEach(r => r.classList.remove('tr-selected'));
            const a = document.getElementById('tr-chk-all');
            if (a) { a.checked = false; a.indeterminate = false; }
            _syncToolbar();
        });

        selDlBtn.addEventListener('click', async () => {
            if (!selectedIds.size) return;
            await _downloadMultiple([...selectedIds]);
        });

        _go(1);

        document.getElementById('tr-search').addEventListener('click', () => { page = 1; _go(1); });
        document.getElementById('tr-bid').addEventListener('keydown', e => { if (e.key === 'Enter') { page = 1; _go(1); } });
        document.getElementById('tr-clear').addEventListener('click', () => {
            ['tr-bid','tr-dfrom','tr-dto','tr-status'].forEach(id => { document.getElementById(id).value = ''; });
            page = 1; _go(1);
        });

        // Sequential download with live progress
        async function _downloadMultiple(ids) {
            selDlBtn.disabled = true;
            dlProgress.style.display = 'inline';
            let done = 0;
            for (const id of ids) {
                dlProgress.textContent = `Downloading ${done + 1} / ${ids.length}…`;
                await _downloadOne(id);
                done++;
            }
            dlProgress.style.display = 'none';
            dlProgress.textContent   = '';
            selDlBtn.disabled        = false;
        }

        function _downloadOne(batteryId) {
            return fetch(
                `${_API_BASE}/reports/generate-full-audit/${encodeURIComponent(batteryId)}`,
                { method: 'GET', headers: { accept: 'application/json' } }
            )
            .then(res => {
                if (!res.ok) throw new Error('Failed');
                const disp = res.headers.get('content-disposition');
                let fn = `BatteryReport_${batteryId}.xlsx`;
                if (disp?.includes('filename=')) fn = disp.split('filename=')[1].replace(/"/g, '');
                return res.blob().then(blob => ({ blob, fn }));
            })
            .then(({ blob, fn }) => {
                const url = URL.createObjectURL(blob);
                const a   = Object.assign(document.createElement('a'), { href: url, download: fn });
                document.body.appendChild(a); a.click(); a.remove();
                URL.revokeObjectURL(url);
            })
            .catch(() => console.warn(`Failed to download report for ${batteryId}`));
        }

        // Expose for the inline "Download Report" button in detail panels
        window._trDownloadOne = _downloadOne;

        async function _go(p) {
            _skeleton();
            const params = {};
            const id = bid();
            if (id) {
                params.battery_id = id;
                if (status()) params.status = status();
            } else {
                params.page = p; params.page_size = 15;
                if (dfrom())  params.date_from = dfrom();
                if (dto())    params.date_to   = dto();
                if (status()) params.status    = status();
            }

            const res = await API.get('/admin/traceability', params);

            if (res?.success && res.data) {
                let items = [], pag = null;
                if (Array.isArray(res.data))             { items = res.data; }
                else if (Array.isArray(res.data.items))  { items = res.data.items; pag = res.data; }
                else if (typeof res.data === 'object')   { items = [res.data]; }

                items.sort((a, b) =>
                    new Date(b.created_at || b.createdAt || 0) -
                    new Date(a.created_at || a.createdAt || 0)
                );
                _stats(items, pag);
                _table(items);
                _count(items.length, pag);
                if (!id && pag) _pag(pag, p);
                else document.getElementById('tr-pag').innerHTML = '';
            } else {
                _stats([], null);
                document.getElementById('tr-results').innerHTML = _emptyHtml('No records found for the given criteria.');
                _count(0, null);
                document.getElementById('tr-pag').innerHTML = '';
            }
        }

        function _stats(items, pag) {
            const el = document.getElementById('tr-stats');
            if (!el) return;
            if (!items?.length) { el.innerHTML = ''; return; }
            const total      = pag ? (pag.total_items || items.length) : items.length;
            const dispatched = items.filter(i => i.status?.toUpperCase() === 'DISPATCHED').length;
            const pdiPass    = items.filter(i => ['FINISHED PASS','FINISH PASS','PASS','PASSED'].includes(i.pdi_result?.toUpperCase())).length;
            const failed     = items.filter(i => ['FAILED','NG'].includes(i.status?.toUpperCase())).length;
            el.innerHTML = `<div class="tr-stats" style="margin-bottom:16px;">
                ${_sc('Total Records', total.toLocaleString(), 'in view')}
                ${_sc('Dispatched',    dispatched, 'completed',         'var(--color-success)')}
                ${_sc('PDI Passed',    pdiPass,    'inspections',       'var(--color-info,#1565C0)')}
                ${_sc('Failed',        failed,     'require attention', 'var(--color-error)')}
            </div>`;
        }

        function _sc(label, val, sub, color = '') {
            return `<div class="tr-stat">
                <div class="tr-stat-label">${label}</div>
                <div class="tr-stat-value"${color ? ` style="color:${color}"` : ''}>${val}</div>
                <div class="tr-stat-sub">${sub}</div>
            </div>`;
        }

        function _table(items) {
            const el = document.getElementById('tr-results');
            if (!items?.length) { el.innerHTML = _emptyHtml('No traceability records found.'); return; }

            const rows = items.map((row, i) => {
                const rid     = `tr-r${i}`;
                const checked = selectedIds.has(row.battery_id) ? 'checked' : '';
                return `
                    <tr class="tr-row${checked ? ' tr-selected' : ''}" id="${rid}">
                        <td class="tr-chk-cell" onclick="event.stopPropagation()">
                            <input type="checkbox" class="tr-chk tr-row-chk"
                                data-id="${row.battery_id}" data-rid="${rid}" ${checked}
                                title="Select for bulk download"/>
                        </td>
                        <td class="tr-expand-cell">
                            <button class="tr-xbtn" data-rid="${rid}" title="Expand">
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                            </button>
                        </td>
                        <td><span class="tr-mono">${row.battery_id || '—'}</span></td>
                        <td>${row.model || '—'}</td>
                        <td><span class="tr-mono">${row.bms_id || '—'}</span></td>
                        <td>${_badge(row.pack_test_result)}</td>
                        <td>${_badge(row.pdi_result)}</td>
                        <td>${_badge(row.status)}</td>
                        <td style="color:var(--color-text-secondary);font-size:12px">${_fd(row.created_at)}</td>
                        <td style="color:var(--color-text-secondary)">${row.dispatch_destination || '—'}</td>
                    </tr>
                    <tr class="tr-det-row" id="${rid}-d">
                        <td colspan="10"><div class="tr-det-panel">${_det(row)}</div></td>
                    </tr>`;
            }).join('');

            const allOnPage  = items.every(r => selectedIds.has(r.battery_id));
            const someOnPage = items.some(r => selectedIds.has(r.battery_id));

            el.innerHTML = `
                <table class="tr-table">
                    <thead><tr>
                        <th class="tr-chk-cell">
                            <input type="checkbox" id="tr-chk-all" class="tr-chk"
                                title="Select/deselect all on this page" ${allOnPage ? 'checked' : ''}/>
                        </th>
                        <th style="width:40px"></th>
                        <th>Battery ID</th><th>Model</th><th>BMS ID</th>
                        <th>Testing</th><th>PDI</th><th>Status</th>
                        <th>Created At</th><th>Customer</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>`;

            const allChk = document.getElementById('tr-chk-all');
            if (allChk && someOnPage && !allOnPage) allChk.indeterminate = true;

            allChk?.addEventListener('change', () => {
                allChk.indeterminate = false;
                el.querySelectorAll('.tr-row-chk').forEach(cb => {
                    cb.checked = allChk.checked;
                    const row = document.getElementById(cb.dataset.rid);
                    if (allChk.checked) { selectedIds.add(cb.dataset.id);    row?.classList.add('tr-selected'); }
                    else                { selectedIds.delete(cb.dataset.id); row?.classList.remove('tr-selected'); }
                });
                _syncToolbar();
            });

            el.querySelectorAll('.tr-row-chk').forEach(cb => {
                cb.addEventListener('change', () => {
                    const row = document.getElementById(cb.dataset.rid);
                    if (cb.checked) { selectedIds.add(cb.dataset.id);    row?.classList.add('tr-selected'); }
                    else            { selectedIds.delete(cb.dataset.id); row?.classList.remove('tr-selected'); }
                    const all = [...el.querySelectorAll('.tr-row-chk')];
                    if (allChk) { allChk.checked = all.every(c => c.checked); allChk.indeterminate = all.some(c => c.checked) && !allChk.checked; }
                    _syncToolbar();
                });
            });

            el.querySelectorAll('.tr-xbtn').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    const rid    = btn.dataset.rid;
                    const isOpen = btn.classList.contains('open');
                    el.querySelectorAll('.tr-xbtn.open').forEach(b => {
                        if (b === btn) return;
                        b.classList.remove('open');
                        document.getElementById(b.dataset.rid)?.classList.remove('tr-expanded');
                        document.getElementById(`${b.dataset.rid}-d`)?.classList.remove('show');
                    });
                    btn.classList.toggle('open', !isOpen);
                    document.getElementById(rid)?.classList.toggle('tr-expanded', !isOpen);
                    document.getElementById(`${rid}-d`)?.classList.toggle('show', !isOpen);
                });
            });

            el.querySelectorAll('.tr-row').forEach(r => {
                r.addEventListener('click', e => {
                    if (!e.target.closest('.tr-xbtn') && !e.target.closest('.tr-chk-cell'))
                        r.querySelector('.tr-xbtn').click();
                });
            });
        }

        function _det(row) {
            const cells = row.cells || [];
            return `
                <div class="tr-det-grid">
                    ${_di('Battery ID',     row.battery_id,                        true)}
                    ${_di('Model',          row.model)}
                    ${_di('BMS ID',         row.bms_id,                            true)}
                    ${_di('Assembled On',   _fd(row.assembled_at))}
                    ${_di('Testing Result', _badge(row.pack_test_result), false, true)}
                    ${_di('PDI Result',     _badge(row.pdi_result),       false, true)}
                    ${_di('Status',         _badge(row.status),           false, true)}
                    ${_di('Customer',       row.dispatch_destination)}
                    ${_di('Dispatched At',  _fd(row.dispatched_at))}
                    ${_di('Created At',     _fd(row.created_at))}
                </div>
                ${cells.length ? `<div class="tr-cells"><div class="tr-cells-ttl">Mapped Cells (${cells.length})</div>${cells.map(c=>`<span class="tr-cell-tag">${c}</span>`).join('')}</div>` : ''}
                <div style="display:flex;justify-content:flex-end;margin-top:16px">
                    <button class="tr-dl-btn" onclick="window._trDownloadOne&&window._trDownloadOne('${row.battery_id}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Download Report
                    </button>
                </div>`;
        }

        function _di(label, val, mono = false, isHtml = false) {
            const display = (val == null || val === '') ? '—' : val;
            const inner   = isHtml ? display : mono ? `<span class="tr-mono">${display}</span>` : display;
            return `<div><div class="tr-det-lbl">${label}</div><div class="tr-det-val">${inner}</div></div>`;
        }

        function _pag(data, p) {
            const el = document.getElementById('tr-pag');
            el.innerHTML = Pagination.render({ currentPage: p, totalPages: data.total_pages || 1, totalItems: data.total_items || 0, pageSize: 15, containerId: 'tr-pag-ctrl' });
            Pagination.init('tr-pag-ctrl', np => { page = np; _go(np); document.querySelector('.tr-page')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
        }

        function _count(n, pag) {
            const el = document.getElementById('tr-count');
            if (!el) return;
            const total = pag ? (pag.total_items || n) : n;
            el.textContent = total > 0 ? `${total.toLocaleString()} record${total !== 1 ? 's' : ''}` : 'No records';
        }

        function _skeleton() {
            const el = document.getElementById('tr-results');
            const sk = ws => `<tr>${ws.map(w=>`<td><span class="tr-skel" style="width:${w}"></span></td>`).join('')}</tr>`;
            el.innerHTML = `<table class="tr-table"><thead><tr>
                <th class="tr-chk-cell"></th><th style="width:40px"></th>
                <th>Battery ID</th><th>Model</th><th>BMS ID</th>
                <th>Testing</th><th>PDI</th><th>Status</th><th>Created At</th><th>Customer</th>
            </tr></thead><tbody>
                ${sk(['16px','24px','88px','68px','82px','58px','58px','74px','108px','110px'])}
                ${sk(['16px','24px','72px','78px','90px','58px','58px','68px','108px','90px'])}
                ${sk(['16px','24px','96px','60px','76px','58px','58px','88px','108px','120px'])}
                ${sk(['16px','24px','80px','74px','84px','58px','58px','76px','108px','100px'])}
            </tbody></table>`;
        }

        function _nd(s) {
            if (!s) return '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
            const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
            if (m) return `${m[3]}-${m[2]}-${m[1]}`;
            const d = new Date(s);
            if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            return s;
        }

        function _fd(v) {
            if (!v) return '—';
            const d = new Date(v);
            if (isNaN(d)) return v;
            return d.toLocaleString(undefined, { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
        }

        return null;
    }
};

function _emptyHtml(msg) {
    return `<div class="tr-empty">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <p class="tr-empty-ttl">No results</p>
        <p class="tr-empty-sub">${msg}</p>
    </div>`;
}

export default Traceability;