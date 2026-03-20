/**
 * modelManagement.js — Battery Model Management Page
 *
 * Fix: 422 errors from FastAPI now show the actual validation message
 * instead of a generic "Failed to create model" toast.
 * Also added console.error logging so the full detail is always visible
 * in DevTools → Console even if the toast truncates it.
 *
 * APIs:
 *   GET    /battery-models/summary      → load all models
 *   POST   /battery-models/             → create model
 *   PATCH  /battery-models/{id}/update  → update model
 *   DELETE /battery-models/{id}         → delete model
 *   POST   /battery-models/bulk-link    → Excel upload
 */

import API   from '../../core/api.js';
import Toast from '../../components/toast.js';
import Modal from '../../components/modal.js';

const CATEGORIES    = ['2-Wheeler', '3-Wheeler', 'ESS'];
const CELL_TYPES    = ['NMC', 'LFP'];
const WELDING_TYPES = [
    { label: 'Spot Weld',  value: 'Spot'  },   // backend enum: "Spot"  not "SPOT"
    { label: 'Laser Weld', value: 'Laser' },   // backend enum: "Laser" not "LASER"
];

let _allModels  = [];
let _filtered   = [];
let _searchTerm = '';

/* ── Error helper ────────────────────────────────────────── */

/**
 * Extracts a human-readable message from any API error response.
 * Handles FastAPI 422 validation errors (array of {loc, msg}) and
 * simple string detail fields.
 */
function _apiError(res, fallback = 'Request failed.') {
    const detail = res?.detail ?? res?.message;
    if (!detail) return fallback;

    // FastAPI 422: detail is an array of validation error objects
    if (Array.isArray(detail)) {
        return detail
            .map(e => {
                const field = e.loc ? e.loc.filter(l => l !== 'body').join('.') : '';
                return field ? `${field}: ${e.msg}` : e.msg;
            })
            .join(' | ');
    }

    return String(detail);
}

/* ── Helpers ─────────────────────────────────────────────── */

function _esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str ?? '');
    return d.innerHTML;
}

function _cellTypeBadge(val) {
    if (!val) return '<span style="color:var(--color-text-tertiary);">—</span>';
    const v = String(val).toUpperCase();
    if (v === 'NMC') return `<span style="display:inline-flex;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#E3F0FC;color:#1565C0;border:1px solid #90C2F9;">NMC</span>`;
    if (v === 'LFP') return `<span style="display:inline-flex;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#E6F5ED;color:#0F8A4F;border:1px solid #B3DFC8;">LFP</span>`;
    return `<span style="display:inline-flex;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:var(--color-bg-body);color:var(--color-text-secondary);border:1px solid var(--color-border);">${_esc(val)}</span>`;
}

function _weldingBadge(val) {
    if (!val) return '<span style="color:var(--color-text-tertiary);">—</span>';
    const v = String(val).toUpperCase();
    if (v === 'LASER') return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#FFF8E1;color:#B8860B;border:1px solid #F0D78C;">⚡ Laser</span>`;
    if (v === 'SPOT')  return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#F3E8FF;color:#6B21A8;border:1px solid #D8B4FE;">● Spot</span>`;
    return `<span style="display:inline-flex;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600;background:var(--color-bg-body);color:var(--color-text-secondary);border:1px solid var(--color-border);">${_esc(val)}</span>`;
}

function _categoryBadge(cat) {
    const map = {
        '2-Wheeler': 'background:#E3F0FC;color:#1565C0;border:1px solid #90C2F9;',
        '3-Wheeler': 'background:#FFF8E1;color:#B8860B;border:1px solid #F0D78C;',
        'ESS':       'background:#E6F5ED;color:#0F8A4F;border:1px solid #B3DFC8;',
    };
    const s = map[cat] || 'background:var(--color-bg-body);color:var(--color-text-secondary);border:1px solid var(--color-border);';
    return `<span style="display:inline-flex;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;${s}">${_esc(cat || '—')}</span>`;
}

/* ── Data ────────────────────────────────────────────────── */

