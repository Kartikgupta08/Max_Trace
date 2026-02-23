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

                <div class="trace-hint" style="margin:8px 0 18px 0;color:var(--color-text-secondary);font-size:14px;">
                </div>

                <!-- Search / Filter (Battery ID + Date) -->
                <div class="filter-bar">
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">Battery ID</label>
                                                <div style="position: relative; width: 100%;">
                                                        <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); display: flex; align-items: center; height: 100%; pointer-events: none;">
                                                                <!-- Medium, Centered Battery SVG Icon -->
                                                                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                    <rect x="5" y="4" width="12" height="14" rx="2" fill="url(#battery-gradient)" stroke="#888" stroke-width="1.2"/>
                                                                    <rect x="9" y="2.5" width="4" height="2" rx="1" fill="#B0BEC5" stroke="#888" stroke-width="0.7"/>
                                                                    <rect x="10.25" y="8.5" width="1.5" height="4" rx="0.75" fill="#fff"/>
                                                                    <rect x="10.25" y="14" width="1.5" height="1.5" rx="0.75" fill="#fff"/>
                                                                    <defs>
                                                                        <linearGradient id="battery-gradient" x1="5" y1="4" x2="17" y2="18" gradientUnits="userSpaceOnUse">
                                                                            <stop stop-color="#B9F6CA"/>
                                                                            <stop offset="1" stop-color="#B2EBF2"/>
                                                                        </linearGradient>
                                                                    </defs>
                                                                </svg>
                                                        </span>
                                                        <input type="text" id="trace-battery-id" class="filter-bar__input" placeholder="Scan or Type Battery ID" style="padding-left: 38px; height: 44px; font-size: 1.08em;" />
                                                </div>
                    </div>
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">Date From</label>
                        <input type="date" id="trace-date-from" class="filter-bar__input">
                    </div>
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">To</label>
                        <input type="date" id="trace-date-to" class="filter-bar__input">
                    </div>
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">Status</label>
                        <select id="trace-status-filter" class="filter-bar__input form-select">
                            <option value="">All Statuses</option>
                            <option value="registered">Registered</option>
                            <option value="testing">Testing</option>
                            <option value="tested">Tested</option>
                            <option value="pdi">PDI</option>
                            <option value="dispatched">Dispatched</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                    <button id="btn-trace-search" class="btn btn--primary">Search</button>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 2v8m0 0l4-4m-4 4l-4-4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <rect x="3" y="16" width="14" height="2" rx="1" fill="#fff"/>
                      </svg>
                    </button>
                </div>

                <!-- Stats area -->
                <div id="trace-stats" style="margin-top:6px;margin-bottom:10px;"></div>

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
        const searchBtn = document.getElementById('btn-trace-search');
        const batteryInput = document.getElementById('trace-battery-id');
        const statusInput = document.getElementById('trace-status-filter');
        let currentPage = 1;

        searchBtn.addEventListener('click', () => {
            currentPage = 1;
            _fetchTraceData(currentPage);
        });
        

        // Allow Enter key to trigger search when typing battery id
        batteryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                currentPage = 1;
                _fetchTraceData(currentPage);
            }
        });

        // Create a modern custom dropdown that mirrors the native select
        if (statusInput) createModernDropdown(statusInput);

        function createModernDropdown(nativeSelect) {
            // hide the native select but keep it for form integration
            nativeSelect.classList.add('modern-dropdown-hidden-native');

            const wrapper = document.createElement('div');
            wrapper.className = 'modern-dropdown';
            wrapper.setAttribute('role', 'combobox');
            wrapper.setAttribute('aria-expanded', 'false');

            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'modern-dropdown__trigger';
            trigger.setAttribute('aria-haspopup', 'listbox');

            const label = document.createElement('span');
            label.className = 'modern-dropdown__label';
            const selectedOption = nativeSelect.options[nativeSelect.selectedIndex];
            label.textContent = selectedOption ? selectedOption.text : 'All Statuses';

            const arrow = document.createElement('span');
            arrow.className = 'modern-dropdown__arrow';
            arrow.innerHTML = '<svg width="16" height="10" viewBox="0 0 20 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 3.5L10 11L18 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

            trigger.appendChild(label);
            trigger.appendChild(arrow);

            const panel = document.createElement('div');
            panel.className = 'modern-dropdown__panel';
            panel.setAttribute('role', 'listbox');
            panel.setAttribute('tabindex', '-1');

            const list = document.createElement('div');
            list.className = 'modern-dropdown__list';

            const options = Array.from(nativeSelect.options).map((opt, idx) => {
                const o = document.createElement('div');
                o.className = 'modern-dropdown__option' + (opt.disabled ? ' disabled' : '');
                if (opt.selected) o.classList.add('selected');
                o.setAttribute('data-value', opt.value);
                o.setAttribute('data-index', String(idx));
                o.setAttribute('role', 'option');
                o.textContent = opt.text;
                list.appendChild(o);
                return o;
            });

            panel.appendChild(list);
            wrapper.appendChild(trigger);
            // insert wrapper (trigger) next to native select; panel will be appended to body
            nativeSelect.parentNode.insertBefore(wrapper, nativeSelect.nextSibling);
            document.body.appendChild(panel);

            let open = false;
            let activeIndex = nativeSelect.selectedIndex >= 0 ? nativeSelect.selectedIndex : 0;

            function positionPanel() {
                const rect = trigger.getBoundingClientRect();
                const top = rect.bottom + window.scrollY + 8;
                const left = rect.left + window.scrollX;
                panel.style.position = 'absolute';
                panel.style.top = `${top}px`;
                panel.style.left = `${left}px`;
                panel.style.minWidth = `${rect.width}px`;
                panel.style.zIndex = 2000;
            }

            function openPanel() {
                wrapper.classList.add('open');
                wrapper.setAttribute('aria-expanded', 'true');
                // make panel visible (panel is appended to body so CSS selector won't toggle it)
                panel.style.display = 'block';
                panel.style.opacity = '1';
                panel.style.transform = 'translateY(0)';
                panel.style.pointerEvents = 'auto';
                positionPanel();
                open = true;
                // ensure active visible
                updateActive();
                document.addEventListener('click', onDocClick);
                window.addEventListener('resize', positionPanel);
                window.addEventListener('scroll', positionPanel, true);
            }

            function closePanel() {
                wrapper.classList.remove('open');
                wrapper.setAttribute('aria-expanded', 'false');
                // animate hide then remove display to avoid abrupt jump
                panel.style.opacity = '0';
                panel.style.transform = 'translateY(-8px)';
                panel.style.pointerEvents = 'none';
                setTimeout(() => { if (!open) panel.style.display = 'none'; }, 220);
                open = false;
                document.removeEventListener('click', onDocClick);
                window.removeEventListener('resize', positionPanel);
                window.removeEventListener('scroll', positionPanel, true);
            }

            function onDocClick(e) { if (!wrapper.contains(e.target) && !panel.contains(e.target)) closePanel(); }

            function updateActive() {
                options.forEach((o, i) => {
                    o.classList.toggle('selected', i === activeIndex);
                    o.setAttribute('aria-selected', String(i === activeIndex));
                    if (i === activeIndex) {
                        // ensure option is visible inside the panel without scrolling the page
                        if (list && list.scrollHeight > list.clientHeight) {
                            list.scrollTop = Math.max(0, o.offsetTop - Math.round(list.clientHeight / 2) + Math.round(o.clientHeight / 2));
                        }
                    }
                });
                const sel = nativeSelect.options[activeIndex];
                if (sel) label.textContent = sel.text;
            }

            // click handlers for options
            options.forEach((o, idx) => {
                if (o.classList.contains('disabled')) return;
                o.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    activeIndex = idx;
                    const sel = nativeSelect.options[activeIndex];
                    if (sel) {
                        nativeSelect.selectedIndex = activeIndex;
                        nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    updateActive();
                    closePanel();
                });
            });

            // keyboard navigation
            trigger.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); openPanel(); activeIndex = Math.min(activeIndex + 1, options.length - 1); updateActive(); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); openPanel(); activeIndex = Math.max(activeIndex - 1, 0); updateActive(); }
                else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!open) openPanel(); else { nativeSelect.selectedIndex = activeIndex; nativeSelect.dispatchEvent(new Event('change', { bubbles: true })); closePanel(); } }
                else if (e.key === 'Escape') { if (open) { e.preventDefault(); closePanel(); } }
            });

            // also support key navigation when panel focused
            panel.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, options.length - 1); updateActive(); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); updateActive(); }
                else if (e.key === 'Enter') { e.preventDefault(); nativeSelect.selectedIndex = activeIndex; nativeSelect.dispatchEvent(new Event('change', { bubbles: true })); closePanel(); }
                else if (e.key === 'Escape') { e.preventDefault(); closePanel(); }
            });

            trigger.addEventListener('click', (e) => { e.stopPropagation(); if (!open) openPanel(); else closePanel(); });

            // keep native select changes in sync (if changed elsewhere)
            nativeSelect.addEventListener('change', () => {
                activeIndex = nativeSelect.selectedIndex >= 0 ? nativeSelect.selectedIndex : 0;
                updateActive();
            });

            // initial state
            panel.style.display = 'none';
            updateActive();
        }

        // Custom datepicker popup attached to the date inputs (from / to)
        const dateFromInput = document.getElementById('trace-date-from');
        const dateToInput = document.getElementById('trace-date-to');
        let activeDateInput = null;
        let datepickerEl = null;
        let dpState = { year: null, month: null, selected: null };

        function formatISO(y, m, d) {
            const mm = String(m).padStart(2,'0');
            const dd = String(d).padStart(2,'0');
            return `${y}-${mm}-${dd}`;
        }

        const _MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

        function openDatepicker() {
            if (!activeDateInput) return;
            if (datepickerEl) return;
            datepickerEl = document.createElement('div');
            datepickerEl.className = 'datepicker-popup';

            // initialize state based on current active input or today
            const current = activeDateInput.value ? new Date(activeDateInput.value) : new Date();
            dpState.year = current.getFullYear();
            dpState.month = current.getMonth();
            dpState.selected = activeDateInput.value || '';

            const monthLabel = `${_MONTH_NAMES[dpState.month]} ${dpState.year}`;
            datepickerEl.innerHTML = `
                <div class="datepicker-header">
                    <div>
                        <div class="datepicker-month">${monthLabel}</div>
                    </div>
                    <div class="datepicker-nav">
                        <button class="datepicker-btn" data-action="prev" aria-label="Previous month">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                        </button>
                        <button class="datepicker-btn" data-action="next" aria-label="Next month">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
                        </button>
                    </div>
                </div>
                <div class="datepicker-grid" id="dp-grid"></div>
                <div class="datepicker-footer">
                    <div class="datepicker-action" id="dp-clear">Clear</div>
                    <div style="display:flex;gap:12px;"><div class="datepicker-action" id="dp-today">Today</div></div>
                </div>
            `;

            document.body.appendChild(datepickerEl);
            positionDatepicker();
            renderCalendar(dpState.year, dpState.month);

            // events
            datepickerEl.querySelector('[data-action="prev"]').addEventListener('click', () => {
                dpState.month -= 1;
                if (dpState.month < 0) { dpState.month = 11; dpState.year -= 1; }
                renderCalendar(dpState.year, dpState.month);
            });
            datepickerEl.querySelector('[data-action="next"]').addEventListener('click', () => {
                dpState.month += 1;
                if (dpState.month > 11) { dpState.month = 0; dpState.year += 1; }
                renderCalendar(dpState.year, dpState.month);
            });

            datepickerEl.querySelector('#dp-clear').addEventListener('click', () => {
                if (activeDateInput) activeDateInput.value = '';
                closeDatepicker();
            });
            datepickerEl.querySelector('#dp-today').addEventListener('click', () => {
                const t = new Date();
                if (activeDateInput) activeDateInput.value = formatISO(t.getFullYear(), t.getMonth()+1, t.getDate());
                closeDatepicker();
            });

            // outside click to close
            setTimeout(() => { // allow this handler to be set after element is added
                window.addEventListener('click', outsideClickHandler);
            }, 0);
        }

        function positionDatepicker() {
            if (!activeDateInput || !datepickerEl) return;
            const rect = activeDateInput.getBoundingClientRect();
            const top = rect.bottom + window.scrollY + 8;
            const left = rect.left + window.scrollX;
            datepickerEl.style.top = `${top}px`;
            datepickerEl.style.left = `${left}px`;
        }

        function outsideClickHandler(e) {
            if (!datepickerEl) return;
            if (datepickerEl.contains(e.target) || e.target === activeDateInput) return;
            closeDatepicker();
        }

        function closeDatepicker() {
            if (!datepickerEl) return;
            window.removeEventListener('click', outsideClickHandler);
            datepickerEl.remove();
            datepickerEl = null;
        }

        function renderCalendar(year, month) {
            if (!datepickerEl) return;
            const grid = datepickerEl.querySelector('#dp-grid');
            // update header month label when calendar re-renders
            const headerLabel = datepickerEl.querySelector('.datepicker-month');
            if (headerLabel) headerLabel.textContent = `${_MONTH_NAMES[month]} ${year}`;
            grid.innerHTML = '';

            const weekDays = ['Su','Mo','Tu','We','Th','Fr','Sa'];
            weekDays.forEach(d => {
                const w = document.createElement('div');
                w.className = 'datepicker-weekday';
                w.textContent = d;
                grid.appendChild(w);
            });

            const first = new Date(year, month, 1);
            const startDay = first.getDay();
            const daysInMonth = new Date(year, month+1, 0).getDate();

            // fill blanks
            for (let i=0;i<startDay;i++) {
                const b = document.createElement('div');
                b.className = 'datepicker-day disabled';
                grid.appendChild(b);
            }

            for (let d=1; d<=daysInMonth; d++) {
                const el = document.createElement('div');
                el.className = 'datepicker-day';
                el.textContent = d;

                const iso = formatISO(year, month+1, d);
                if (activeDateInput && activeDateInput.value === iso) el.classList.add('selected');
                const today = new Date();
                if (today.getFullYear()===year && today.getMonth()===month && today.getDate()===d) el.classList.add('today');

                el.addEventListener('click', () => {
                    if (activeDateInput) activeDateInput.value = iso;
                    closeDatepicker();
                });

                grid.appendChild(el);
            }
        }

        // open when either date input clicked
        if (dateFromInput) dateFromInput.addEventListener('click', (e) => {
            e.stopPropagation();
            activeDateInput = dateFromInput;
            if (!datepickerEl) openDatepicker();
            else closeDatepicker();
        });
        if (dateToInput) dateToInput.addEventListener('click', (e) => {
            e.stopPropagation();
            activeDateInput = dateToInput;
            if (!datepickerEl) openDatepicker();
            else closeDatepicker();
        });

        // reposition on resize/scroll
        window.addEventListener('resize', () => { if (datepickerEl) positionDatepicker(); });
        window.addEventListener('scroll', () => { if (datepickerEl) positionDatepicker(); }, true);

        // Note: Battery ID is an optional override — when provided we fetch by id and show full record(s).
        async function _fetchTraceData(page) {
            let dateFrom = document.getElementById('trace-date-from') ? document.getElementById('trace-date-from').value : '';
            let dateTo = document.getElementById('trace-date-to') ? document.getElementById('trace-date-to').value : '';
            const batteryId = (document.getElementById('trace-battery-id').value || '').trim();
            const status = (document.getElementById('trace-status-filter').value || '').trim();

            // Normalize date formats: accept dd-mm-yyyy or yyyy-mm-dd and send yyyy-mm-dd
            function normalizeDateInput(s) {
                if (!s) return '';
                if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
                const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
                if (m) return `${m[3]}-${m[2]}-${m[1]}`;
                const d = new Date(s);
                if (!isNaN(d)) {
                    const y = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    return `${y}-${mm}-${dd}`;
                }
                return s;
            }

            dateFrom = normalizeDateInput(dateFrom);
            dateTo = normalizeDateInput(dateTo);

            const params = {};
            // If a battery id is provided, that takes precedence — backends often return a single record
            if (batteryId) {
                params.battery_id = batteryId;
                // include status if supplied for more specific lookup
                if (status) params.status = status;
            } else {
                // if status is provided but both dates are empty, default dateFrom to today
                if (status && !dateFrom && !dateTo) {
                    const t = new Date();
                    dateFrom = formatISO(t.getFullYear(), t.getMonth()+1, t.getDate());
                }

                params.page = page;
                params.page_size = 15;
                if (dateFrom) params.date_from = dateFrom;
                if (dateTo) params.date_to = dateTo;
                if (status) params.status = status;
            }

            console.debug('[Traceability] Request params:', params);

            const result = await API.get('/admin/traceability', params);

            console.debug('[Traceability] API result:', result);

            if (result && result.success && result.data) {
                _renderMessage('');

                // Normalize items for rendering: support different backend shapes
                let items = [];
                let pagination = null;

                if (Array.isArray(result.data)) {
                    items = result.data;
                } else if (result.data.items && Array.isArray(result.data.items)) {
                    items = result.data.items;
                    pagination = result.data;
                } else if (result.data && typeof result.data === 'object') {
                    // single object result — wrap in array
                    items = [result.data];
                }

                _renderResults(items);

                // Render stats: battery-level when searching by id, otherwise a total-count when paginated
                if (batteryId) {
                    // show first matched battery as the stat
                    _renderStats({ type: 'single', item: items[0] || null });
                } else if (pagination) {
                    _renderStats({ type: 'summary', total: pagination.total_items || 0 });
                } else {
                    _renderStats(null);
                }

                // Show pagination only when not searching by battery id and when pagination meta exists
                if (!batteryId && pagination) {
                    _renderPagination(pagination, page);
                } else {
                    const p = document.getElementById('trace-pagination');
                    if (p) p.innerHTML = '';
                }
            } else {
                const errMsg = result && (result.message || result.detail || result.error) ? (result.message || result.detail || result.error) : 'No traceability records found for the given criteria.';
                _renderMessage(errMsg);
                _renderResults([]);
                _renderStats(null);
                const p = document.getElementById('trace-pagination');
                if (p) p.innerHTML = '';
                if (result && !result.success) console.warn('[Traceability] API error:', result);
            }
        }

        function _renderStats(payload) {
            const container = document.getElementById('trace-stats');
            if (!container) return;
            if (!payload) {
                container.innerHTML = '';
                return;
            }

    

            if (payload.type === 'summary') {
                container.innerHTML = `
                    <div class="card" style="padding:12px; display:flex; align-items:center; gap:12px;">
                        <div style="font-size:13px;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.6px;">Total Batteries</div>
                        <div style="font-size:20px;font-weight:700;color:var(--color-text-primary);">${payload.total}</div>
                    </div>
                `;
                return;
            }

            if (payload.type === 'single') {
                const item = payload.item;
                if (!item) {
                    container.innerHTML = `<div class="card" style="padding:12px;color:var(--color-text-tertiary);">No battery found</div>`;
                    return;
                }

                container.innerHTML = `
                    <div class="card" style="display:flex;gap:18px;align-items:center;padding:12px;">
                        <div style="min-width:160px">
                            <div style="font-size:12px;color:var(--color-text-tertiary);text-transform:uppercase;">Battery</div>
                            <div style="font-weight:700;font-size:16px;color:var(--color-text-primary);">${item.battery_id || '—'}</div>
                        </div>
                        <div style="min-width:120px">
                            <div style="font-size:12px;color:var(--color-text-tertiary);text-transform:uppercase;">Model</div>
                            <div style="font-weight:600">${item.model || '—'}</div>
                        </div>
                        <div style="min-width:120px">
                            <div style="font-size:12px;color:var(--color-text-tertiary);text-transform:uppercase;">BMS ID</div>
                            <div style="font-weight:600">${item.bms_id || '—'}</div>
                        </div>
                        <div style="min-width:100px">
                            <div style="font-size:12px;color:var(--color-text-tertiary);text-transform:uppercase;">Testing</div>
                            <div>${StatusBadge.render(item.grading_result)}</div>
                        </div>
                        <div style="min-width:100px">
                            <div style="font-size:12px;color:var(--color-text-tertiary);text-transform:uppercase;">PDI</div>
                            <div>${StatusBadge.render(item.pdi_result)}</div>
                        </div>
                        <div style="min-width:120px">
                            <div style="font-size:12px;color:var(--color-text-tertiary);text-transform:uppercase;">Completed</div>
                            <div style="font-weight:600">${item.created_at || item.assembled_at || '—'}</div>
                        </div>
                    </div>
                `;
            }
        }

        function _renderResults(items) {
            const container = document.getElementById('trace-results');
            container.innerHTML = Table.render({
                columns: [
                    { key: 'battery_id', label: 'Battery ID', render: (v) => `<span class="text-mono fw-semibold">${v}</span>` },
                    { key: 'model', label: 'Model' },
                    { key: 'bms_id', label: 'BMS ID', render: (v) => v ? `<span class="text-mono">${v}</span>` : '—' },
                    { key: 'grading_result', label: 'Testing', render: (v) => StatusBadge.render(v) },
                    { key: 'pdi_result', label: 'PDI', render: (v) => StatusBadge.render(v) },
                    { key: 'status', label: 'Status', render: (v) => StatusBadge.render(v) },
                    { key: 'created_at', label: 'Created At' },
                    { key: 'assembled_at', label: 'Assembled On' },
                    { key: 'dispatch_destination', label: 'Dispatch Destination' }
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





                    <div style="margin-top:18px;text-align:right;">
                        <button class="download-btn" onclick="window.downloadBatteryReport && window.downloadBatteryReport('${row.battery_id}')">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 2v8m0 0l4-4m-4 4l-4-4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <rect x="3" y="16" width="14" height="2" rx="1" fill="#fff"/>
                          </svg>
                          Download
                        </button>
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

        function _renderMessage(msg) {
            const container = document.getElementById('trace-results');
            let banner = document.getElementById('trace-results-msg');
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'trace-results-msg';
                banner.style.padding = '12px 16px';
                banner.style.color = 'var(--color-text-secondary)';
                banner.style.fontSize = '14px';
                banner.style.minHeight = '40px';
                container.insertBefore(banner, container.firstChild);
            }
            banner.textContent = msg || '';
        }

        return null;
    }
};

export default Traceability;

// Add global download handler
window.downloadBatteryReport = function(batteryId) {
  if (!batteryId || batteryId === '—') {
    alert('No Battery ID found to download report.');
    return;
  }
  fetch(`http://localhost:8000/reports/generate-full-audit/${encodeURIComponent(batteryId)}`, {
    method: 'GET',
    headers: {
      'accept': 'application/json'
    }
  })
    .then(response => {
      if (!response.ok) throw new Error('Failed to download report');
      // Get filename from content-disposition header
      const disposition = response.headers.get('content-disposition');
      let filename = `BatteryReport_${batteryId}.xlsx`;
      if (disposition && disposition.indexOf('filename=') !== -1) {
        filename = disposition.split('filename=')[1].replace(/"/g, '');
      }
      return response.blob().then(blob => ({ blob, filename }));
    })
    .then(({ blob, filename }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    })
    .catch(() => {
      alert('Failed to download battery report.');
    });
};
