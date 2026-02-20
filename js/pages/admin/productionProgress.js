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
                    <div class="filter-bar__group filter-bar__group--center">
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

        // initialize modern dropdown for the Model select to match status styling
        const modelSelect = document.getElementById('prog-model');
        if (modelSelect) createModernDropdown(modelSelect);

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

        // modern dropdown helper (mirrors native select while rendering a styled panel)
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
            label.textContent = selectedOption ? selectedOption.text : 'All Models';

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

        return null;
    }
};

export default ProductionProgress;
