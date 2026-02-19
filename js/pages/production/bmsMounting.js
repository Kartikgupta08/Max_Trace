/**
 * bmsMounting.js — BMS Mounting Page
 * 
 * Flow:
 *   Step 1: Scan BMS barcode + type BMS model → Register BMS (POST /bms/register)
 *   Step 2: Scan Battery barcode → Map BMS to Battery (POST /bms/map-to-battery)
 */

import API from '../../core/api.js';
import Toast from '../../components/toast.js';

/* ── BMS Model storage (localStorage + defaults) ────────────────── */
const BMS_MODELS_KEY = 'maxtrace_bms_models';

const DEFAULT_BMS_MODELS = [];

function _loadBmsModels() {
    return [];
}

function _saveBmsModels(list) {
    localStorage.setItem(BMS_MODELS_KEY, JSON.stringify(list));
}

function _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function _bmsModelOptions(list, selected = '') {
    return '<option value="">Select BMS model</option>'
        + list.map(m =>
            '<option value="' + _esc(m) + '"' + (m === selected ? ' selected' : '') + '>' + _esc(m) + '</option>'
        ).join('');
}

/* ── Component ───────────────────────────────────────────────────── */
const BmsMounting = {
    render() {
        return `
            <div class="content__inner">
                <div class="page-header">
                    <h1 class="page-header__title">BMS Mounting</h1>
                    <p class="page-header__subtitle">Register a BMS, then link it to a battery pack.</p>
                </div>

                <div class="production-form" style="max-width:900px;">
                    <!-- ── Step 1: Register BMS ───────────────────── -->
                    <div class="scanner-section" id="bms-step1">
                        <div class="scanner-section__header" style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="scanner-section__title">
                                <span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--color-primary);color:#fff;font-size:13px;font-weight:700;margin-right:8px;">1</span>
                                Register BMS
                            </div>
                            <span style="font-size:12px; font-weight:600; color:var(--color-primary); border:1px solid var(--color-primary); padding:2px 10px; border-radius:var(--radius-sm); letter-spacing:.5px;">BMS</span>
                        </div>

                        <div class="form-group">
                            <label class="form-label form-label--required" for="bms-id">BMS Barcode</label>
                            <input
                                type="text"
                                id="bms-id"
                                class="form-input form-input--scanner"
                                placeholder="⚡ Scan BMS barcode"
                                required
                                autofocus
                                maxlength="64"
                            >
                        </div>

                        <div class="form-group">
                            <label class="form-label form-label--required" for="bms-model">BMS Model</label>
                            <input
                                type="text"
                                id="bms-model"
                                class="form-input"
                                list="bms-model-list"
                                placeholder="Type BMS model (e.g. BMS-20S-100A)"
                                required
                                maxlength="64"
                            >
                            <datalist id="bms-model-list"></datalist>
                            <div class="form-hint">Type a new model or pick from suggestions.</div>
                        </div>

                        <div style="display:flex; justify-content:flex-end; margin-top:var(--space-4); padding-top:var(--space-4); border-top:1px solid var(--color-border-light);">
                            <button type="button" id="btn-register-bms" class="btn btn--primary btn--lg" style="display:inline-flex; align-items:center; gap:8px;">
                                <span class="material-symbols-outlined" style="font-size:20px;">app_registration</span>
                                Register BMS
                            </button>
                        </div>

                        <div id="bms-step1-result" style="display:none; margin-top:var(--space-4);"></div>
                    </div>

                    <!-- ── Step 2: Map to Battery (hidden until Step 1 succeeds) ── -->
                    <div class="scanner-section" id="bms-step2" style="display:none; margin-top:var(--space-6); opacity:0; transition:opacity .3s ease;">
                        <div class="scanner-section__header" style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="scanner-section__title">
                                <span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--color-primary);color:#fff;font-size:13px;font-weight:700;margin-right:8px;">2</span>
                                Map BMS to Battery
                            </div>
                            <span style="font-size:12px; font-weight:600; color:var(--color-success); border:1px solid var(--color-success); padding:2px 10px; border-radius:var(--radius-sm); letter-spacing:.5px;">LINK</span>
                        </div>

                        <div id="bms-reg-summary" style="padding:var(--space-3) var(--space-4); background:var(--color-primary-surface); border-radius:var(--radius-md); margin-bottom:var(--space-4); font-size:13px;"></div>

                        <div class="form-group">
                            <label class="form-label form-label--required" for="bms-battery-id">Battery Barcode</label>
                            <input
                                type="text"
                                id="bms-battery-id"
                                class="form-input form-input--scanner"
                                placeholder="🔋 Scan battery pack barcode"
                                required
                                maxlength="64"
                            >
                            <div class="form-hint">The registered BMS will be linked to this battery pack.</div>
                        </div>

                        <div style="display:flex; justify-content:flex-end; margin-top:var(--space-4); padding-top:var(--space-4); border-top:1px solid var(--color-border-light);">
                            <button type="button" id="btn-map-bms" class="btn btn--primary btn--lg" style="display:inline-flex; align-items:center; gap:8px;">
                                <span class="material-symbols-outlined" style="font-size:20px;">link</span>
                                Map to Battery
                            </button>
                        </div>

                        <div id="bms-step2-result" style="display:none; margin-top:var(--space-4);"></div>
                    </div>
                </div>
            </div>
        `;
    },

    init() {
        let bmsModels = [];
        let registeredBmsId = null;
        let registeredBmsModel = null;

        const bmsInput = document.getElementById('bms-id');
        const modelInput = document.getElementById('bms-model');
        const modelDatalist = document.getElementById('bms-model-list');
        const registerBtn = document.getElementById('btn-register-bms');
        const step1Result = document.getElementById('bms-step1-result');

        const step2El = document.getElementById('bms-step2');
        const regSummary = document.getElementById('bms-reg-summary');
        const batteryInput = document.getElementById('bms-battery-id');
        const mapBtn = document.getElementById('btn-map-bms');
        const step2Result = document.getElementById('bms-step2-result');

        // Clear stale localStorage and load models from backend
        localStorage.removeItem(BMS_MODELS_KEY);
        _loadModelsFromBackend();

        async function _loadModelsFromBackend() {
            const result = await API.get('/bms/models');
            if (result.success && Array.isArray(result.data)) {
                bmsModels = result.data.map(m => typeof m === 'string' ? m : (m.bms_model || m.name || JSON.stringify(m)));
            } else {
                bmsModels = [];
            }
            _refreshDatalist();
        }

        function _refreshDatalist() {
            modelDatalist.innerHTML = bmsModels.map(m => '<option value="' + _esc(m) + '">').join('');
        }

        setTimeout(() => bmsInput?.focus(), 100);

        // Auto-advance: BMS barcode → model input on Enter
        bmsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (bmsInput.value.trim()) modelInput.focus();
            }
        });

        // Auto-advance: model input → trigger register on Enter
        modelInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (modelInput.value.trim()) registerBtn.click();
            }
        });

        // Auto-advance: battery input → trigger map on Enter
        batteryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (batteryInput.value.trim()) mapBtn.click();
            }
        });

        // ── Step 1: Register BMS ─────────────────────────────
        registerBtn.addEventListener('click', async () => {
            const bmsId = bmsInput.value.trim();
            const bmsModel = modelInput.value.trim();

            if (!bmsId) {
                bmsInput.classList.add('form-input--error');
                bmsInput.focus();
                Toast.warning('Please scan the BMS barcode.');
                return;
            }
            if (!bmsModel) {
                modelInput.classList.add('form-input--error');
                modelInput.focus();
                Toast.warning('Please enter the BMS model.');
                return;
            }

            registerBtn.disabled = true;
            registerBtn.innerHTML = '<span class="btn__spinner"></span> Registering...';
            step1Result.style.display = 'none';

            const result = await API.post('/bms/register', {
                bms_id: bmsId,
                bms_model: bmsModel
            });

            registerBtn.disabled = false;
            registerBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">app_registration</span> Register BMS';

            if (result.success) {
                registeredBmsId = bmsId;
                registeredBmsModel = bmsModel;

                // Add model to suggestions if new
                if (!bmsModels.includes(bmsModel)) {
                    bmsModels.push(bmsModel);
                    _refreshDatalist();
                }

                Toast.success('BMS ' + bmsId + ' registered.');
                step1Result.style.display = 'block';
                step1Result.innerHTML = `
                    <div class="confirmation confirmation--success">
                        <div class="confirmation__icon">✓</div>
                        <div class="confirmation__title">BMS Registered</div>
                        <div class="confirmation__detail">BMS <code>${_esc(bmsId)}</code> — Model: ${_esc(bmsModel)}</div>
                    </div>
                `;

                // Lock step 1 inputs & show step 2
                bmsInput.disabled = true;
                modelInput.disabled = true;
                registerBtn.style.display = 'none';

                regSummary.innerHTML = `Registered BMS: <strong>${_esc(bmsId)}</strong> &nbsp;|&nbsp; Model: <strong>${_esc(bmsModel)}</strong>`;
                step2El.style.display = 'block';
                requestAnimationFrame(() => { step2El.style.opacity = '1'; });
                batteryInput.focus();
            } else {
                const detail = result.detail || result.message || 'BMS registration failed.';
                Toast.error(typeof detail === 'string' ? detail : JSON.stringify(detail));
                step1Result.style.display = 'block';
                step1Result.innerHTML = `
                    <div class="confirmation confirmation--error">
                        <div class="confirmation__icon">✕</div>
                        <div class="confirmation__title">Registration Failed</div>
                        <div class="confirmation__detail">${_esc(typeof detail === 'string' ? detail : JSON.stringify(detail))}</div>
                    </div>
                `;
            }
        });

        // ── Step 2: Map BMS to Battery ───────────────────────
        mapBtn.addEventListener('click', async () => {
            const batteryId = batteryInput.value.trim();

            if (!batteryId) {
                batteryInput.classList.add('form-input--error');
                batteryInput.focus();
                Toast.warning('Please scan the Battery Pack barcode.');
                return;
            }

            mapBtn.disabled = true;
            mapBtn.innerHTML = '<span class="btn__spinner"></span> Mapping...';
            step2Result.style.display = 'none';

            const result = await API.post('/bms/map-to-battery', {
                bms_id: registeredBmsId,
                battery_id: batteryId
            });

            mapBtn.disabled = false;
            mapBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">link</span> Map to Battery';

            if (result.success) {
                Toast.success('BMS ' + registeredBmsId + ' mapped to battery ' + batteryId + '.');
                step2Result.style.display = 'block';
                step2Result.innerHTML = `
                    <div class="confirmation confirmation--success">
                        <div class="confirmation__icon">✓</div>
                        <div class="confirmation__title">BMS Mounted Successfully</div>
                        <div class="confirmation__detail">
                            BMS <code>${_esc(registeredBmsId)}</code> (${_esc(registeredBmsModel)}) linked to Battery Pack <code>${_esc(batteryId)}</code>
                        </div>
                    </div>
                `;

                // Reset everything after 3s for next BMS
                setTimeout(() => {
                    _resetForm();
                }, 3000);
            } else {
                const detail = result.detail || result.message || 'Failed to map BMS to battery.';
                Toast.error(typeof detail === 'string' ? detail : JSON.stringify(detail));
                step2Result.style.display = 'block';
                step2Result.innerHTML = `
                    <div class="confirmation confirmation--error">
                        <div class="confirmation__icon">✕</div>
                        <div class="confirmation__title">Mapping Failed</div>
                        <div class="confirmation__detail">${_esc(typeof detail === 'string' ? detail : JSON.stringify(detail))}</div>
                    </div>
                `;
            }
        });

        function _resetForm() {
            registeredBmsId = null;
            registeredBmsModel = null;

            bmsInput.value = '';
            bmsInput.disabled = false;
            modelInput.value = '';
            modelInput.disabled = false;
            batteryInput.value = '';
            registerBtn.style.display = 'inline-flex';

            step1Result.style.display = 'none';
            step2El.style.opacity = '0';
            setTimeout(() => { step2El.style.display = 'none'; }, 300);
            step2Result.style.display = 'none';

            bmsInput.focus();
        }

        // Clear error styling on input
        [bmsInput, modelInput, batteryInput].forEach(input => {
            input.addEventListener('input', () => input.classList.remove('form-input--error'));
        });

        return null;
    }
};

export default BmsMounting;