async function _loadModels() {
    const tbody = document.getElementById('mm-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px;"><div class="spinner" style="margin:0 auto;"></div></td></tr>`;

    const res = await API.get('/battery-models/summary');
    if (res.success && Array.isArray(res.data)) {
        _allModels = res.data;
        _applyFilter();
    } else {
        Toast.error('Failed to load models.');
    }
}

function _applyFilter() {
    const term = _searchTerm.toLowerCase().trim();
    _filtered = term
        ? _allModels.filter(m =>
            m.model_id.toLowerCase().includes(term) ||
            (m.category  || '').toLowerCase().includes(term) ||
            (m.cell_type || '').toLowerCase().includes(term) ||
            (m.bms_model || '').toLowerCase().includes(term))
        : [..._allModels];
    _renderTable();
}

function _renderTable() {
    const tbody   = document.getElementById('mm-tbody');
    const countEl = document.getElementById('mm-count');
    if (!tbody) return;

    if (countEl) countEl.textContent = `${_filtered.length} model${_filtered.length !== 1 ? 's' : ''}`;

    if (!_filtered.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;padding:48px 20px;color:var(--color-text-tertiary);">
                    <div style="font-size:32px;margin-bottom:var(--space-3);">📦</div>
                    <div style="font-size:14px;font-weight:500;">${_searchTerm ? 'No models match your search.' : 'No models yet — click Add Model to get started.'}</div>
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = _filtered.map((m, i) => `
        <tr style="border-bottom:1px solid var(--color-border-light);background:${i % 2 === 1 ? 'var(--color-bg-table-stripe,#FAFBFC)' : 'transparent'};transition:background 120ms;"
            onmouseover="this.style.background='var(--color-bg-table-row-hover)';"
            onmouseout="this.style.background='${i % 2 === 1 ? 'var(--color-bg-table-stripe,#FAFBFC)' : 'transparent'}';"
            data-model-id="${_esc(m.model_id)}">
            <td style="padding:12px 16px;">
                <div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:var(--color-primary);max-width:300px;word-break:break-word;line-height:1.5;">${_esc(m.model_id)}</div>
            </td>
            <td style="padding:12px 14px;">${_categoryBadge(m.category)}</td>
            <td style="padding:12px 14px;">${_cellTypeBadge(m.cell_type)}</td>
            <td style="padding:12px 14px;text-align:center;">
                <span style="font-size:13px;font-weight:700;color:var(--color-text-primary);">
                    ${_esc(m.series_count)}<span style="font-size:11px;font-weight:500;color:var(--color-text-tertiary);margin:0 2px;">S ×</span>${_esc(m.parallel_count)}<span style="font-size:11px;font-weight:500;color:var(--color-text-tertiary);margin-left:2px;">P</span>
                </span>
            </td>
            <td style="padding:12px 14px;text-align:center;">
                <span style="display:inline-flex;align-items:center;justify-content:center;min-width:38px;height:24px;padding:0 8px;border-radius:20px;background:var(--color-primary-surface);color:var(--color-primary);font-size:12px;font-weight:700;border:1px solid #C5D5E8;">${_esc(m.total_count)}</span>
            </td>
            <td style="padding:12px 14px;">${_weldingBadge(m.welding_type)}</td>
            <td style="padding:12px 14px;">
                <span style="font-size:12px;color:var(--color-text-secondary);font-family:'JetBrains Mono',monospace;">${_esc(m.bms_model || '—')}</span>
            </td>
            <td style="padding:12px 14px;">
                <div style="display:flex;gap:4px;justify-content:flex-end;align-items:center;">
                    <button class="mm-edit-btn" data-id="${_esc(m.model_id)}"
                        style="display:inline-flex;align-items:center;gap:4px;padding:5px 11px;border-radius:var(--radius-md);font-size:12px;font-weight:600;background:var(--color-primary-surface);color:var(--color-primary);border:1px solid #C5D5E8;cursor:pointer;font-family:var(--font-family);transition:all 120ms ease;"
                        onmouseover="this.style.background='var(--color-primary)';this.style.color='#fff';this.style.borderColor='var(--color-primary)';"
                        onmouseout="this.style.background='var(--color-primary-surface)';this.style.color='var(--color-primary)';this.style.borderColor='#C5D5E8';">
                        <span class="material-symbols-outlined" style="font-size:13px;">edit</span>Edit
                    </button>
                    <button class="mm-delete-btn" data-id="${_esc(m.model_id)}"
                        style="display:inline-flex;align-items:center;gap:4px;padding:5px 11px;border-radius:var(--radius-md);font-size:12px;font-weight:600;background:var(--color-error-bg);color:var(--color-error);border:1px solid var(--color-error-border);cursor:pointer;font-family:var(--font-family);transition:all 120ms ease;"
                        onmouseover="this.style.background='var(--color-error)';this.style.color='#fff';"
                        onmouseout="this.style.background='var(--color-error-bg)';this.style.color='var(--color-error)';">
                        <span class="material-symbols-outlined" style="font-size:13px;">delete</span>Delete
                    </button>
                </div>
            </td>
        </tr>`).join('');

    tbody.querySelectorAll('.mm-edit-btn').forEach(btn =>
        btn.addEventListener('click', () => _openEditModal(btn.dataset.id)));
    tbody.querySelectorAll('.mm-delete-btn').forEach(btn =>
        btn.addEventListener('click', () => _openDeleteModal(btn.dataset.id)));
}

/* ── Add Model Modal ─────────────────────────────────────── */

function _openAddModal() {
    Modal.open({
        title: 'Add New Battery Model',
        size: 'lg',
        body: `
            <div style="display:flex;flex-direction:column;gap:var(--space-5);">
                <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label form-label--required">Model ID / Name</label>
                    <input type="text" id="mm-add-id" class="form-input"
                        placeholder="e.g. 48V 29AH E-Scooter Lithium Battery" maxlength="200" autofocus>
                    <div class="form-hint">Must exactly match the product name used in your Excel bulk-link files.</div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-4);">
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label form-label--required">Category</label>
                        <select id="mm-add-category" class="form-select">
                            <option value="">Select…</option>
                            ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label form-label--required">Series Count (S)</label>
                        <input type="number" id="mm-add-series" class="form-input" min="1" placeholder="e.g. 13">
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label form-label--required">Parallel Count (P)</label>
                        <input type="number" id="mm-add-parallel" class="form-input" min="1" placeholder="e.g. 10">
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-4);">
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label form-label--required">Cell Type</label>
                        <select id="mm-add-celltype" class="form-select">
                            ${CELL_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label form-label--required">Welding Type</label>
                        <select id="mm-add-welding" class="form-select">
                            ${WELDING_TYPES.map(w => `<option value="${w.value}">${w.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">BMS Model</label>
                        <input type="text" id="mm-add-bms" class="form-input" placeholder="e.g. 17S 40A JBD" maxlength="100">
                    </div>
                </div>
                <div id="mm-add-preview" style="display:none;padding:12px 16px;background:var(--color-primary-surface);border:1px solid #C5D5E8;border-radius:var(--radius-md);font-size:13px;color:var(--color-primary);font-weight:500;">
                    <span class="material-symbols-outlined" style="font-size:16px;vertical-align:-3px;margin-right:6px;">calculate</span>
                    Total cells per pack: <strong id="mm-add-total" style="font-size:15px;margin-left:4px;">—</strong>
                </div>
            </div>`,
        actions: [
            { label: 'Cancel',     className: 'btn--secondary', onClick: () => Modal.close() },
            { label: 'Save Model', className: 'btn--primary',   onClick: _submitAddModel },
        ],
    });

    const seriesEl   = document.getElementById('mm-add-series');
    const parallelEl = document.getElementById('mm-add-parallel');
    const previewEl  = document.getElementById('mm-add-preview');
    const totalEl    = document.getElementById('mm-add-total');
    const updatePreview = () => {
        const s = parseInt(seriesEl.value), p = parseInt(parallelEl.value);
        if (s > 0 && p > 0) { previewEl.style.display = 'block'; totalEl.textContent = `${s * p} cells  (${s}S × ${p}P)`; }
        else previewEl.style.display = 'none';
    };
    seriesEl.addEventListener('input', updatePreview);
    parallelEl.addEventListener('input', updatePreview);
}

async function _submitAddModel() {
    const modelId  = document.getElementById('mm-add-id').value.trim();
    const category = document.getElementById('mm-add-category').value;
    const series   = parseInt(document.getElementById('mm-add-series').value);
    const parallel = parseInt(document.getElementById('mm-add-parallel').value);
    const cellType = document.getElementById('mm-add-celltype').value;
    const welding  = document.getElementById('mm-add-welding').value;
    const bms      = document.getElementById('mm-add-bms').value.trim();

    if (!modelId)                  { Toast.warning('Model ID is required.');        return; }
    if (!category)                 { Toast.warning('Category is required.');        return; }
    if (!series   || series   < 1) { Toast.warning('Series count must be ≥ 1.');   return; }
    if (!parallel || parallel < 1) { Toast.warning('Parallel count must be ≥ 1.'); return; }

    const btn = document.querySelector('#active-modal-overlay .btn--primary');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="btn__spinner"></span> Saving…'; }

    // ── Payload — log it so you can compare against your Pydantic schema ──────
    const payload = {
        model_id:       modelId,
        category,
        series_count:   series,
        parallel_count: parallel,
        cell_type:      cellType,
        welding_type:   welding,
        bms_model:      bms || null,
    };
    console.log('[ModelManagement] POST /battery-models/ payload:', payload);

    const res = await API.post('/battery-models/', payload);
    console.log('[ModelManagement] POST /battery-models/ response:', res);

    if (btn) { btn.disabled = false; btn.textContent = 'Save Model'; }

    if (res.success) {
        Toast.success(`Model "${modelId}" created.`);
        Modal.close();
        await _loadModels();
    } else {
        // Show the real FastAPI validation error, not a generic message
        const msg = _apiError(res, 'Failed to create model.');
        console.error('[ModelManagement] Create failed:', msg, res);
        Toast.error(msg);
    }
}

/* ── Edit Modal ──────────────────────────────────────────── */

function _openEditModal(modelId) {
    const model = _allModels.find(m => m.model_id === modelId);
    if (!model) { Toast.error('Model not found.'); return; }

    Modal.open({
        title: 'Edit Battery Model',
        size: 'lg',
        body: `
            <div style="padding:10px 14px;background:var(--color-bg-body);border:1px solid var(--color-border);border-radius:var(--radius-md);margin-bottom:var(--space-5);">
                <div style="font-size:10px;font-weight:600;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px;">Model ID (read-only)</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:var(--color-primary);word-break:break-word;">${_esc(modelId)}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:var(--space-4);">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-4);">
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">Category</label>
                        <select id="mm-edit-category" class="form-select">
                            ${CATEGORIES.map(c => `<option value="${c}" ${c === model.category ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">Series Count (S)</label>
                        <input type="number" id="mm-edit-series" class="form-input" min="1" value="${_esc(model.series_count)}">
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">Parallel Count (P)</label>
                        <input type="number" id="mm-edit-parallel" class="form-input" min="1" value="${_esc(model.parallel_count)}">
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-4);">
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">Cell Type</label>
                        <select id="mm-edit-celltype" class="form-select">
                            ${CELL_TYPES.map(t => `<option value="${t}" ${t === model.cell_type ? 'selected' : ''}>${t}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">Welding Type</label>
                        <select id="mm-edit-welding" class="form-select">
                            ${WELDING_TYPES.map(w => `<option value="${w.value}" ${w.value === model.welding_type ? 'selected' : ''}>${w.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">BMS Model</label>
                        <input type="text" id="mm-edit-bms" class="form-input" value="${_esc(model.bms_model || '')}" placeholder="e.g. 17S 40A JBD" maxlength="100">
                    </div>
                </div>
            </div>`,
        actions: [
            { label: 'Cancel',       className: 'btn--secondary', onClick: () => Modal.close() },
            { label: 'Save Changes', className: 'btn--primary',   onClick: () => _submitEditModel(modelId) },
        ],
    });
}

async function _submitEditModel(modelId) {
    const series   = parseInt(document.getElementById('mm-edit-series').value);
    const parallel = parseInt(document.getElementById('mm-edit-parallel').value);
    if (!series   || series   < 1) { Toast.warning('Series count must be ≥ 1.');   return; }
    if (!parallel || parallel < 1) { Toast.warning('Parallel count must be ≥ 1.'); return; }

    const btn = document.querySelector('#active-modal-overlay .btn--primary');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="btn__spinner"></span> Saving…'; }

    const payload = {
        category:       document.getElementById('mm-edit-category').value,
        series_count:   series,
        parallel_count: parallel,
        cell_type:      document.getElementById('mm-edit-celltype').value,
        welding_type:   document.getElementById('mm-edit-welding').value,
        bms_model:      document.getElementById('mm-edit-bms').value.trim() || null,
    };
    console.log('[ModelManagement] PATCH payload:', payload);

    const res = await API.patch(`/battery-models/${encodeURIComponent(modelId)}/update`, payload);
    console.log('[ModelManagement] PATCH response:', res);

    if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }

    if (res.success) {
        Toast.success('Model updated successfully.');
        Modal.close();
        await _loadModels();
    } else {
        const msg = _apiError(res, 'Update failed.');
        console.error('[ModelManagement] Update failed:', msg, res);
        Toast.error(msg);
    }
}

/* ── Delete Modal ────────────────────────────────────────── */

function _openDeleteModal(modelId) {
    Modal.open({
        title: 'Delete Model',
        size: 'md',
        closeOnOverlay: false,
        body: `
            <div style="text-align:center;padding:var(--space-4) 0 var(--space-2);">
                <div style="width:56px;height:56px;border-radius:50%;background:var(--color-error-bg);border:1px solid var(--color-error-border);display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-4);">
                    <span class="material-symbols-outlined" style="font-size:26px;color:var(--color-error);">delete_forever</span>
                </div>
                <p style="font-size:14px;color:var(--color-text-secondary);line-height:1.6;margin-bottom:var(--space-4);">Are you sure you want to delete this model?</p>
                <div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:var(--color-text-primary);padding:10px 16px;background:var(--color-bg-body);border-radius:var(--radius-md);border:1px solid var(--color-border);word-break:break-word;text-align:left;">${_esc(modelId)}</div>
                <p style="font-size:12px;color:var(--color-error);margin-top:var(--space-3);font-weight:500;">⚠ Blocked if battery packs are linked to this model.</p>
            </div>`,
        actions: [
            { label: 'Cancel', className: 'btn--secondary', onClick: () => Modal.close() },
            { label: 'Delete', className: 'btn--danger',    onClick: () => _submitDelete(modelId) },
        ],
    });
}

async function _submitDelete(modelId) {
    const btn = document.querySelector('#active-modal-overlay .btn--danger');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="btn__spinner"></span> Deleting…'; }

    const res = await API.delete(`/battery-models/${encodeURIComponent(modelId)}`);
    console.log('[ModelManagement] DELETE response:', res);

    if (res.success) {
        Toast.success(`Model "${modelId}" deleted.`);
        Modal.close();
        await _loadModels();
    } else {
        if (btn) { btn.disabled = false; btn.textContent = 'Delete'; }
        const msg = _apiError(res, 'Delete failed.');
        console.error('[ModelManagement] Delete failed:', msg, res);
        Toast.error(msg);
    }
}

/* ── Bulk Link drawer ────────────────────────────────────── */

function _initBulkLink() {
    const drawerBtn = document.getElementById('mm-bulk-drawer-btn');
    const drawer    = document.getElementById('mm-bulk-drawer');
    const dropZone  = document.getElementById('mm-drop-zone');
    const fileInput = document.getElementById('mm-file-input');
    const fileInfo  = document.getElementById('mm-file-info');
    const submitBtn = document.getElementById('mm-bulk-submit');
    const resetBtn  = document.getElementById('mm-bulk-reset');
    const resultEl  = document.getElementById('mm-bulk-result');
    const arrow     = document.getElementById('mm-bulk-arrow');

    let selectedFile = null, isUploading = false, isOpen = false;

    drawerBtn.addEventListener('click', () => {
        isOpen = !isOpen;
        if (isOpen) {
            drawer.style.maxHeight  = drawer.scrollHeight + 'px';
            drawer.style.opacity    = '1';
            arrow.style.transform   = 'rotate(180deg)';
            drawerBtn.style.background    = 'var(--color-primary)';
            drawerBtn.style.color         = '#fff';
            drawerBtn.style.borderColor   = 'var(--color-primary)';
        } else {
            drawer.style.maxHeight  = '0';
            drawer.style.opacity    = '0';
            arrow.style.transform   = 'rotate(0deg)';
            drawerBtn.style.background    = '';
            drawerBtn.style.color         = '';
            drawerBtn.style.borderColor   = '';
        }
    });

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
    fileInput.addEventListener('change', e => { if (e.target.files.length > 0) _setFile(e.target.files[0]); });
    dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('file-uploader--active'); });
    dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('file-uploader--active'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault(); dropZone.classList.remove('file-uploader--active');
        const f = e.dataTransfer.files[0];
        if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) _setFile(f);
        else Toast.warning('Please drop an Excel file (.xlsx or .xls).');
    });

    function _setFile(file) {
        selectedFile = file;
        fileInfo.style.display = 'flex';
        fileInfo.innerHTML = `
            <span class="material-symbols-outlined" style="font-size:20px;color:var(--color-success);flex-shrink:0;">check_circle</span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--color-text-primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${_esc(file.name)}</span>
            <span style="font-size:12px;color:var(--color-text-tertiary);flex-shrink:0;">${(file.size / 1024).toFixed(1)} KB</span>`;
        dropZone.classList.add('file-uploader--has-file');
        submitBtn.disabled    = false;
        resultEl.style.display = 'none';
        if (isOpen) drawer.style.maxHeight = drawer.scrollHeight + 'px';
    }

    resetBtn.addEventListener('click', () => {
        selectedFile = null; fileInput.value = '';
        fileInfo.style.display = 'none'; fileInfo.innerHTML = '';
        dropZone.classList.remove('file-uploader--has-file', 'file-uploader--active');
        submitBtn.disabled     = true;
        resultEl.style.display = 'none';
        if (isOpen) drawer.style.maxHeight = drawer.scrollHeight + 'px';
    });

    submitBtn.addEventListener('click', async () => {
        if (!selectedFile || isUploading) return;
        isUploading = true;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn__spinner"></span> Uploading…';

        const formData = new FormData();
        formData.append('file', selectedFile);
        const res = await API.upload('/battery-models/bulk-link', formData);
        console.log('[ModelManagement] bulk-link response:', res);

        isUploading = false;
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;">upload_file</span> Upload &amp; Link';

        if (res.success) {
            const s = res.data?.summary || {};
            const errorsHtml = res.data?.errors?.length ? `
                <div style="margin-top:var(--space-3);padding:var(--space-3) var(--space-4);background:var(--color-error-bg);border:1px solid var(--color-error-border);border-radius:var(--radius-md);font-size:12px;text-align:left;">
                    <strong style="color:var(--color-error);">⚠ ${res.data.errors.length} row(s) failed:</strong>
                    <div style="margin-top:var(--space-2);max-height:120px;overflow-y:auto;">
                        ${res.data.errors.map(e =>
                            `<div style="padding:3px 0;border-bottom:1px solid var(--color-error-border);color:var(--color-text-secondary);">
                                Row ${e.row}: ${_esc(e.battery_id || '')} — ${_esc(e.reason)}
                            </div>`
                        ).join('')}
                    </div>
                </div>` : '';

            resultEl.style.display = 'block';
            resultEl.innerHTML = `
                <div class="confirmation confirmation--${(s.errors || 0) > 0 ? 'warning' : 'success'}">
                    <div class="confirmation__icon">${(s.errors || 0) > 0 ? '⚠' : '✓'}</div>
                    <div class="confirmation__title">Bulk Link Complete</div>
                    <div class="confirmation__detail">
                        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-2) var(--space-5);font-size:13px;margin-top:var(--space-3);text-align:center;">
                            <div><div style="font-weight:700;font-size:20px;color:var(--color-text-primary);">${s.total_rows ?? '—'}</div><div style="font-size:11px;color:var(--color-text-tertiary);margin-top:2px;text-transform:uppercase;letter-spacing:.5px;">Total Rows</div></div>
                            <div><div style="font-weight:700;font-size:20px;color:var(--color-success);">${s.created ?? 0}</div><div style="font-size:11px;color:var(--color-text-tertiary);margin-top:2px;text-transform:uppercase;letter-spacing:.5px;">Created</div></div>
                            <div><div style="font-weight:700;font-size:20px;color:var(--color-warning);">${s.skipped ?? 0}</div><div style="font-size:11px;color:var(--color-text-tertiary);margin-top:2px;text-transform:uppercase;letter-spacing:.5px;">Skipped</div></div>
                            <div><div style="font-weight:700;font-size:20px;color:${(s.errors || 0) > 0 ? 'var(--color-error)' : 'var(--color-text-tertiary)'};">${s.errors ?? 0}</div><div style="font-size:11px;color:var(--color-text-tertiary);margin-top:2px;text-transform:uppercase;letter-spacing:.5px;">Errors</div></div>
                        </div>
                        ${errorsHtml}
                    </div>
                </div>`;

            Toast.success(`${s.created ?? 0} batteries linked, ${s.skipped ?? 0} skipped.`);
            if (isOpen) setTimeout(() => { drawer.style.maxHeight = drawer.scrollHeight + 'px'; }, 50);
            if (!s.errors) setTimeout(() => { resetBtn.click(); resultEl.style.display = 'none'; }, 5000);
        } else {
            const msg = _apiError(res, 'Upload failed.');
            console.error('[ModelManagement] Bulk link failed:', msg, res);
            Toast.error(msg);
        }
    });
}

/* ── Component ───────────────────────────────────────────── */

const ModelManagement = {
    render() {
        return `
            <div class="content__inner">

                <div class="page-header">
                    <div>
                        <h1 class="page-header__title">Model Management</h1>
                        <p class="page-header__subtitle">Define battery models, manage parameters, and link batteries into production</p>
                    </div>
                    <div style="display:flex;align-items:center;gap:var(--space-3);">
                        <button type="button" id="mm-bulk-drawer-btn"
                            style="display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px;
                                   border-radius:var(--radius-md);font-size:13px;font-weight:600;
                                   background:white;color:var(--color-primary);
                                   border:1px solid var(--color-primary);cursor:pointer;
                                   font-family:var(--font-family);transition:all 180ms ease;"
                            title="Toggle Bulk Link panel">
                            <span class="material-symbols-outlined" style="font-size:18px;">upload_file</span>
                            Bulk Link
                            <span class="material-symbols-outlined" id="mm-bulk-arrow"
                                style="font-size:16px;transition:transform 200ms ease;">
                                expand_more
                            </span>
                        </button>
                        <button type="button" id="mm-add-btn" class="btn btn--primary"
                            style="display:inline-flex;align-items:center;gap:6px;height:36px;">
                            <span class="material-symbols-outlined" style="font-size:18px;">add</span>
                            Add Model
                        </button>
                    </div>
                </div>

                <div id="mm-bulk-drawer"
                    style="max-height:0;opacity:0;overflow:hidden;
                           transition:max-height 320ms ease, opacity 240ms ease;
                           margin-bottom:0;">
                    <div style="background:var(--color-bg-card);border:1px solid var(--color-border);
                                border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);
                                padding:var(--space-5) var(--space-6);margin-bottom:var(--space-5);">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4);">
                            <div style="display:flex;align-items:center;gap:var(--space-3);">
                                <div style="width:34px;height:34px;border-radius:var(--radius-md);background:var(--color-primary-surface);color:var(--color-primary);display:flex;align-items:center;justify-content:center;">
                                    <span class="material-symbols-outlined" style="font-size:19px;">upload_file</span>
                                </div>
                                <div>
                                    <div style="font-size:14px;font-weight:700;color:var(--color-text-primary);">Bulk Link Batteries to Models</div>
                                    <div style="font-size:12px;color:var(--color-text-tertiary);margin-top:1px;">Upload Excel to register batteries and link them to a model in PROD status</div>
                                </div>
                            </div>
                            <span style="font-size:11px;font-weight:700;color:var(--color-primary);border:1px solid #C5D5E8;background:var(--color-primary-surface);padding:3px 12px;border-radius:20px;letter-spacing:.5px;">BULK</span>
                        </div>
                        <div style="padding:11px 14px;background:var(--color-primary-surface);border:1px solid #C5D5E8;border-radius:var(--radius-md);margin-bottom:var(--space-4);font-size:13px;color:var(--color-primary);">
                            <span class="material-symbols-outlined" style="font-size:15px;vertical-align:-3px;margin-right:6px;">info</span>
                            Required columns:&nbsp;
                            <code style="background:#D6E8F7;padding:1px 7px;border-radius:4px;font-size:12px;">battery_id</code>
                            &nbsp;and&nbsp;
                            <code style="background:#D6E8F7;padding:1px 7px;border-radius:4px;font-size:12px;">model_name</code>
                            — <strong>model_name</strong> must exactly match a Model ID in the table below. Existing IDs are skipped.
                        </div>
                        <div id="mm-drop-zone" class="file-uploader" tabindex="0" role="button"
                            aria-label="Upload Excel file" style="min-height:120px;cursor:pointer;">
                            <div class="file-uploader__icon">📊</div>
                            <div class="file-uploader__text"><strong>Click to upload</strong> or drag and drop</div>
                            <div class="file-uploader__hint">Supported: .xlsx, .xls</div>
                            <input type="file" id="mm-file-input" accept=".xlsx,.xls" style="display:none;">
                        </div>
                        <div id="mm-file-info"
                            style="display:none;align-items:center;gap:var(--space-3);margin-top:var(--space-3);
                                   padding:10px 14px;background:var(--color-success-bg);
                                   border:1px solid var(--color-success-border);border-radius:var(--radius-md);">
                        </div>
                        <div style="display:flex;justify-content:flex-end;gap:var(--space-3);
                                    margin-top:var(--space-4);padding-top:var(--space-4);
                                    border-top:1px solid var(--color-border-light);">
                            <button type="button" id="mm-bulk-reset" class="btn btn--secondary">Reset</button>
                            <button type="button" id="mm-bulk-submit" class="btn btn--primary btn--lg"
                                disabled style="display:inline-flex;align-items:center;gap:8px;">
                                <span class="material-symbols-outlined" style="font-size:18px;">upload_file</span>
                                Upload &amp; Link
                            </button>
                        </div>
                        <div id="mm-bulk-result" style="display:none;margin-top:var(--space-4);"></div>
                    </div>
                </div>

                <div class="card">
                    <div class="card__header">
                        <div style="display:flex;align-items:center;gap:var(--space-3);">
                            <div style="width:36px;height:36px;border-radius:var(--radius-md);background:var(--color-primary-surface);color:var(--color-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                <span class="material-symbols-outlined" style="font-size:20px;">battery_charging_full</span>
                            </div>
                            <div>
                                <div class="card__title">Battery Models</div>
                                <div style="font-size:11px;color:var(--color-text-tertiary);margin-top:1px;" id="mm-count">Loading…</div>
                            </div>
                        </div>
                        <div style="position:relative;">
                            <span class="material-symbols-outlined"
                                style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:16px;color:var(--color-text-tertiary);pointer-events:none;">search</span>
                            <input type="text" id="mm-search" class="form-input"
                                placeholder="Search models…"
                                style="padding-left:34px;width:220px;height:36px;font-size:13px;">
                        </div>
                    </div>
                    <div style="overflow-x:auto;">
                        <table style="width:100%;border-collapse:collapse;min-width:720px;">
                            <thead style="background:var(--color-bg-table-header);">
                                <tr>
                                    <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid var(--color-border);white-space:nowrap;">Model ID / Name</th>
                                    <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid var(--color-border);">Category</th>
                                    <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid var(--color-border);">Cell</th>
                                    <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid var(--color-border);">Config</th>
                                    <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid var(--color-border);">Total Cells</th>
                                    <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid var(--color-border);">Welding</th>
                                    <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid var(--color-border);">BMS</th>
                                    <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid var(--color-border);">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="mm-tbody">
                                <tr><td colspan="8" style="text-align:center;padding:48px;"><div class="spinner" style="margin:0 auto;"></div></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>`;
    },

    async init() {
        await _loadModels();
        document.getElementById('mm-search').addEventListener('input', e => {
            _searchTerm = e.target.value;
            _applyFilter();
        });
        document.getElementById('mm-add-btn').addEventListener('click', _openAddModal);
        _initBulkLink();
        return () => { _allModels = []; _filtered = []; _searchTerm = ''; };
    }
};

export default ModelManagement;