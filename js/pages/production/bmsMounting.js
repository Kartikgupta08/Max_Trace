/**
 * bmsMounting.js — BMS Mounting Page
 *
 * Flow:
 *   Step 1: Scan battery barcode → GET /bms/info/{battery_id}
 *            → shows expected BMS model from template
 *   Step 2: Scan BMS barcode → POST /bms/map-to-battery
 *            → BMS auto-created if new, linked to battery
 */

import API   from '../../core/api.js';
import Toast from '../../components/toast.js';

function _esc(s) {
    const d = document.createElement('div');
    d.textContent = String(s ?? '');
    return d.innerHTML;
}

const BmsMounting = {
    render() {
        return `
            <div class="content__inner">
                <div class="page-header">
                    <h1 class="page-header__title">BMS Mounting</h1>
                    <p class="page-header__subtitle">Scan battery barcode to load expected BMS model, then scan the BMS unit to link it.</p>
                </div>

                <div class="production-form" style="max-width:860px;">

                    <!-- ── Step 1: Scan Battery ───────────────────── -->
                    <div class="scanner-section" id="bms-step1">
                        <div class="scanner-section__header" style="display:flex;justify-content:space-between;align-items:center;">
                            <div style="display:flex;align-items:center;gap:var(--space-3);">
                                <span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--color-primary);color:#fff;font-size:13px;font-weight:700;flex-shrink:0;">1</span>
                                <div class="scanner-section__title">Scan Battery Pack</div>
                            </div>
                            <span style="font-size:12px;font-weight:600;color:var(--color-primary);border:1px solid var(--color-primary);padding:2px 10px;border-radius:var(--radius-sm);letter-spacing:.5px;">BATTERY</span>
                        </div>

                        <div class="form-group">
                            <label class="form-label form-label--required" for="bms-battery-id">Battery Barcode</label>
                            <input
                                type="text"
                                id="bms-battery-id"
                                class="form-input form-input--scanner"
                                placeholder="🔋 Scan battery barcode, then press Enter"
                                autofocus
                                maxlength="64"
                            >
                            <div class="form-hint">Press Enter after scanning to load the expected BMS model.</div>
                        </div>

                        <!-- Loading state -->
                        <div id="bms-battery-loading" style="display:none;padding:14px 16px;background:var(--color-bg-body);border:1px solid var(--color-border-light);border-radius:var(--radius-md);text-align:center;color:var(--color-text-tertiary);font-size:13px;margin-top:var(--space-3);">
                            <div class="spinner" style="margin:0 auto 8px;width:22px;height:22px;border-width:2px;"></div>
                            Fetching battery info…
                        </div>

                        <!-- Battery info panel (shown after fetch) -->
                        <div id="bms-battery-info" style="display:none;margin-top:var(--space-4);padding:var(--space-4) var(--space-5);background:var(--color-primary-surface);border:1px solid #C5D5E8;border-radius:var(--radius-md);">
                            <div style="font-size:11px;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.6px;margin-bottom:var(--space-3);">Battery Info</div>
                            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-4);">
                                <div>
                                    <div style="font-size:10px;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">Battery ID</div>
                                    <div id="info-battery-id" style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:var(--color-primary);"></div>
                                </div>
                                <div>
                                    <div style="font-size:10px;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">Model</div>
                                    <div id="info-model-id" style="font-size:13px;font-weight:600;color:var(--color-text-primary);"></div>
                                </div>
                                <div>
                                    <div style="font-size:10px;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">Expected BMS Model</div>
                                    <div id="info-bms-model" style="font-size:13px;font-weight:700;color:var(--color-primary);"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Already mounted warning -->
                        <div id="bms-already-mounted" style="display:none;margin-top:var(--space-3);padding:12px 16px;background:var(--color-warning-bg);border:1px solid var(--color-warning-border);border-radius:var(--radius-md);font-size:13px;color:var(--color-warning);">
                            <strong>⚠ BMS Already Mounted:</strong>
                            <span id="bms-already-mounted-id" style="font-family:'JetBrains Mono',monospace;margin-left:6px;"></span>
                            — You can re-mount a new BMS to replace it.
                        </div>

                        <!-- Battery not found error -->
                        <div id="bms-battery-error" style="display:none;margin-top:var(--space-3);padding:12px 16px;background:var(--color-error-bg);border:1px solid var(--color-error-border);border-radius:var(--radius-md);font-size:13px;color:var(--color-error);">
                            <strong>Battery not found.</strong> This barcode is not registered in the system.
                        </div>
                    </div>

                    <!-- ── Step 2: Scan BMS (hidden until battery loaded) ── -->
                    <div class="scanner-section" id="bms-step2"
                        style="display:none;margin-top:var(--space-6);opacity:0;transition:opacity .3s ease;">
                        <div class="scanner-section__header" style="display:flex;justify-content:space-between;align-items:center;">
                            <div style="display:flex;align-items:center;gap:var(--space-3);">
                                <span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--color-primary);color:#fff;font-size:13px;font-weight:700;flex-shrink:0;">2</span>
                                <div class="scanner-section__title">Scan BMS Unit</div>
                            </div>
                            <span style="font-size:12px;font-weight:600;color:var(--color-success);border:1px solid var(--color-success);padding:2px 10px;border-radius:var(--radius-sm);letter-spacing:.5px;">LINK</span>
                        </div>

                        <!-- Expected model reminder -->
                        <div style="padding:10px 14px;background:var(--color-primary-surface);border:1px solid #C5D5E8;border-radius:var(--radius-md);margin-bottom:var(--space-5);font-size:13px;color:var(--color-primary);">
                            <span class="material-symbols-outlined" style="font-size:15px;vertical-align:-3px;margin-right:6px;">info</span>
                            Expected BMS model for this battery:
                            <strong id="step2-expected-model" style="margin-left:4px;font-family:'JetBrains Mono',monospace;"></strong>
                        </div>

                        <div class="form-group">
                            <label class="form-label form-label--required" for="bms-unit-id">BMS Barcode / Serial</label>
                            <input
                                type="text"
                                id="bms-unit-id"
                                class="form-input form-input--scanner"
                                placeholder="⚡ Scan BMS unit barcode"
                                maxlength="64"
                            >
                            <div class="form-hint">Scan the BMS unit barcode. It will be auto-registered if new.</div>
                        </div>

                        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-5);padding-top:var(--space-4);border-top:1px solid var(--color-border-light);">
                            <button type="button" id="btn-bms-reset" class="btn btn--secondary">
                                ← Rescan Battery
                            </button>
                            <button type="button" id="btn-mount-bms" class="btn btn--primary btn--lg"
                                style="display:inline-flex;align-items:center;gap:8px;" disabled>
                                <span class="material-symbols-outlined" style="font-size:20px;">link</span>
                                Mount BMS
                            </button>
                        </div>

                        <div id="bms-mount-result" style="display:none;margin-top:var(--space-4);"></div>
                    </div>

                </div>
            </div>`;
    },

    init() {
        // ── Element refs ──────────────────────────────────────────────────────
        const batteryInput     = document.getElementById('bms-battery-id');
        const batteryLoading   = document.getElementById('bms-battery-loading');
        const batteryInfo      = document.getElementById('bms-battery-info');
        const batteryError     = document.getElementById('bms-battery-error');
        const alreadyMounted   = document.getElementById('bms-already-mounted');
        const alreadyMountedId = document.getElementById('bms-already-mounted-id');

        const infoBatteryId    = document.getElementById('info-battery-id');
        const infoModelId      = document.getElementById('info-model-id');
        const infoBmsModel     = document.getElementById('info-bms-model');

        const step2El          = document.getElementById('bms-step2');
        const step2ExpModel    = document.getElementById('step2-expected-model');
        const bmsUnitInput     = document.getElementById('bms-unit-id');
        const mountBtn         = document.getElementById('btn-mount-bms');
        const resetBtn         = document.getElementById('btn-bms-reset');
        const mountResult      = document.getElementById('bms-mount-result');

        // ── State ─────────────────────────────────────────────────────────────
        let currentBatteryId    = null;
        let expectedBmsModel    = null;
        let isMounting          = false;

        setTimeout(() => batteryInput?.focus(), 100);

        // ── Step 1: Fetch battery info on Enter ───────────────────────────────
        async function _fetchBatteryInfo(batteryId) {
            // Reset
            batteryInfo.style.display    = 'none';
            batteryError.style.display   = 'none';
            alreadyMounted.style.display = 'none';
            step2El.style.display        = 'none';
            step2El.style.opacity        = '0';
            currentBatteryId             = null;
            expectedBmsModel             = null;

            batteryLoading.style.display = 'block';

            const res = await API.get(`/bms/info/${encodeURIComponent(batteryId)}`);

            batteryLoading.style.display = 'none';

            if (!res.success) {
                batteryError.style.display = 'block';
                batteryInput.classList.add('form-input--error');
                return;
            }

            const data = res.data;
            currentBatteryId = data.battery_id;
            expectedBmsModel = data.expected_bms_model;

            // Populate info panel
            infoBatteryId.textContent = data.battery_id;
            infoModelId.textContent   = data.model_id;
            infoBmsModel.textContent  = data.expected_bms_model;
            batteryInfo.style.display = 'block';

            // Show already-mounted warning if applicable
            if (data.bms_already_mounted) {
                alreadyMountedId.textContent  = data.bms_already_mounted;
                alreadyMounted.style.display  = 'block';
            }

            // Show step 2
            step2ExpModel.textContent  = data.expected_bms_model;
            step2El.style.display      = 'block';
            requestAnimationFrame(() => { step2El.style.opacity = '1'; });

            bmsUnitInput.value   = '';
            mountBtn.disabled    = true;
            mountResult.style.display = 'none';
            bmsUnitInput.focus();
        }

        batteryInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = batteryInput.value.trim();
                if (val) _fetchBatteryInfo(val);
            }
        });

        batteryInput.addEventListener('input', () => {
            batteryInput.classList.remove('form-input--error');
            batteryInfo.style.display    = 'none';
            batteryError.style.display   = 'none';
            alreadyMounted.style.display = 'none';
            batteryLoading.style.display = 'none';
            // Hide step 2 if battery changes
            step2El.style.opacity = '0';
            setTimeout(() => {
                if (step2El.style.opacity === '0') step2El.style.display = 'none';
            }, 300);
            currentBatteryId = null;
            expectedBmsModel = null;
        });

        // ── Step 2: Enable mount button when BMS ID entered ───────────────────
        bmsUnitInput.addEventListener('input', () => {
            bmsUnitInput.classList.remove('form-input--error');
            mountBtn.disabled = bmsUnitInput.value.trim().length === 0;
        });

        bmsUnitInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !mountBtn.disabled && !isMounting) {
                e.preventDefault();
                mountBtn.click();
            }
        });

        // ── Mount BMS ─────────────────────────────────────────────────────────
        mountBtn.addEventListener('click', async () => {
            if (isMounting) return;

            const bmsId = bmsUnitInput.value.trim();
            if (!bmsId) {
                bmsUnitInput.classList.add('form-input--error');
                bmsUnitInput.focus();
                Toast.warning('Please scan the BMS unit barcode.');
                return;
            }
            if (!currentBatteryId) {
                Toast.error('No battery selected. Please rescan a battery barcode.');
                return;
            }

            isMounting = true;
            mountBtn.disabled = true;
            mountBtn.innerHTML = '<span class="btn__spinner"></span> Mounting…';
            mountResult.style.display = 'none';

            const res = await API.post('/bms/map-to-battery', {
                bms_id:     bmsId,
                battery_id: currentBatteryId,
            });

            isMounting = false;
            mountBtn.disabled = false;
            mountBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">link</span> Mount BMS';

            if (res.success) {
                const data = res.data || {};
                Toast.success(`BMS ${bmsId} mounted to battery ${currentBatteryId}.`);
                mountResult.style.display = 'block';
                mountResult.innerHTML = `
                    <div class="confirmation confirmation--success">
                        <div class="confirmation__icon">✓</div>
                        <div class="confirmation__title">BMS Mounted Successfully</div>
                        <div class="confirmation__detail">
                            BMS <code>${_esc(bmsId)}</code> linked to
                            Battery <code>${_esc(currentBatteryId)}</code><br>
                            <span style="font-size:12px;color:var(--color-text-tertiary);margin-top:4px;display:block;">
                                Expected model: <strong>${_esc(data.expected_bms_model || expectedBmsModel || '—')}</strong>
                            </span>
                        </div>
                    </div>`;

                // Auto-reset for next battery after 3s
                setTimeout(_fullReset, 3000);

            } else {
                const msg = typeof res.detail === 'string'
                    ? res.detail
                    : (res.message || 'Failed to mount BMS.');
                Toast.error(msg);
                mountResult.style.display = 'block';
                mountResult.innerHTML = `
                    <div class="confirmation confirmation--error">
                        <div class="confirmation__icon">✕</div>
                        <div class="confirmation__title">Mounting Failed</div>
                        <div class="confirmation__detail">${_esc(msg)}</div>
                    </div>`;
            }
        });

        // ── Reset ─────────────────────────────────────────────────────────────
        resetBtn.addEventListener('click', _fullReset);

        function _fullReset() {
            currentBatteryId = null;
            expectedBmsModel = null;

            batteryInput.value = '';
            batteryInput.disabled = false;
            bmsUnitInput.value = '';
            mountBtn.disabled = true;

            batteryLoading.style.display   = 'none';
            batteryInfo.style.display      = 'none';
            batteryError.style.display     = 'none';
            alreadyMounted.style.display   = 'none';
            mountResult.style.display      = 'none';

            step2El.style.opacity = '0';
            setTimeout(() => { step2El.style.display = 'none'; }, 300);

            mountBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">link</span> Mount BMS';

            batteryInput.focus();
        }

        return null;
    }
};

export default BmsMounting;