/**
 * search.js — Admin Search Page
 * 
 * Unified search by Battery ID, Cell ID, or BMS ID.
 * Displays results in a structured table with traceability links.
 * 
 * API: GET /api/v1/admin/search?q=...&type=...
 */

import API from '../../core/api.js';
import Table from '../../components/table.js';
import StatusBadge from '../../components/statusBadge.js';

const AdminSearch = {
    render() {
        return `
            <div class="content__inner">
                <div class="page-header">
                    <h1 class="page-header__title">Search</h1>
                    <p class="page-header__subtitle">Find any battery, cell, or BMS unit by ID</p>
                </div>

                <!-- Search Hero -->
                <div class="search-hero">
                    <h2 class="search-hero__title">Search Manufacturing Records</h2>
                    <div class="search-hero__form">
                        <input
                            type="text"
                            id="search-input"
                            class="search-hero__input"
                            placeholder="Enter Battery ID, Cell ID, or BMS ID..."
                            autofocus
                        >
                        <button id="btn-search" class="btn btn--primary btn--lg">
                            Search
                        </button>
                    </div>
                    <div style="margin-top:16px; display:flex; justify-content:center; gap:12px;">
                        <label style="font-size:var(--text-sm); color:var(--color-text-secondary); display:flex; align-items:center; gap:4px;">
                            <input type="radio" name="search-type" value="all" checked> All
                        </label>
                        <label style="font-size:var(--text-sm); color:var(--color-text-secondary); display:flex; align-items:center; gap:4px;">
                            <input type="radio" name="search-type" value="battery"> Battery ID
                        </label>
                        <label style="font-size:var(--text-sm); color:var(--color-text-secondary); display:flex; align-items:center; gap:4px;">
                            <input type="radio" name="search-type" value="cell"> Cell ID
                        </label>
                        <label style="font-size:var(--text-sm); color:var(--color-text-secondary); display:flex; align-items:center; gap:4px;">
                            <input type="radio" name="search-type" value="bms"> BMS ID
                        </label>
                    </div>
                </div>

                <!-- Search Results -->
                <div id="search-results" style="display:none;"></div>
            </div>
        `;
    },

    init() {
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('btn-search');
        const resultsEl = document.getElementById('search-results');

        searchBtn.addEventListener('click', _doSearch);
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') _doSearch();
        });

        async function _doSearch() {
            const query = searchInput.value.trim();
            if (!query) {
                searchInput.focus();
                return;
            }

            const type = document.querySelector('input[name="search-type"]:checked')?.value || 'all';

            searchBtn.disabled = true;
            searchBtn.innerHTML = '<span class="btn__spinner"></span>';

            const result = await API.get('/admin/search', { q: query, type });

            searchBtn.disabled = false;
            searchBtn.textContent = 'Search';

            resultsEl.style.display = 'block';

            if (result.success && result.data) {
                const items = result.data.results || [];
                if (items.length === 0) {
                    resultsEl.innerHTML = `
                        <div class="card">
                            <div class="card__body text-center">
                                <div style="font-size:48px;opacity:0.3;margin-bottom:16px;">🔍</div>
                                <h3 style="margin-bottom:8px;">No Results Found</h3>
                                <p class="text-muted">No records match "<strong>${_esc(query)}</strong>". Try a different ID or search type.</p>
                            </div>
                        </div>
                    `;
                    return;
                }

                // Determine type of results for optimal table
                const resultType = result.data.result_type || 'mixed';

                if (resultType === 'battery' || resultType === 'mixed') {
                    resultsEl.innerHTML = `
                        <div style="margin-bottom:16px;">
                            <span class="fw-semibold">${items.length}</span>
                            <span class="text-muted">result${items.length !== 1 ? 's' : ''} found for "</span>
                            <span class="fw-semibold text-mono">${_esc(query)}</span>
                            <span class="text-muted">"</span>
                        </div>
                        ${Table.render({
                            columns: [
                                { key: 'id', label: 'ID', render: (v) => `<span class="text-mono fw-semibold">${v}</span>` },
                                { key: 'type', label: 'Type', render: (v) => `<span class="badge badge--info">${v}</span>` },
                                { key: 'model', label: 'Model' },
                                { key: 'current_stage', label: 'Current Stage' },
                                { key: 'status', label: 'Status', render: (v) => StatusBadge.render(v) },
                                { key: 'related_to', label: 'Related To', render: (v) => v ? `<span class="text-mono text-sm">${v}</span>` : '—' },
                                { key: 'last_updated', label: 'Last Updated' }
                            ],
                            rows: items,
                            expandable: true,
                            expandRender: (row) => `
                                <div class="detail-panel">
                                    <div class="detail-panel__item">
                                        <div class="detail-panel__label">ID</div>
                                        <div class="detail-panel__value">${row.id || '—'}</div>
                                    </div>
                                    <div class="detail-panel__item">
                                        <div class="detail-panel__label">Type</div>
                                        <div class="detail-panel__value">${row.type || '—'}</div>
                                    </div>
                                    <div class="detail-panel__item">
                                        <div class="detail-panel__label">Model</div>
                                        <div class="detail-panel__value">${row.model || '—'}</div>
                                    </div>
                                    <div class="detail-panel__item">
                                        <div class="detail-panel__label">Current Stage</div>
                                        <div class="detail-panel__value">${row.current_stage || '—'}</div>
                                    </div>
                                    <div class="detail-panel__item">
                                        <div class="detail-panel__label">Status</div>
                                        <div class="detail-panel__value">${StatusBadge.render(row.status)}</div>
                                    </div>
                                    <div class="detail-panel__item">
                                        <div class="detail-panel__label">Related To</div>
                                        <div class="detail-panel__value">${row.related_to || '—'}</div>
                                    </div>
                                    ${row.notes ? `
                                        <div class="detail-panel__item" style="grid-column: 1/-1;">
                                            <div class="detail-panel__label">Notes</div>
                                            <div class="detail-panel__value" style="font-family:var(--font-family)">${row.notes}</div>
                                        </div>
                                    ` : ''}
                                </div>
                            `
                        })}
                    `;

                    Table.initExpandable(resultsEl);
                }
            } else {
                resultsEl.innerHTML = `
                    <div class="confirmation confirmation--error">
                        <div class="confirmation__icon">✕</div>
                        <div class="confirmation__title">Search Failed</div>
                        <div class="confirmation__detail">An error occurred while searching. Please try again.</div>
                    </div>
                `;
            }
        }

        return null;
    }
};

function _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

export default AdminSearch;
