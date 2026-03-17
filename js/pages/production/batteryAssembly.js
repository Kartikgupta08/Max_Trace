/**
 * batteryAssembly.js — Assembly & Mapping Page
 *
 * Layout:
 *   Step 1 — Two column:
 *     LEFT  (flex 2): Battery barcode scan → auto-fetches model & params
 *     RIGHT (flex 1): Optional cell parameter ranges (IR / Voltage / Capacity)
 *   Step 2 — Full width: Scan cells one by one
 *
 * APIs:
 *   GET  /battery-models/by-battery/{battery_id}  → auto-load model
 *   POST /batteries/assign-cells                  → complete assembly
 *   POST /batteries/replace-cell                  → replace a cell
 */

import API   from '../../core/api.js';
import Toast from '../../components/toast.js';
import Modal from '../../components/modal.js';

function _esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str ?? '');
    return d.innerHTML;
}

function _paramCard(label, value) {
    return `
        <div style="background:var(--color-bg-card);border:1px solid var(--color-border-light);border-radius:var(--radius-sm);padding:10px 14px;">
            <div style="font-size:10px;font-weight:600;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">${label}</div>
            <div style="font-size:14px;font-weight:600;color:var(--color-text-primary);">${value}</div>
        </div>`;
}

const BatteryAssembly = {
    render() {
        return `
            <div class="content__inner">
                <div class="page-header">
                    <h1 class="page-header__title">Assembly & Mapping</h1>
                    <p class="page-header__subtitle">Scan battery barcode to load model, set optional cell ranges, then scan cells.</p>
                </div>

                <!-- ══ STEP 1 — Two-column layout ══ -->
                <div id="step1-section" style="max-width:1200px;">
                    <div style="display:grid;grid-template-columns:2fr 1fr;gap:var(--space-6);align-items:start;">

                        <!-- ── LEFT: Barcode + Model Params ── -->
                        <div class="scanner-section">
                            <div class="scanner-section__header" style="display:flex;justify-content:space-between;align-items:center;">
                                <div class="scanner-section__title">Step 1 — Scan Battery Pack</div>
                                <span style="font-size:12px;font-weight:600;color:var(--color-primary);border:1px solid var(--color-primary);padding:2px 10px;border-radius:var(--radius-sm);letter-spacing:.5px;">SETUP</span>
                            </div>

                            <form id="create-pack-form" autocomplete="off">
                                <div class="form-group">
                                    <label class="form-label form-label--required" for="battery-barcode">Battery Barcode</label>
                                    <input
                                        type="text"
                                        id="battery-barcode"
                                        class="form-input form-input--scanner"
                                        placeholder="⌨ Scan or type battery barcode, then press Enter"
                                        required autofocus maxlength="64"
                                    >
                                    <div class="form-hint">Press Enter after scanning to load the model automatically.</div>
                                </div>

                                <!-- Loading spinner -->
                                <div id="model-loading" style="display:none;padding:16px;background:var(--color-bg-body);border:1px solid var(--color-border-light);border-radius:var(--radius-md);text-align:center;color:var(--color-text-tertiary);font-size:13px;margin-top:var(--space-4);">
                                    <div class="spinner" style="margin:0 auto 8px;width:24px;height:24px;border-width:2px;"></div>
                                    Loading model details…
                                </div>

                                <!-- Model params (shown after fetch) -->
                                <div id="model-params-section" style="display:none;margin-top:var(--space-4);padding:var(--space-4);background:var(--color-bg-body);border:1px solid var(--color-border-light);border-radius:var(--radius-md);">
                                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);">
                                        <div style="font-size:11px;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.5px;">Model Parameters</div>
                                        <span id="model-name-badge" style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:var(--color-primary);background:var(--color-primary-surface);padding:2px 10px;border-radius:20px;border:1px solid #C5D5E8;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>
                                    </div>
                                    <div id="model-params-grid"></div>
                                </div>

                                <!-- Battery not found -->
                                <div id="model-error" style="display:none;margin-top:var(--space-4);padding:12px 16px;background:var(--color-error-bg);border:1px solid var(--color-error-border);border-radius:var(--radius-md);font-size:13px;color:var(--color-error);">
                                    <strong>Battery not found.</strong>
                                    This barcode is not registered. Use <strong>Bulk Link</strong> in Model Management to register batteries first.
                                </div>

                                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-5);padding-top:var(--space-4);border-top:1px solid var(--color-border-light);">
                                    <button type="button" id="btn-replace-cell" class="btn btn--secondary"
                                        style="display:inline-flex;align-items:center;gap:6px;">
                                        <span class="material-symbols-outlined" style="font-size:18px;">swap_horiz</span>
                                        Replace Cell
                                    </button>
                                    <button type="submit" id="btn-create-pack" class="btn btn--primary btn--lg"
                                        style="display:inline-flex;align-items:center;gap:8px;" disabled>
                                        <span class="material-symbols-outlined" style="font-size:20px;">shield</span>
                                        Start Assembly
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- ── RIGHT: Cell Parameter Ranges ── -->
                        <div class="scanner-section" style="position:sticky;top:var(--space-6);">
                            <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2);">
                                <div style="width:32px;height:32px;border-radius:var(--radius-md);background:var(--color-primary-surface);color:var(--color-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                    <span class="material-symbols-outlined" style="font-size:18px;">tune</span>
                                </div>
                                <div>
                                    <div style="font-size:14px;font-weight:700;color:var(--color-text-primary);">Cell Parameter Ranges</div>
                                    <div style="font-size:11px;color:var(--color-text-tertiary);margin-top:1px;">Optional — leave blank to skip checks</div>
                                </div>
                            </div>

                            <div style="padding:10px 12px;background:var(--color-primary-surface);border:1px solid #C5D5E8;border-radius:var(--radius-md);font-size:12px;color:var(--color-primary);margin-bottom:var(--space-4);">
                                <span class="material-symbols-outlined" style="font-size:14px;vertical-align:-3px;margin-right:4px;">info</span>
                                Only filled ranges are validated. A range requires <strong>both</strong> lower and upper values.
                            </div>

                            <!-- IR Range -->
                            <div style="margin-bottom:var(--space-4);">
                                <div style="font-size:11px;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.6px;margin-bottom:var(--space-2);display:flex;align-items:center;gap:6px;">
                                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#1565C0;flex-shrink:0;"></span>
                                    Cell IR <span style="text-transform:none;">(mΩ)</span>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);">
                                    <div>
                                        <label style="font-size:10px;color:var(--color-text-tertiary);display:block;margin-bottom:3px;">Lower</label>
                                        <input type="number" step="0.01" id="ir-lower" class="form-input"
                                            style="height:36px;font-size:13px;" placeholder="e.g. 18.0">
                                    </div>
                                    <div>
                                        <label style="font-size:10px;color:var(--color-text-tertiary);display:block;margin-bottom:3px;">Upper</label>
                                        <input type="number" step="0.01" id="ir-upper" class="form-input"
                                            style="height:36px;font-size:13px;" placeholder="e.g. 19.5">
                                    </div>
                                </div>
                            </div>

                            <!-- Voltage Range -->
                            <div style="margin-bottom:var(--space-4);">
                                <div style="font-size:11px;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.6px;margin-bottom:var(--space-2);display:flex;align-items:center;gap:6px;">
                                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#0F8A4F;flex-shrink:0;"></span>
                                    Cell Voltage (V)
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);">
                                    <div>
                                        <label style="font-size:10px;color:var(--color-text-tertiary);display:block;margin-bottom:3px;">Lower</label>
                                        <input type="number" step="0.001" id="voltage-lower" class="form-input"
                                            style="height:36px;font-size:13px;" placeholder="e.g. 3.70">
                                    </div>
                                    <div>
                                        <label style="font-size:10px;color:var(--color-text-tertiary);display:block;margin-bottom:3px;">Upper</label>
                                        <input type="number" step="0.001" id="voltage-upper" class="form-input"
                                            style="height:36px;font-size:13px;" placeholder="e.g. 3.85">
                                    </div>
                                </div>
                            </div>

                            <!-- Capacity Range -->
                            <div style="margin-bottom:var(--space-4);">
                                <div style="font-size:11px;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.6px;margin-bottom:var(--space-2);display:flex;align-items:center;gap:6px;">
                                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#B8860B;flex-shrink:0;"></span>
                                    Cell Capacity <span style="text-transform:none;">(mAh)</span>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);">
                                    <div>
                                        <label style="font-size:10px;color:var(--color-text-tertiary);display:block;margin-bottom:3px;">Lower</label>
                                        <input type="number" step="1" id="capacity-lower" class="form-input"
                                            style="height:36px;font-size:13px;" placeholder="e.g. 2550">
                                    </div>
                                    <div>
                                        <label style="font-size:10px;color:var(--color-text-tertiary);display:block;margin-bottom:3px;">Upper</label>
                                        <input type="number" step="1" id="capacity-upper" class="form-input"
                                            style="height:36px;font-size:13px;" placeholder="e.g. 2650">
                                    </div>
                                </div>
                            </div>

                            <!-- Active ranges preview -->
                            <div id="ranges-preview" style="display:none;padding:10px 12px;background:var(--color-success-bg);border:1px solid var(--color-success-border);border-radius:var(--radius-md);font-size:12px;color:var(--color-success);">
                                <div style="font-weight:700;margin-bottom:4px;">✓ Ranges will be applied:</div>
                                <div id="ranges-preview-text"></div>
                            </div>

                            <button type="button" id="btn-clear-ranges" class="btn btn--secondary"
                                style="width:100%;margin-top:var(--space-3);font-size:12px;height:32px;">
                                Clear All Ranges
                            </button>
                        </div>

                    </div>
                </div>

                <!-- ══ STEP 2 — Scan Cells ══ -->
                <div id="step2-section" style="max-width:1200px;display:none;margin-top:var(--space-6);">
                    <div class="scanner-section">
                        <div class="scanner-section__header" style="display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <div class="scanner-section__title">Step 2 — Scan Cells</div>
                                <div class="scanner-section__subtitle" id="step2-pack-info" style="margin-top:4px;"></div>
                            </div>
                            <div style="display:flex;align-items:center;gap:var(--space-4);">
                                <!-- Active ranges summary chip -->
                                <div id="step2-ranges-chip" style="display:none;font-size:11px;font-weight:600;color:var(--color-success);background:var(--color-success-bg);border:1px solid var(--color-success-border);padding:3px 10px;border-radius:20px;"></div>
                                <span style="font-size:13px;font-weight:600;color:var(--color-text-secondary);">
                                    <span id="cells-filled">0</span> / <span id="cells-total">0</span> cells
                                </span>
                            </div>
                        </div>

                        <div id="cell-list" style="margin-top:var(--space-4);"></div>

                        <div id="add-cell-row" style="display:flex;gap:var(--space-4);align-items:flex-end;margin-top:var(--space-4);">
                            <div class="form-group" style="flex:1;margin-bottom:0;">
                                <label class="form-label" for="cell-barcode-input">Cell Barcode</label>
                                <input
                                    type="text"
                                    id="cell-barcode-input"
                                    class="form-input form-input--scanner"
                                    placeholder="🔬 Scan cell barcode…"
                                    maxlength="64"
                                >
                            </div>
                            <button type="button" id="btn-add-cell" class="btn btn--primary"
                                style="display:inline-flex;align-items:center;gap:6px;height:44px;">
                                <span class="material-symbols-outlined" style="font-size:18px;">add_circle</span>
                                Add Cell
                            </button>
                        </div>

                        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-6);padding-top:var(--space-4);border-top:1px solid var(--color-border-light);">
                            <button type="button" id="btn-reset-assembly" class="btn btn--secondary">Reset</button>
                            <button type="button" id="btn-complete-assembly" class="btn btn--success btn--lg"
                                disabled style="display:inline-flex;align-items:center;gap:8px;">
                                <span class="material-symbols-outlined" style="font-size:20px;">check_circle</span>
                                Complete Assembly
                            </button>
                        </div>
                    </div>
                </div>

                <div id="assembly-result" style="display:none;margin-top:var(--space-6);max-width:1200px;"></div>
            </div>`;
    },

    init() {
        // ── Element refs ──────────────────────────────────────────────────────
        const createForm         = document.getElementById('create-pack-form');
        const barcodeInput       = document.getElementById('battery-barcode');
        const modelLoading       = document.getElementById('model-loading');
        const modelParamsSection = document.getElementById('model-params-section');
        const modelParamsGrid    = document.getElementById('model-params-grid');
        const modelNameBadge     = document.getElementById('model-name-badge');
        const modelError         = document.getElementById('model-error');
        const createBtn          = document.getElementById('btn-create-pack');
        const replaceCellBtn     = document.getElementById('btn-replace-cell');

        // Range inputs
        const irLowerEl       = document.getElementById('ir-lower');
        const irUpperEl       = document.getElementById('ir-upper');
        const voltageLowerEl  = document.getElementById('voltage-lower');
        const voltageUpperEl  = document.getElementById('voltage-upper');
        const capacityLowerEl = document.getElementById('capacity-lower');
        const capacityUpperEl = document.getElementById('capacity-upper');
        const rangesPreview   = document.getElementById('ranges-preview');
        const rangesPreviewText = document.getElementById('ranges-preview-text');
        const clearRangesBtn  = document.getElementById('btn-clear-ranges');

        // Step 2
        const step2Section     = document.getElementById('step2-section');
        const cellList         = document.getElementById('cell-list');
        const cellBarcodeInput = document.getElementById('cell-barcode-input');
        const addCellBtn       = document.getElementById('btn-add-cell');
        const completeBtn      = document.getElementById('btn-complete-assembly');
        const resetBtn         = document.getElementById('btn-reset-assembly');
        const filledCounter    = document.getElementById('cells-filled');
        const totalCounter     = document.getElementById('cells-total');
        const packInfo         = document.getElementById('step2-pack-info');
        const addCellRow       = document.getElementById('add-cell-row');
        const resultEl         = document.getElementById('assembly-result');
        const step2RangesChip  = document.getElementById('step2-ranges-chip');

        // ── State ─────────────────────────────────────────────────────────────
        let isSubmitting  = false;
        let packBarcode   = '';
        let selectedModel = null;
        let cellsPerPack  = 0;
        let cellIds       = [];

        setTimeout(() => barcodeInput?.focus(), 100);

        // ── Range helpers ─────────────────────────────────────────────────────

        function _getFloat(el) {
            const v = parseFloat(el.value);
            return isNaN(v) ? null : v;
        }

        function _getRanges() {
            return {
                cell_ir_lower:       _getFloat(irLowerEl),
                cell_ir_upper:       _getFloat(irUpperEl),
                cell_voltage_lower:  _getFloat(voltageLowerEl),
                cell_voltage_upper:  _getFloat(voltageUpperEl),
                cell_capacity_lower: _getFloat(capacityLowerEl),
                cell_capacity_upper: _getFloat(capacityUpperEl),
            };
        }

        function _updateRangesPreview() {
            const r = _getRanges();
            const lines = [];

            if (r.cell_ir_lower !== null && r.cell_ir_upper !== null)
                lines.push(`IR: ${r.cell_ir_lower} – ${r.cell_ir_upper} mΩ`);
            if (r.cell_voltage_lower !== null && r.cell_voltage_upper !== null)
                lines.push(`Voltage: ${r.cell_voltage_lower} – ${r.cell_voltage_upper} V`);
            if (r.cell_capacity_lower !== null && r.cell_capacity_upper !== null)
                lines.push(`Capacity: ${r.cell_capacity_lower} – ${r.cell_capacity_upper} mAh`);

            if (lines.length > 0) {
                rangesPreview.style.display = 'block';
                rangesPreviewText.innerHTML = lines.map(l => `<div>${l}</div>`).join('');
            } else {
                rangesPreview.style.display = 'none';
            }
            return lines;
        }

        // Live preview as user types
        [irLowerEl, irUpperEl, voltageLowerEl, voltageUpperEl, capacityLowerEl, capacityUpperEl]
            .forEach(el => el.addEventListener('input', _updateRangesPreview));

        clearRangesBtn.addEventListener('click', () => {
            [irLowerEl, irUpperEl, voltageLowerEl, voltageUpperEl, capacityLowerEl, capacityUpperEl]
                .forEach(el => { el.value = ''; });
            rangesPreview.style.display = 'none';
        });

        // ── Model params render ───────────────────────────────────────────────

        function _renderModelParams(m) {
            const weldLabel = m.welding_type
                ? m.welding_type.charAt(0).toUpperCase() + m.welding_type.slice(1).toLowerCase()
                : '—';
            const cellLabel = m.cell_type?.value ?? m.cell_type ?? '—';
            const total     = m.total_cells ?? (m.series_count * m.parallel_count);

            modelParamsGrid.innerHTML = `
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-3);">
                    ${_paramCard('Category',        _esc(m.category || '—'))}
                    ${_paramCard('Cell Type',        _esc(cellLabel))}
                    ${_paramCard('Config',           `<span style="color:var(--color-primary);font-weight:700;">${m.series_count}S × ${m.parallel_count}P</span>`)}
                    ${_paramCard('Total Cells',      `<span style="font-size:18px;font-weight:700;color:var(--color-primary);">${total}</span>`)}
                </div>
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-3);margin-top:var(--space-3);">
                    ${_paramCard('Welding Type', _esc(weldLabel))}
                    ${_paramCard('BMS Model',    _esc(m.bms_model || '—'))}
                </div>`;
        }

        // ── Auto-fetch model on Enter ─────────────────────────────────────────

        async function _fetchModelForBattery(batteryId) {
            modelLoading.style.display       = 'none';
            modelParamsSection.style.display = 'none';
            modelError.style.display         = 'none';
            createBtn.disabled               = true;
            selectedModel                    = null;

            if (!batteryId) return;

            modelLoading.style.display = 'block';
            const res = await API.get(`/battery-models/by-battery/${encodeURIComponent(batteryId)}`);
            modelLoading.style.display = 'none';

            if (res.success && res.data) {
                selectedModel                    = res.data;
                modelNameBadge.textContent       = res.data.model_id;
                _renderModelParams(res.data);
                modelParamsSection.style.display = 'block';
                createBtn.disabled               = false;
                cellsPerPack = res.data.total_cells ?? (res.data.series_count * res.data.parallel_count);
            } else {
                modelError.style.display = 'block';
                barcodeInput.classList.add('form-input--error');
            }
        }

        barcodeInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = barcodeInput.value.trim();
                if (val) _fetchModelForBattery(val);
            }
        });

        barcodeInput.addEventListener('input', () => {
            barcodeInput.classList.remove('form-input--error');
            modelParamsSection.style.display = 'none';
            modelError.style.display         = 'none';
            modelLoading.style.display       = 'none';
            createBtn.disabled               = true;
            selectedModel                    = null;
        });

        // ── Step 1 submit ─────────────────────────────────────────────────────

        createForm.addEventListener('submit', e => {
            e.preventDefault();
            if (isSubmitting || !selectedModel) return;

            packBarcode  = barcodeInput.value.trim();
            if (!packBarcode) { barcodeInput.classList.add('form-input--error'); barcodeInput.focus(); return; }

            cellIds      = [];
            cellsPerPack = selectedModel.total_cells ?? (selectedModel.series_count * selectedModel.parallel_count);

            // Lock step 1
            createForm.querySelectorAll('input, select, button').forEach(el => el.disabled = true);
            // Keep range inputs editable — operator may still want to adjust before completing
            [irLowerEl, irUpperEl, voltageLowerEl, voltageUpperEl, capacityLowerEl, capacityUpperEl]
                .forEach(el => el.disabled = false);

            // Show step 2
            step2Section.style.display = 'block';
            totalCounter.textContent   = cellsPerPack;
            packInfo.textContent       = `Pack: ${packBarcode}  |  Model: ${selectedModel.model_id}  |  Category: ${selectedModel.category}  |  Cells needed: ${cellsPerPack}`;
            addCellRow.style.display   = 'flex';

            // Show active ranges chip in step 2 header
            const activeLines = _updateRangesPreview();
            if (activeLines.length > 0) {
                step2RangesChip.style.display = 'inline-flex';
                step2RangesChip.textContent   = `✓ ${activeLines.length} range${activeLines.length > 1 ? 's' : ''} active`;
            } else {
                step2RangesChip.style.display = 'none';
            }

            _renderCellList();
            cellBarcodeInput.focus();
            Toast.success(`Battery ${packBarcode} ready — scan ${cellsPerPack} cells.`);
        });

        // ── Replace Cell modal ────────────────────────────────────────────────

        replaceCellBtn.addEventListener('click', () => {
            Modal.open({
                title: 'Replace Cell',
                size:  'md',
                body: `
                    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
                        <div class="form-group">
                            <label class="form-label form-label--required">Battery ID</label>
                            <input type="text" id="replace-battery-id" class="form-input form-input--scanner"
                                placeholder="Scan battery barcode…" maxlength="64">
                        </div>
                        <div class="form-group">
                            <label class="form-label form-label--required">Old Cell ID</label>
                            <input type="text" id="replace-old-cell" class="form-input form-input--scanner"
                                placeholder="Scan old cell barcode…" maxlength="64">
                        </div>
                        <div class="form-group">
                            <label class="form-label form-label--required">New Cell ID</label>
                            <input type="text" id="replace-new-cell" class="form-input form-input--scanner"
                                placeholder="Scan new cell barcode…" maxlength="64">
                        </div>
                    </div>`,
                actions: [
                    { label: 'Cancel',       className: 'btn--secondary', onClick: () => Modal.close() },
                    { label: 'Replace Cell', className: 'btn--success',   onClick: _submitReplaceCell },
                ],
            });
            setTimeout(() => document.getElementById('replace-battery-id')?.focus(), 200);
        });

        async function _submitReplaceCell() {
            const batteryId = document.getElementById('replace-battery-id').value.trim();
            const oldCell   = document.getElementById('replace-old-cell').value.trim();
            const newCell   = document.getElementById('replace-new-cell').value.trim();

            if (!batteryId) { Toast.warning('Battery ID is required.'); return; }
            if (!oldCell)   { Toast.warning('Old Cell ID is required.'); return; }
            if (!newCell)   { Toast.warning('New Cell ID is required.'); return; }

            const btn = document.querySelector('#active-modal-overlay .btn--success');
            if (btn) { btn.disabled = true; btn.innerHTML = '<span class="btn__spinner"></span> Replacing…'; }

            const result = await API.post('/batteries/replace-cell', {
                battery_id: batteryId, old_cell_id: oldCell, new_cell_id: newCell,
            });

            if (btn) { btn.disabled = false; btn.innerHTML = 'Replace Cell'; }

            if (result.success) {
                const data = result.data || {};
                if (data.status === 'Error' || data.error) {
                    Toast.error(data.message || data.error || 'Replacement failed.');
                    return;
                }
                Modal.close();
                Toast.success(`Cell replaced: ${oldCell} → ${newCell}`);
            } else {
                Toast.error(typeof result.detail === 'string' ? result.detail : (result.message || 'Replacement failed.'));
            }
        }

        // ── Step 2: Add Cells ─────────────────────────────────────────────────

        function _addCell() {
            const barcode = cellBarcodeInput.value.trim();
            if (!barcode) { cellBarcodeInput.classList.add('form-input--error'); cellBarcodeInput.focus(); return; }
            if (cellIds.includes(barcode)) {
                Toast.error('This cell barcode is already added.');
                cellBarcodeInput.value = '';
                cellBarcodeInput.focus();
                return;
            }
            if (cellIds.length >= cellsPerPack) { Toast.warning('All cell slots are filled.'); return; }

            cellIds.push(barcode);
            cellBarcodeInput.value = '';
            _renderCellList();
            cellBarcodeInput.focus();

            if (cellIds.length >= cellsPerPack) {
                Toast.info(`All ${cellsPerPack} cells added. Ready to complete assembly.`);
            }
        }

        addCellBtn.addEventListener('click', _addCell);
        cellBarcodeInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); _addCell(); } });
        cellBarcodeInput.addEventListener('input',   () => cellBarcodeInput.classList.remove('form-input--error'));

        function _renderCellList() {
            filledCounter.textContent = cellIds.length;
            completeBtn.disabled      = cellIds.length < cellsPerPack;
            addCellRow.style.display  = cellIds.length >= cellsPerPack ? 'none' : 'flex';

            if (cellIds.length === 0) {
                cellList.innerHTML = `<p style="color:var(--color-text-tertiary);font-size:14px;text-align:center;padding:var(--space-4) 0;">No cells added yet. Scan a cell barcode below.</p>`;
                return;
            }

            cellList.innerHTML = cellIds.map((id, idx) => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--color-bg-body);border:1px solid var(--color-border-light);border-radius:var(--radius-sm);margin-bottom:6px;">
                    <span style="font-size:12px;color:var(--color-text-tertiary);font-weight:600;min-width:60px;">Cell ${idx + 1}</span>
                    <code style="flex:1;font-size:13px;font-family:'JetBrains Mono',monospace;color:var(--color-text-primary);">${_esc(id)}</code>
                    <button type="button" class="btn-remove-cell" data-idx="${idx}"
                        style="background:none;border:none;cursor:pointer;color:var(--color-error);padding:0 4px;display:flex;align-items:center;" title="Remove">
                        <span class="material-symbols-outlined" style="font-size:18px;">close</span>
                    </button>
                </div>`).join('');

            cellList.querySelectorAll('.btn-remove-cell').forEach(btn => {
                btn.addEventListener('click', () => {
                    cellIds.splice(parseInt(btn.dataset.idx), 1);
                    _renderCellList();
                    cellBarcodeInput.focus();
                });
            });
        }

        // ── Complete Assembly ─────────────────────────────────────────────────

        completeBtn.addEventListener('click', async () => {
            if (isSubmitting) return;
            if (cellIds.length < cellsPerPack) { Toast.warning(`All ${cellsPerPack} cell slots must be filled.`); return; }

            isSubmitting = true;
            completeBtn.disabled = true;
            completeBtn.innerHTML = '<span class="btn__spinner"></span> Assembling…';

            // Build payload — include ranges only if both bounds are provided
            const ranges  = _getRanges();
            const payload = {
                battery_id: packBarcode,
                cell_ids:   cellIds,
                ...ranges,
            };

            const result = await API.post('/batteries/assign-cells', payload);

            isSubmitting = false;
            completeBtn.disabled = false;
            completeBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">check_circle</span> Complete Assembly';

            if (result.success) {
                const data = result.data || {};

                if (data.status === 'Error') {
                    resultEl.style.display = 'block';
                    let errorHtml = `
                        <div class="confirmation confirmation--error">
                            <div class="confirmation__icon">✕</div>
                            <div class="confirmation__title">Cell Assignment Failed</div>
                            <div class="confirmation__detail">${_esc(data.message || 'Some cells could not be assigned.')}`;

                    if (data.invalid_cells?.length) {
                        errorHtml += `<div style="margin-top:12px;text-align:left;">`;
                        data.invalid_cells.forEach(c => {
                            errorHtml += `<div style="padding:6px 0;border-bottom:1px solid var(--color-border-light);font-size:13px;">
                                <strong>${_esc(c.cell_id)}</strong>: ${_esc(c.reason)}`;
                            if (c.actual_values) errorHtml += ` (IR: ${c.actual_values.ir}, V: ${c.actual_values.voltage}, Cap: ${c.actual_values.capacity})`;
                            errorHtml += `</div>`;
                        });
                        errorHtml += `</div>`;
                    }
                    errorHtml += `</div></div>`;
                    resultEl.innerHTML = errorHtml;
                    Toast.error(`${data.invalid_cells?.length ?? 0} cell(s) failed validation.`);
                    return;
                }

                Toast.success(`Battery ${packBarcode} assembled with ${cellsPerPack} cells!`);
                resultEl.style.display = 'block';
                resultEl.innerHTML = `
                    <div class="confirmation confirmation--success">
                        <div class="confirmation__icon">✓</div>
                        <div class="confirmation__title">Assembly Completed</div>
                        <div class="confirmation__detail">
                            Battery <code>${_esc(packBarcode)}</code> assembled with ${cellsPerPack} cells.<br>
                            <span style="font-size:12px;color:var(--color-text-tertiary);">Model: ${_esc(selectedModel?.model_id ?? '')}</span>
                        </div>
                    </div>`;
                setTimeout(() => _fullReset(), 4000);

            } else {
                const msg = result.detail || result.message || 'Assignment failed. Please try again.';
                Toast.error(typeof msg === 'string' ? msg : 'Assignment failed.');
                resultEl.style.display = 'block';
                resultEl.innerHTML = `
                    <div class="confirmation confirmation--error">
                        <div class="confirmation__icon">✕</div>
                        <div class="confirmation__title">Assembly Failed</div>
                        <div class="confirmation__detail">${_esc(typeof msg === 'string' ? msg : JSON.stringify(msg))}</div>
                    </div>`;
            }
        });

        // ── Full Reset ────────────────────────────────────────────────────────

        resetBtn.addEventListener('click', _fullReset);

        function _fullReset() {
            cellIds       = [];
            cellsPerPack  = 0;
            packBarcode   = '';
            selectedModel = null;

            createForm.reset();
            createForm.querySelectorAll('input, select, button').forEach(el => el.disabled = false);

            modelParamsSection.style.display = 'none';
            modelError.style.display         = 'none';
            modelLoading.style.display       = 'none';
            createBtn.disabled               = true;

            step2Section.style.display   = 'none';
            addCellRow.style.display     = 'flex';
            resultEl.style.display       = 'none';
            step2RangesChip.style.display = 'none';

            completeBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">check_circle</span> Complete Assembly';
            _renderCellList();
            barcodeInput.focus();
        }

        return null;
    }
};

export default BatteryAssembly;