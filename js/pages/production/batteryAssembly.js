/**
 * batteryAssembly.js — Assembly & Mapping Page
 * 
 * Step 1: Operator creates a battery pack (barcode + model + category).
 *         Model selection auto-fills configurable parameters (series, parallel,
 *         IR / voltage / capacity ranges, welding type). An "Add Model" button
 *         lets operators define new models on the fly.
 * Step 2: After creation, operator scans cell barcodes one by one
 *         until all cell slots are filled (series × parallel).
 * 
 * API: POST /api/v1/battery/create   → creates pack
 * API: POST /api/v1/battery/add-cell → links a cell to the pack
 * API: POST /api/v1/battery/assemble → finalises assembly
 * API: POST /api/v1/models           → saves a new model definition
 */

import API from '../../core/api.js';
import Toast from '../../components/toast.js';
import Modal from '../../components/modal.js';

/* ── Default model library (also persisted in localStorage) ──────── */
const STORAGE_KEY = 'maxtrace_model_configs';

const DEFAULT_MODELS = {};

function _loadModels() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch (_) { /* ignore */ }
    return { ...DEFAULT_MODELS };
}

function _saveModels(models) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
}

/** Fetch models from backend and merge into local store */
async function _loadModelsFromBackend() {
    try {
        const result = await API.get('/battery-models/summary');
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
            const models = {};
            for (const m of result.data) {
                // Store minimal info; full details fetched on selection
                models[m.model_id] = { _backendOnly: true, total_count: m.total_count };
            }
            return models;
        }
    } catch (_) { /* ignore */ }
    return null;
}

