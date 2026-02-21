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
                        <label class="filter-bar__label">CELL ID</label>
                        <input type="text" id="inv-cell-id" class="filter-bar__input" placeholder="Enter Cell ID">
                    </div>
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">Date From</label>
                        <input type="date" id="inv-date-from" class="filter-bar__input">
                    </div>
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">To</label>
                        <input type="date" id="inv-date-to" class="filter-bar__input">
                    </div>
                    <div class="filter-bar__group filter-bar__group--center">
                        <label class="filter-bar__label">Brand Name</label>
                        <select id="inv-model" class="filter-bar__input form-select">
                            <option value="">All Brands</option>
                            <option value="INR18650-25R">INR18650-25R</option>
                            <option value="INR18650-30Q">INR18650-30Q</option>
                        </select>
                    </div>
                    <div class="filter-bar__group">
                        <label class="filter-bar__label">Status</label>
                        <select id="inv-status" class="filter-bar__input form-select">
                            <option value="">All</option>
                            <option value="REGISTERED">Registered</option>
                            <option value="GRADED">Graded</option>
                            <option value="TESTED">Tested</option>
                            <option value="ASSIGNED">Assigned to Pack</option>
                            <option value="FAILED">Failed</option>
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

            const searchBtn = document.getElementById('btn-inv-search');
            const cellInput = document.getElementById('inv-cell-id');
            const dateFromInput = document.getElementById('inv-date-from');
            const dateToInput = document.getElementById('inv-date-to');
            const statusSelect = document.getElementById('inv-status');
            const modelSelect = document.getElementById('inv-model');

            // Dynamically load brands from backend and populate dropdown
            async function loadBrandsDropdown() {
                const result = await API.get('/admin/cells/brands');
                if (result.success && Array.isArray(result.data)) {
                    // Remove all except first option (All Brands)
                    while (modelSelect.options.length > 1) {
                        modelSelect.remove(1);
                    }
                    result.data.forEach(brand => {
                        const opt = document.createElement('option');
                        opt.value = brand;
                        opt.text = brand;
                        modelSelect.appendChild(opt);
                    });
                }
            }
            await loadBrandsDropdown();

            searchBtn.addEventListener('click', () => {
                currentPage = 1;
                _fetchInventory(currentPage);
            });

            // Enter key triggers search for Cell ID
            if (cellInput) cellInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { currentPage = 1; _fetchInventory(currentPage); } });

            // datepicker popup for the From/To inputs (shared, active input like traceability)
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

            setTimeout(() => { window.addEventListener('click', outsideClickHandler); }, 0);
        }

        function positionDatepicker() {
            if (!activeDateInput || !datepickerEl) return;
            const rect = activeDateInput.getBoundingClientRect();
            const top = rect.bottom + window.scrollY + 8;
            const left = rect.left + window.scrollX;
            datepickerEl.style.top = `${top}px`;
            datepickerEl.style.left = `${left}px`;
        }

        function outsideClickHandler(e) { if (!datepickerEl) return; if (datepickerEl.contains(e.target) || e.target === activeDateInput) return; closeDatepicker(); }

        function closeDatepicker() { if (!datepickerEl) return; window.removeEventListener('click', outsideClickHandler); datepickerEl.remove(); datepickerEl = null; }

        function renderCalendar(year, month) {
            if (!datepickerEl) return;
            const grid = datepickerEl.querySelector('#dp-grid');
            const headerLabel = datepickerEl.querySelector('.datepicker-month');
            if (headerLabel) headerLabel.textContent = `${_MONTH_NAMES[month]} ${year}`;
            grid.innerHTML = '';

            const weekDays = ['Su','Mo','Tu','We','Th','Fr','Sa'];
            weekDays.forEach(d => { const w = document.createElement('div'); w.className = 'datepicker-weekday'; w.textContent = d; grid.appendChild(w); });

            const first = new Date(year, month, 1);
            const startDay = first.getDay();
            const daysInMonth = new Date(year, month+1, 0).getDate();

            for (let i=0;i<startDay;i++) { const b = document.createElement('div'); b.className = 'datepicker-day disabled'; grid.appendChild(b); }

            for (let d=1; d<=daysInMonth; d++) {
                const el = document.createElement('div');
                el.className = 'datepicker-day';
                el.textContent = d;
                const iso = formatISO(year, month+1, d);
                if (activeDateInput && activeDateInput.value === iso) el.classList.add('selected');
                const today = new Date();
                if (today.getFullYear()===year && today.getMonth()===month && today.getDate()===d) el.classList.add('today');
                el.addEventListener('click', () => { if (activeDateInput) activeDateInput.value = iso; closeDatepicker(); });
                grid.appendChild(el);
            }
        }

        if (dateFromInput) dateFromInput.addEventListener('click', (e) => { e.stopPropagation(); activeDateInput = dateFromInput; if (!datepickerEl) openDatepicker(); else closeDatepicker(); });
        if (dateToInput) dateToInput.addEventListener('click', (e) => { e.stopPropagation(); activeDateInput = dateToInput; if (!datepickerEl) openDatepicker(); else closeDatepicker(); });
        window.addEventListener('resize', () => { if (datepickerEl) positionDatepicker(); });
        window.addEventListener('scroll', () => { if (datepickerEl) positionDatepicker(); }, true);

        // initialize modern dropdowns for status and model selects
        if (statusSelect) createModernDropdown(statusSelect);
        if (modelSelect) createModernDropdown(modelSelect);

        function createModernDropdown(nativeSelect) {
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
            label.textContent = selectedOption ? selectedOption.text : 'All';

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
                // show panel appended to body
                panel.style.display = 'block';
                panel.style.opacity = '1';
                panel.style.transform = 'translateY(0)';
                panel.style.pointerEvents = 'auto';
                positionPanel();
                open = true;
                updateActive();
                document.addEventListener('click', onDocClick);
                window.addEventListener('resize', positionPanel);
                window.addEventListener('scroll', positionPanel, true);
            }

            function closePanel() {
                wrapper.classList.remove('open');
                wrapper.setAttribute('aria-expanded', 'false');
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
                        if (list && list.scrollHeight > list.clientHeight) {
                            list.scrollTop = Math.max(0, o.offsetTop - Math.round(list.clientHeight / 2) + Math.round(o.clientHeight / 2));
                        }
                    }
                });
                const sel = nativeSelect.options[activeIndex];
                if (sel) label.textContent = sel.text;
            }

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

            trigger.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); openPanel(); activeIndex = Math.min(activeIndex + 1, options.length - 1); updateActive(); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); openPanel(); activeIndex = Math.max(activeIndex - 1, 0); updateActive(); }
                else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!open) openPanel(); else { nativeSelect.selectedIndex = activeIndex; nativeSelect.dispatchEvent(new Event('change', { bubbles: true })); closePanel(); } }
                else if (e.key === 'Escape') { if (open) { e.preventDefault(); closePanel(); } }
            });

            panel.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, options.length - 1); updateActive(); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); updateActive(); }
                else if (e.key === 'Enter') { e.preventDefault(); nativeSelect.selectedIndex = activeIndex; nativeSelect.dispatchEvent(new Event('change', { bubbles: true })); closePanel(); }
                else if (e.key === 'Escape') { e.preventDefault(); closePanel(); }
            });

            trigger.addEventListener('click', (e) => { e.stopPropagation(); if (!open) openPanel(); else closePanel(); });

            nativeSelect.addEventListener('change', () => { activeIndex = nativeSelect.selectedIndex >= 0 ? nativeSelect.selectedIndex : 0; updateActive(); });

            panel.style.display = 'none';
            updateActive();
        }

        // Load initial data
        await _fetchInventory(currentPage);

        async function _fetchInventory(page) {
            const params = { page, page_size: 20 };
            const model = document.getElementById('inv-model').value;
            const status = document.getElementById('inv-status').value;
            const cellId = document.getElementById('inv-cell-id') ? document.getElementById('inv-cell-id').value.trim() : '';
            let dateFrom = document.getElementById('inv-date-from') ? document.getElementById('inv-date-from').value : '';
            let dateTo = document.getElementById('inv-date-to') ? document.getElementById('inv-date-to').value : '';

            // Normalize date formats to yyyy-mm-dd
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

            if (model) params.model = model;
            if (status) params.status = status;

            // cell id takes precedence
            if (cellId) {
                params.cell_id = cellId;
                if (status) params.status = status;
            } else {
                // if status is provided but both dates empty, default dateFrom to today
                if (status && !dateFrom && !dateTo) {
                    const t = new Date();
                    dateFrom = formatISO(t.getFullYear(), t.getMonth()+1, t.getDate());
                }

                params.page = page;
                params.page_size = 20;
                if (dateFrom) params.date_from = dateFrom;
                if (dateTo) params.date_to = dateTo;
                if (status) params.status = status;
            }

            const result = await API.get('/admin/cells/inventory', params);

            const tableEl = document.getElementById('inv-table');
            if (result.success && result.data) {
                tableEl.innerHTML = Table.render({
                    columns: [
                        { key: 'cell_id', label: 'Cell ID', render: (v) => `<span class="text-mono fw-semibold">${v}</span>` },
                        { key: 'model', label: 'Brand Name' },
                        { key: 'status', label: 'Status', render: (v) => StatusBadge.render(v) },
                        { key: 'registered_at', label: 'Date', render: (v) => v ? (typeof v === 'string' && v.indexOf('T')>0 ? v.split('T')[0] : v) : '—' }
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
                        { key: 'model', label: 'Brand Name' },
                        { key: 'status', label: 'Status', render: (v) => StatusBadge.render(v) },
                        { key: 'registered_at', label: 'Date', render: (v) => v ? (typeof v === 'string' && v.indexOf('T')>0 ? v.split('T')[0] : v) : '—' }
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