/** Fetch full model details from backend */
async function _fetchModelDetails(modelId) {
    try {
        const result = await API.get(`/battery-models/${encodeURIComponent(modelId)}`);
        if (result.success && result.data) {
            const d = result.data;
            return {
                category: d.category,
                series_count: d.series_count,
                parallel_count: d.parallel_count,
                cell_ir_lower: d.cell_ir_lower,
                cell_ir_upper: d.cell_ir_upper,
                cell_voltage_lower: d.cell_voltage_lower,
                cell_voltage_upper: d.cell_voltage_upper,
                cell_capacity_lower: d.cell_capacity_lower,
                cell_capacity_upper: d.cell_capacity_upper,
                welding_type: d.welding_type
            };
        }
    } catch (_) { /* ignore */ }
    return null;
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function _esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function _modelOptions(models, selected = '') {
    return '<option value="">Select model</option>'
        + Object.keys(models).map(m =>
            '<option value="' + _esc(m) + '"' + (m === selected ? ' selected' : '') + '>' + _esc(m) + '</option>'
        ).join('');
}

const CATEGORIES = ['ESS', '2-Wheeler', '3-Wheeler'];

const WELDING_TYPES = ['laser', 'spot'];

/* ── Component ───────────────────────────────────────────────────── */
const BatteryAssembly = {
    render() {
        return `
            <div class="content__inner">
                <div class="page-header">
                    <h1 class="page-header__title">Assembly & Mapping</h1>
                    <p class="page-header__subtitle">Create a battery pack, then scan cells into it.</p>
                </div>

                <!-- ── Step 1 — Create Battery Pack ─────────────────── -->
                <div id="step1-section" class="production-form" style="max-width:1100px;">
                    <div class="scanner-section">
                        <div class="scanner-section__header" style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="scanner-section__title">Step 1 — Create Battery Pack</div>
                            <span style="font-size:12px; font-weight:600; color:var(--color-primary); border:1px solid var(--color-primary); padding:2px 10px; border-radius:var(--radius-sm); letter-spacing:.5px;">SETUP</span>
                        </div>

                        <form id="create-pack-form" autocomplete="off">
                            <!-- Row 1: Barcode + Model selector + Add Model btn -->
                            <div style="display:grid; grid-template-columns:1fr 1fr auto; gap:var(--space-6); align-items:end;">
                                <div class="form-group">
                                    <label class="form-label" for="battery-barcode">Battery Barcode</label>
                                    <input
                                        type="text"
                                        id="battery-barcode"
                                        class="form-input form-input--scanner"
                                        placeholder="⌨ Scan or type battery barcode"
                                        required
                                        autofocus
                                        maxlength="64"
                                    >
                                </div>

                                <div class="form-group">
                                    <label class="form-label" for="battery-model">Battery Model</label>
                                    <select id="battery-model" class="form-select" required>
                                        <option value="">Select model</option>
                                    </select>
                                </div>

                                <button type="button" id="btn-add-model" class="btn btn--primary" style="display:inline-flex; align-items:center; gap:6px; height:44px; white-space:nowrap;">
                                    <span class="material-symbols-outlined" style="font-size:18px;">add</span>
                                    Add Model
                                </button>
                            </div>

                            <!-- ── Model Parameters (read-only, shown when model selected) ── -->
                            <div id="model-params-section" style="display:none; margin-top:var(--space-6); padding:var(--space-5); background:var(--color-bg-body); border:1px solid var(--color-border-light); border-radius:var(--radius-md);">
                                <div style="font-size:13px; font-weight:700; color:var(--color-text-secondary); margin-bottom:var(--space-4); text-transform:uppercase; letter-spacing:.5px;">Model Parameters</div>
                                <div id="model-params-grid"></div>
                            </div>

                            <div style="display:flex; justify-content:flex-end; gap:var(--space-4); margin-top:var(--space-4); padding-top:var(--space-4); border-top:1px solid var(--color-border-light);">
                                <button type="button" id="btn-replace-cell" class="btn btn--success btn--lg" style="display:inline-flex; align-items:center; gap:8px;">
                                    <span class="material-symbols-outlined" style="font-size:20px;">swap_horiz</span>
                                    Replace Cell
                                </button>
                                <button type="submit" id="btn-create-pack" class="btn btn--primary btn--lg" style="display:inline-flex; align-items:center; gap:8px;">
                                    <span class="material-symbols-outlined" style="font-size:20px;">shield</span>
                                    Create Battery Pack
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- ── Step 2 — Add Cells (hidden until pack is created) ── -->
                <div id="step2-section" class="production-form" style="max-width:1100px; display:none; margin-top:var(--space-6);">
                    <div class="scanner-section">
                        <div class="scanner-section__header" style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <div class="scanner-section__title">Step 2 — Add Cells</div>
                                <div class="scanner-section__subtitle" id="step2-pack-info" style="margin-top:4px;"></div>
                            </div>
                            <span style="font-size:13px; font-weight:600; color:var(--color-text-secondary);">
                                <span id="cells-filled">0</span> / <span id="cells-total">0</span> cells added
                            </span>
                        </div>

                        <!-- Cell list -->
                        <div id="cell-list" style="margin-top:var(--space-4);"></div>

                        <!-- Add cell input row -->
                        <div id="add-cell-row" style="display:flex; gap:var(--space-4); align-items:flex-end; margin-top:var(--space-4);">
                            <div class="form-group" style="flex:1; margin-bottom:0;">
                                <label class="form-label" for="cell-barcode-input">Cell Barcode</label>
                                <input
                                    type="text"
                                    id="cell-barcode-input"
                                    class="form-input form-input--scanner"
                                    placeholder="🔬 Scan cell barcode..."
                                    maxlength="64"
                                >
                            </div>
                            <button type="button" id="btn-add-cell" class="btn btn--primary" style="display:inline-flex; align-items:center; gap:6px; height:44px;">
                                <span class="material-symbols-outlined" style="font-size:18px;">add_circle</span>
                                Add Cell
                            </button>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:var(--space-6); padding-top:var(--space-4); border-top:1px solid var(--color-border-light);">
                            <button type="button" id="btn-reset-assembly" class="btn btn--secondary">
                                Reset
                            </button>
                            <button type="button" id="btn-complete-assembly" class="btn btn--success btn--lg" disabled style="display:inline-flex; align-items:center; gap:8px;">
                                <span class="material-symbols-outlined" style="font-size:20px;">check_circle</span>
                                Complete Assembly
                            </button>
                        </div>
                    </div>
                </div>

                <div id="assembly-result" style="display:none; margin-top:var(--space-6); max-width:1100px;"></div>
            </div>
        `;
    },

    init() {
        // Clear stale local model cache — backend is the source of truth
        localStorage.removeItem(STORAGE_KEY);
        let models = {};

        // Load models from backend and replace local store entirely
        _loadModelsFromBackend().then(backendModels => {
            if (backendModels) {
                models = backendModels;
                _saveModels(models);
                const sel = modelSelect ? modelSelect.value : '';
                modelSelect.innerHTML = _modelOptions(models, sel);
            }
        });

        const createForm = document.getElementById('create-pack-form');
        const barcodeInput = document.getElementById('battery-barcode');
        const modelSelect = document.getElementById('battery-model');
        const addModelBtn = document.getElementById('btn-add-model');
        const paramsSection = document.getElementById('model-params-section');
        const step1Section = document.getElementById('step1-section');
        const step2Section = document.getElementById('step2-section');
        const cellList = document.getElementById('cell-list');
        const cellBarcodeInput = document.getElementById('cell-barcode-input');
        const addCellBtn = document.getElementById('btn-add-cell');
        const completeBtn = document.getElementById('btn-complete-assembly');
        const resetBtn = document.getElementById('btn-reset-assembly');
        const filledCounter = document.getElementById('cells-filled');
        const totalCounter = document.getElementById('cells-total');
        const packInfo = document.getElementById('step2-pack-info');
        const addCellRow = document.getElementById('add-cell-row');
        const resultEl = document.getElementById('assembly-result');
        const replaceCellBtn = document.getElementById('btn-replace-cell');

        const paramsGrid = document.getElementById('model-params-grid');

        let isSubmitting = false;
        let packBarcode = '';
        let packModel = '';
        let selectedModelCfg = null;
        let cellsPerPack = 0;
        let cellIds = [];


        setTimeout(() => barcodeInput?.focus(), 100);

        // ── Render read-only model parameters ────────────────
        function _renderParamsDisplay(cfg) {
            const totalCells = (cfg.series_count || 0) + (cfg.parallel_count || 0);
            const weldLabel = cfg.welding_type ? cfg.welding_type.charAt(0).toUpperCase() + cfg.welding_type.slice(1) : '—';

            paramsGrid.innerHTML = `
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:var(--space-5);">
                    ${_paramCard('Category', cfg.category || '—')}
                    ${_paramCard('Series Count', cfg.series_count || '—')}
                    ${_paramCard('Parallel Count', cfg.parallel_count || '—')}
                    ${_paramCard('Total Cells', '<span style="font-size:20px; font-weight:700; color:var(--color-primary);">' + totalCells + '</span>')}
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:var(--space-5); margin-top:var(--space-4);">
                    ${_paramCard('IR Lower', cfg.cell_ir_lower + ' mΩ')}
                    ${_paramCard('IR Upper', cfg.cell_ir_upper + ' mΩ')}
                    ${_paramCard('Voltage Lower', cfg.cell_voltage_lower + ' V')}
                    ${_paramCard('Voltage Upper', cfg.cell_voltage_upper + ' V')}
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:var(--space-5); margin-top:var(--space-4);">
                    ${_paramCard('Capacity Lower', cfg.cell_capacity_lower + ' mAh')}
                    ${_paramCard('Capacity Upper', cfg.cell_capacity_upper + ' mAh')}
                    ${_paramCard('Welding Type', weldLabel)}
                </div>
            `;
        }

        function _paramCard(label, value) {
            return '<div style="background:var(--color-bg-card); border:1px solid var(--color-border-light); border-radius:var(--radius-sm); padding:10px 14px;">'
                + '<div style="font-size:11px; font-weight:600; color:var(--color-text-tertiary); text-transform:uppercase; letter-spacing:.4px; margin-bottom:4px;">' + label + '</div>'
                + '<div style="font-size:15px; font-weight:600; color:var(--color-text-primary);">' + value + '</div>'
                + '</div>';
        }

        function _clearParams() {
            paramsGrid.innerHTML = '';
            selectedModelCfg = null;
        }

        // ── Model selection → show & fill params ─────────────
        modelSelect.addEventListener('change', async () => {
            const id = modelSelect.value;
            if (!id) {
                paramsSection.style.display = 'none';
                _clearParams();
                return;
            }
            paramsSection.style.display = 'block';
            paramsGrid.innerHTML = '<div style="text-align:center; padding:12px; color:var(--color-text-tertiary);">Loading model details...</div>';

            let cfg = models[id];

            // If this is a backend-only stub, fetch full details
            if (!cfg || cfg._backendOnly) {
                const details = await _fetchModelDetails(id);
                if (details) {
                    cfg = details;
                    models[id] = cfg;
                    _saveModels(models);
                }
            }

            if (cfg && !cfg._backendOnly) {
                selectedModelCfg = { ...cfg };
                _renderParamsDisplay(cfg);
            } else {
                _clearParams();
                paramsGrid.innerHTML = '<div style="text-align:center; padding:12px; color:var(--color-danger);">Could not load model details.</div>';
            }
        });

        // ── ADD MODEL modal ──────────────────────────────────
        addModelBtn.addEventListener('click', () => {
            const bodyHtml = `
                <div style="display:flex; flex-direction:column; gap:var(--space-4);">
                    <div class="form-group">
                        <label class="form-label">Model ID <span style="color:var(--color-danger);">*</span></label>
                        <input type="text" id="new-model-id" class="form-input" value="MAX-48V-26Ah-L" maxlength="64" required>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:var(--space-4);">
                        <div class="form-group">
                            <label class="form-label">Category <span style="color:var(--color-danger);">*</span></label>
                            <select id="new-model-category" class="form-select">
                                <option value="">Select</option>
                                ${CATEGORIES.map(c => '<option value="' + c + '"' + (c === 'ESS' ? ' selected' : '') + '>' + c + '</option>').join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Series Count <span style="color:var(--color-danger);">*</span></label>
                            <input type="number" id="new-model-series" class="form-input" min="1" value="13">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Parallel Count <span style="color:var(--color-danger);">*</span></label>
                            <input type="number" id="new-model-parallel" class="form-input" min="1" value="10">
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
                        <div class="form-group">
                            <label class="form-label">Cell IR Lower (mΩ)</label>
                            <input type="number" step="0.1" id="new-model-ir-lower" class="form-input" value="18.0">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Cell IR Upper (mΩ)</label>
                            <input type="number" step="0.1" id="new-model-ir-upper" class="form-input" value="19.5">
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
                        <div class="form-group">
                            <label class="form-label">Cell Voltage Lower (V)</label>
                            <input type="number" step="0.01" id="new-model-volt-lower" class="form-input" value="3.70">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Cell Voltage Upper (V)</label>
                            <input type="number" step="0.01" id="new-model-volt-upper" class="form-input" value="3.85">
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
                        <div class="form-group">
                            <label class="form-label">Cell Capacity Lower (mAh)</label>
                            <input type="number" id="new-model-cap-lower" class="form-input" value="2550">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Cell Capacity Upper (mAh)</label>
                            <input type="number" id="new-model-cap-upper" class="form-input" value="2650">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Welding Type</label>
                        <select id="new-model-welding" class="form-select">
                            <option value="">Select type</option>
                            ${WELDING_TYPES.map(w => '<option value="' + w + '"' + (w === 'laser' ? ' selected' : '') + '>' + w.charAt(0).toUpperCase() + w.slice(1) + '</option>').join('')}
                        </select>
                    </div>
                </div>
            `;

            Modal.open({
                title: 'Add New Battery Model',
                body: bodyHtml,
                size: 'lg',
                actions: [
                    { label: 'Cancel', className: 'btn--secondary', onClick: () => Modal.close() },
                    {
                        label: 'Save Model',
                        className: 'btn--primary',
                        onClick: () => {
                            const id = document.getElementById('new-model-id').value.trim();
                            const cat = document.getElementById('new-model-category').value;
                            const series = parseInt(document.getElementById('new-model-series').value);
                            const parallel = parseInt(document.getElementById('new-model-parallel').value);

                            if (!id) { Toast.warning('Model ID is required.'); return; }
                            if (!cat) { Toast.warning('Category is required.'); return; }
                            if (!series || series < 1) { Toast.warning('Series count must be ≥ 1.'); return; }
                            if (!parallel || parallel < 1) { Toast.warning('Parallel count must be ≥ 1.'); return; }

                            if (models[id]) { Toast.error('A model with this ID already exists.'); return; }

                            const newCfg = {
                                category: cat,
                                series_count: series,
                                parallel_count: parallel,
                                cell_ir_lower: parseFloat(document.getElementById('new-model-ir-lower').value) || 0,
                                cell_ir_upper: parseFloat(document.getElementById('new-model-ir-upper').value) || 0,
                                cell_voltage_lower: parseFloat(document.getElementById('new-model-volt-lower').value) || 0,
                                cell_voltage_upper: parseFloat(document.getElementById('new-model-volt-upper').value) || 0,
                                cell_capacity_lower: parseInt(document.getElementById('new-model-cap-lower').value) || 0,
                                cell_capacity_upper: parseInt(document.getElementById('new-model-cap-upper').value) || 0,
                                welding_type: document.getElementById('new-model-welding').value
                            };

                            // Backend expects welding_type as "Laser" or "Spot" (capitalized enum)
                            const backendPayload = {
                                model_id: id,
                                ...newCfg,
                                welding_type: newCfg.welding_type ? newCfg.welding_type.charAt(0).toUpperCase() + newCfg.welding_type.slice(1) : 'Spot'
                            };

                            models[id] = newCfg;
                            _saveModels(models);

                            // Push to backend and handle response
                            API.post('/battery-models/', backendPayload).then(result => {
                                if (!result.success) {
                                    const msg = result.detail || result.message || 'Failed to save model to server.';
                                    Toast.error(typeof msg === 'string' ? msg : 'Failed to save model.');
                                }
                            });

                            // Refresh dropdown & select new model
                            modelSelect.innerHTML = _modelOptions(models, id);
                            modelSelect.dispatchEvent(new Event('change'));

                            Modal.close();
                            Toast.success('Model "' + id + '" added successfully.');
                        }
                    }
                ]
            });
        });

        // ── Step 1: Create Battery Pack ──────────────────────
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isSubmitting) return;

            packBarcode = barcodeInput.value.trim();
            packModel = modelSelect.value;

            if (!packBarcode) {
                barcodeInput.classList.add('form-input--error');
                barcodeInput.focus();
                return;
            }
            if (!packModel) {
                Toast.warning('Please select a Battery Model.');
                return;
            }

            // If model details haven't loaded yet, fetch them now
            if (!selectedModelCfg) {
                const details = await _fetchModelDetails(packModel);
                if (details) {
                    selectedModelCfg = details;
                    models[packModel] = details;
                    _saveModels(models);
                    _renderParamsDisplay(details);
                    paramsSection.style.display = 'block';
                } else {
                    Toast.error('Could not load model details from server.');
                    return;
                }
            }

            cellsPerPack = (selectedModelCfg.series_count || 0) + (selectedModelCfg.parallel_count || 0);
            if (cellsPerPack < 1) {
                Toast.warning('Invalid series/parallel config for this model.');
                return;
            }

            // Register battery in backend
            isSubmitting = true;
            const createBtn = document.getElementById('btn-create-pack');
            createBtn.disabled = true;
            createBtn.innerHTML = '<span class="btn__spinner"></span> Registering...';

            const regResult = await API.post('/batteries/register', {
                battery_id: packBarcode,
                model_id: packModel
            });

            isSubmitting = false;
            createBtn.disabled = false;
            createBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">shield</span> Create Battery Pack';

            if (!regResult.success) {
                const msg = regResult.detail || regResult.message || 'Failed to register battery.';
                Toast.error(typeof msg === 'string' ? msg : 'Failed to register battery.');
                return;
            }

            cellIds = [];

            // Lock Step 1 and show Step 2
            createForm.querySelectorAll('input, select, button').forEach(el => el.disabled = true);
            step2Section.style.display = 'block';
            totalCounter.textContent = cellsPerPack;

            const step2Title = step2Section.querySelector('.scanner-section__title');
            step2Title.textContent = 'Step 2 \u2014 Add Cells';
            packInfo.textContent = 'Pack: ' + packBarcode + '  |  Model: ' + packModel + '  |  Category: ' + selectedModelCfg.category + '  |  Cells: ' + cellsPerPack;
            completeBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">check_circle</span> Complete Assembly';
            completeBtn.style.display = 'inline-flex';
            addCellRow.style.display = 'flex';
            Toast.success('Battery ' + packBarcode + ' registered! Now scan cells into it.');

            _renderCellList();
            cellBarcodeInput.focus();
        });

        barcodeInput.addEventListener('input', () => barcodeInput.classList.remove('form-input--error'));

        // -- Replace Cell button -- opens a standalone modal --------
        replaceCellBtn.addEventListener('click', () => {
            const bodyHtml = `
                <div style="display:flex; flex-direction:column; gap:var(--space-4);">
                    <div class="form-group">
                        <label class="form-label">Battery ID <span style="color:var(--color-danger);">*</span></label>
                        <input type="text" id="replace-battery-id" class="form-input form-input--scanner"
                            placeholder="Scan or type battery barcode..." maxlength="64">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Old Cell ID <span style="color:var(--color-danger);">*</span></label>
                        <input type="text" id="replace-old-cell" class="form-input form-input--scanner"
                            placeholder="Scan old cell barcode..." maxlength="64">
                    </div>
                    <div class="form-group">
                        <label class="form-label">New Cell ID <span style="color:var(--color-danger);">*</span></label>
                        <input type="text" id="replace-new-cell" class="form-input form-input--scanner"
                            placeholder="Scan new cell barcode..." maxlength="64">
                    </div>
                </div>
            `;

            Modal.open({
                title: 'Replace Cell',
                body: bodyHtml,
                size: 'md',
                actions: [
                    { label: 'Cancel', className: 'btn--secondary', onClick: () => Modal.close() },
                    {
                        label: 'Replace Cell',
                        className: 'btn--success',
                        onClick: async () => {
                            const batteryId = document.getElementById('replace-battery-id').value.trim();
                            const oldCell = document.getElementById('replace-old-cell').value.trim();
                            const newCell = document.getElementById('replace-new-cell').value.trim();

                            if (!batteryId) { Toast.warning('Battery ID is required.'); return; }
                            if (!oldCell) { Toast.warning('Old Cell ID is required.'); return; }
                            if (!newCell) { Toast.warning('New Cell ID is required.'); return; }

                            const replBtn = document.querySelector('.modal .btn--success');
                            if (replBtn) {
                                replBtn.disabled = true;
                                replBtn.innerHTML = '<span class="btn__spinner"></span> Replacing...';
                            }

                            const result = await API.post('/batteries/replace-cell', {
                                battery_id: batteryId,
                                old_cell_id: oldCell,
                                new_cell_id: newCell
                            });

                            if (replBtn) {
                                replBtn.disabled = false;
                                replBtn.innerHTML = 'Replace Cell';
                            }

                            if (result.success) {
                                // Backend returns 200 with status "Error" on failure
                                const data = result.data || {};
                                if (data.status === 'Error' || data.error) {
                                    Toast.error(data.message || data.error || 'Replacement failed.');
                                    return;
                                }
                                Modal.close();
                                Toast.success('Cell replaced successfully! Old: ' + oldCell + ' → New: ' + newCell);
                            } else {
                                const msg = result.detail || result.message || 'Replacement failed.';
                                Toast.error(typeof msg === 'string' ? msg : 'Replacement failed.');
                            }
                        }
                    }
                ]
            });

            setTimeout(() => document.getElementById('replace-battery-id')?.focus(), 200);
        });
        // ── Step 2: Add Cells ────────────────────────────────
        function _addCell() {
            const barcode = cellBarcodeInput.value.trim();
            if (!barcode) {
                cellBarcodeInput.classList.add('form-input--error');
                cellBarcodeInput.focus();
                return;
            }

            if (cellIds.includes(barcode)) {
                Toast.error('This cell barcode is already added.');
                cellBarcodeInput.value = '';
                cellBarcodeInput.focus();
                return;
            }

            // ── Normal mode: add to list ──
            if (cellIds.length >= cellsPerPack) {
                Toast.warning('All cell slots are filled.');
                return;
            }

            cellIds.push(barcode);
            cellBarcodeInput.value = '';
            _renderCellList();
            cellBarcodeInput.focus();

            if (cellIds.length >= cellsPerPack) {
                Toast.info('All ' + cellsPerPack + ' cells added. Ready to complete assembly.');
            }
        }

        addCellBtn.addEventListener('click', _addCell);

        cellBarcodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                _addCell();
            }
        });

        cellBarcodeInput.addEventListener('input', () => cellBarcodeInput.classList.remove('form-input--error'));

        function _renderCellList() {
            filledCounter.textContent = cellIds.length;
            completeBtn.disabled = cellIds.length < cellsPerPack;

            // Control add-cell row visibility
            if (cellIds.length >= cellsPerPack) {
                addCellRow.style.display = 'none';
            } else {
                addCellRow.style.display = 'flex';
            }

            if (cellIds.length === 0) {
                cellList.innerHTML = '<p style="color:var(--color-text-tertiary); font-size:14px; text-align:center; padding:var(--space-4) 0;">No cells added yet. Scan a cell barcode below.</p>';
                return;
            }

            let rows = '';
            cellIds.forEach((id, idx) => {
                rows += '<div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--color-bg-secondary); border-radius:var(--radius-sm); margin-bottom:6px;">'
                    + '<span style="font-size:13px; color:var(--color-text-secondary); font-weight:600; min-width:70px;">Cell ' + (idx + 1) + '</span>'
                    + '<code style="flex:1; font-size:13px; font-family:var(--font-mono);">' + _esc(id) + '</code>'
                    + '<button type="button" class="btn-remove-cell" data-idx="' + idx + '" '
                    + 'style="background:none; border:none; cursor:pointer; color:var(--color-danger); font-size:18px; padding:0 4px;" title="Remove">'
                    + '<span class="material-symbols-outlined" style="font-size:18px;">close</span>'
                    + '</button>'
                    + '</div>';
            });
            cellList.innerHTML = rows;

            cellList.querySelectorAll('.btn-remove-cell').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.idx);
                    cellIds.splice(idx, 1);
                    _renderCellList();
                    cellBarcodeInput.focus();
                });
            });
        }

        // ── Complete Assembly ─────────────────────────────────
        completeBtn.addEventListener('click', async () => {
            if (isSubmitting) return;
            if (cellIds.length < cellsPerPack) {
                Toast.warning('All ' + cellsPerPack + ' cell slots must be filled.');
                return;
            }

            isSubmitting = true;
            completeBtn.disabled = true;
            completeBtn.innerHTML = '<span class="btn__spinner"></span> Assembling...';

            // Assign cells to the already-registered battery
            const result = await API.post('/batteries/assign-cells', {
                battery_id: packBarcode,
                cell_ids: cellIds
            });

            isSubmitting = false;
            completeBtn.disabled = false;
            completeBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">check_circle</span> Complete Assembly';

            if (result.success) {
                const data = result.data || {};

                // Backend returns 200 with status:"Error" if cells fail validation
                if (data.status === 'Error') {
                    resultEl.style.display = 'block';
                    let errorHtml = '<div class="confirmation confirmation--error">'
                        + '<div class="confirmation__icon">\u2715</div>'
                        + '<div class="confirmation__title">Cell Assignment Failed</div>'
                        + '<div class="confirmation__detail">' + _esc(data.message || 'Some cells could not be assigned.') + '</div>';

                    if (data.invalid_cells && data.invalid_cells.length > 0) {
                        errorHtml += '<div style="margin-top:12px; text-align:left;">';
                        data.invalid_cells.forEach(c => {
                            errorHtml += '<div style="padding:6px 0; border-bottom:1px solid var(--color-border-light); font-size:13px;">'
                                + '<strong>' + _esc(c.cell_id) + '</strong>: ' + _esc(c.reason);
                            if (c.actual_values) {
                                errorHtml += ' (IR: ' + c.actual_values.ir + ', V: ' + c.actual_values.voltage + ', Cap: ' + c.actual_values.capacity + ')';
                            }
                            errorHtml += '</div>';
                        });
                        errorHtml += '</div>';
                    }
                    errorHtml += '</div>';
                    resultEl.innerHTML = errorHtml;
                    Toast.error(data.invalid_cells.length + ' cell(s) failed validation.');
                    return;
                }

                // Persist battery record locally so downstream pages (Welding, etc.) can look it up
                try {
                    const batteries = JSON.parse(localStorage.getItem('maxtrace_batteries') || '{}');
                    batteries[packBarcode] = {
                        battery_id: packBarcode,
                        model_id: packModel,
                        category: selectedModelCfg.category,
                        welding_type: selectedModelCfg.welding_type,
                        series_count: selectedModelCfg.series_count,
                        parallel_count: selectedModelCfg.parallel_count,
                        cell_count: cellsPerPack,
                        cell_ids: [...cellIds],
                        assembled_at: new Date().toISOString()
                    };
                    localStorage.setItem('maxtrace_batteries', JSON.stringify(batteries));
                } catch (_) { /* localStorage full / unavailable */ }

                Toast.success('Battery ' + packBarcode + ' assembled with ' + cellsPerPack + ' cells!');
                resultEl.style.display = 'block';
                resultEl.innerHTML = '<div class="confirmation confirmation--success">'
                    + '<div class="confirmation__icon">\u2713</div>'
                    + '<div class="confirmation__title">Assembly Completed</div>'
                    + '<div class="confirmation__detail">Battery <code>' + _esc(packBarcode) + '</code> assembled with ' + cellsPerPack + ' cells.</div>'
                    + '</div>';

                setTimeout(() => _fullReset(), 4000);
            } else {
                const msg = result.detail || result.message || 'Assignment failed. Please try again.';
                Toast.error(typeof msg === 'string' ? msg : 'Assignment failed.');
                resultEl.style.display = 'block';
                resultEl.innerHTML = '<div class="confirmation confirmation--error">'
                    + '<div class="confirmation__icon">\u2715</div>'
                    + '<div class="confirmation__title">Assembly Failed</div>'
                    + '<div class="confirmation__detail">' + _esc(typeof msg === 'string' ? msg : JSON.stringify(msg)) + '</div>'
                    + '</div>';
            }
        });

        // ── Reset ────────────────────────────────────────────
        resetBtn.addEventListener('click', _fullReset);

        function _fullReset() {
            cellIds = [];
            cellsPerPack = 0;
            packBarcode = '';
            packModel = '';
            selectedModelCfg = null;
            createForm.reset();
            createForm.querySelectorAll('input, select, button').forEach(el => el.disabled = false);
            paramsSection.style.display = 'none';
            _clearParams();
            step2Section.style.display = 'none';
            addCellRow.style.display = 'flex';
            resultEl.style.display = 'none';

            completeBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">check_circle</span> Complete Assembly';

            _renderCellList();
            barcodeInput.focus();
        }

        return null;
    }
};
export default BatteryAssembly;
