/**
 * welding.js — Welding Parameters Page
 *
 * Flow:
 *   1. Operator scans battery barcode
 *   2. Selects welding type from dropdown (Laser Weld / Spot Weld)
 *   3. Parameters for the selected type are shown (editable, with defaults from Excel)
 *   4. Operator reviews / edits, then submits all data as JSON to backend
 *
 * API: POST /api/v1/battery/welding → { battery_id, weld_type, parameters }
 */

import API from '../../core/api.js';
import Toast from '../../components/toast.js';

/* ── Welding parameter templates (defaults from machine spec sheets) ── */

const WELD_TYPES = {
    laser: {
        label: 'Laser Weld',
        sections: [
            {
                title: 'Speed and Delay',
                params: [
                    { key: 'initial_speed', label: 'Initial Speed (mm/s)', value: 50, type: 'number', step: 1 },
                    { key: 'max_speed', label: 'Max Speed (mm/s)', value: 400, type: 'number', step: 1 },
                    { key: 'acceleration', label: 'Acceleration (mm/s)', value: 20, type: 'number', step: 1 },
                    { key: 'laser_on_delay', label: 'Laser On Delay (m/s)', value: 0, type: 'number', step: 0.1 },
                    { key: 'laser_off_delay', label: 'Laser Off Delay (m/s)', value: 0, type: 'number', step: 0.1 },
                    { key: 'point_duration', label: 'Point Duration', value: 100, type: 'number', step: 1 }
                ]
            },
            {
                title: 'Laser Power',
                params: [
                    { key: 'power_mode', label: 'Power Mode', value: 'Constant', type: 'text' },
                    { key: 'pwm_freq', label: 'PWM Freq. (Hz)', value: 1000, type: 'number', step: 1 },
                    { key: 'pwm_cycle', label: 'PWM Cycle (ms)', value: 1, type: 'number', step: 0.1 },
                    { key: 'pwm_duty_rate', label: 'PWM Duty Rate (%)', value: 90, type: 'number', step: 0.1 },
                    { key: 'pwm_width', label: 'PWM Width (ms)', value: 0.9, type: 'number', step: 0.01 },
                    { key: 'code', label: 'Code', value: 0, type: 'number', step: 1 },
                    { key: 'dac_power', label: 'DAC Power (%)', value: 89, type: 'number', step: 0.1 }
                ]
            },
            {
                title: 'LSM',
                params: [
                    { key: 'scan_speed', label: 'Scan Speed (mm/s)', value: 125, type: 'number', step: 1 },
                    { key: 'lsm_laser_on_delay', label: 'Laser On Delay (μs)', value: 0, type: 'number', step: 1 },
                    { key: 'lsm_laser_off_delay', label: 'Laser Off Delay (μs)', value: 0, type: 'number', step: 1 }
                ]
            }
        ]
    },
    spot: {
        label: 'Spot Weld',
        sections: [
            {
                title: 'Basic Parameters — Spot Welding Machine',
                params: [
                    { key: 'solder_joint_mode', label: 'Solder Joint Mode', value: 'Double Point', type: 'text' },
                    { key: 'welding_needle_direction', label: 'Welding Needle Direction', value: 'Y Direction', type: 'text' },
                    { key: 'hole_setback_distance', label: 'Hole Setback Distance (mm)', value: 14, type: 'number', step: 1 },
                    { key: 'total_stroke_welding_head', label: 'Total Stroke of Welding Head (mm)', value: 14, type: 'number', step: 1 },
                    { key: 'start_delay', label: 'Start Delay (ms)', value: 100, type: 'number', step: 1 },
                    { key: 'clamping_delay', label: 'Clamping Delay (ms)', value: 50, type: 'number', step: 1 },
                    { key: 'welding_time', label: 'Welding Time (ms)', value: 75, type: 'number', step: 1 },
                    { key: 'air_speed', label: 'Air Speed (%)', value: 30, type: 'number', step: 1 },
                    { key: 'working_speed', label: 'Working Speed (%)', value: 200, type: 'number', step: 1 },
                    { key: 'hole_inlet_speed', label: 'Hole Inlet Speed (%)', value: 170, type: 'number', step: 1 }
                ]
            }
        ]
    }
};

function _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

/* ── Component ───────────────────────────────────────────────────── */
const Welding = {
    render() {
        return `
            <div class="content__inner">
                <div class="page-header">
                    <h1 class="page-header__title">Welding</h1>
                    <p class="page-header__subtitle">Enter battery barcode, select welding type, review parameters, and submit.</p>
                </div>

                <div class="production-form" style="max-width:1000px;">
                    <div class="scanner-section">
                        <div class="scanner-section__header" style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="scanner-section__title">Welding Parameters</div>
                            <span style="font-size:12px; font-weight:600; color:var(--color-primary); border:1px solid var(--color-primary); padding:2px 10px; border-radius:var(--radius-sm); letter-spacing:.5px;">WELD</span>
                        </div>

                        <form id="welding-form" autocomplete="off">
                            <!-- Battery Barcode -->
                            <div class="form-group">
                                <label class="form-label form-label--required" for="weld-battery-id">Battery Barcode</label>
                                <input
                                    type="text"
                                    id="weld-battery-id"
                                    class="form-input form-input--scanner"
                                    placeholder="🔋 Scan battery barcode"
                                    required
                                    autofocus
                                    maxlength="64"
                                >
                            </div>

                            <!-- Welding Type Dropdown -->
                            <div class="form-group" id="weld-type-group" style="display:none;">
                                <label class="form-label form-label--required" for="weld-type-select">Welding Type</label>
                                <select id="weld-type-select" class="form-select" required>
                                    <option value="">Select welding type</option>
                                    <option value="laser">Laser Weld</option>
                                    <option value="spot">Spot Weld</option>
                                </select>
                            </div>

                            <!-- Parameters (shown after weld type selected) -->
                            <div id="weld-params-section" style="display:none; margin-top:var(--space-6);"></div>

                            <div style="display:flex; justify-content:flex-end; margin-top:var(--space-4); padding-top:var(--space-4); border-top:1px solid var(--color-border-light);">
                                <button type="submit" id="btn-submit-welding" class="btn btn--primary btn--lg" disabled style="display:inline-flex; align-items:center; gap:8px;">
                                    <span class="material-symbols-outlined" style="font-size:20px;">bolt</span>
                                    Submit Welding Data
                                </button>
                            </div>
                        </form>
                    </div>

                    <div id="welding-result" style="display:none; margin-top:var(--space-6);"></div>
                </div>
            </div>
        `;
    },

    init() {
        const form = document.getElementById('welding-form');
        const batteryInput = document.getElementById('weld-battery-id');
        const weldTypeGroup = document.getElementById('weld-type-group');
        const weldTypeSelect = document.getElementById('weld-type-select');
        const paramsSection = document.getElementById('weld-params-section');
        const submitBtn = document.getElementById('btn-submit-welding');
        const resultEl = document.getElementById('welding-result');

        let isSubmitting = false;

        setTimeout(() => batteryInput?.focus(), 100);

        // ── Fetch welding type from backend for a battery ID ──
        async function _fetchWeldingType(batteryId) {
            weldTypeGroup.style.display = 'block';
            weldTypeSelect.value = '';
            weldTypeSelect.disabled = true;
            paramsSection.innerHTML = '';
            paramsSection.style.display = 'none';
            submitBtn.disabled = true;

            // Show loading state in dropdown
            weldTypeSelect.innerHTML = '<option value="">Fetching welding type...</option>';

            const result = await API.get(`/battery-models/${encodeURIComponent(batteryId)}/welding-info`);

            // Restore dropdown options
            weldTypeSelect.innerHTML = `
                <option value="">Select welding type</option>
                <option value="laser">Laser Weld</option>
                <option value="spot">Spot Weld</option>
            `;
            weldTypeSelect.disabled = false;

            if (result.success && result.data?.welding_type) {
                const weldType = result.data.welding_type.toLowerCase(); // "Laser" → "laser", "Spot" → "spot"
                if (WELD_TYPES[weldType]) {
                    weldTypeSelect.value = weldType;
                    _renderParams(WELD_TYPES[weldType]);
                    submitBtn.disabled = false;
                    Toast.success(`Welding type auto-detected: ${result.data.welding_type}`);
                } else {
                    Toast.warning(`Unknown welding type "${result.data.welding_type}". Please select manually.`);
                    weldTypeSelect.focus();
                }
            } else {
                const msg = result.detail || result.message || 'Could not fetch welding type.';
                Toast.warning(msg + ' Please select manually.');
                weldTypeSelect.focus();
            }
        }

        // ── Battery barcode entered → auto-fetch welding type ──
        batteryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = batteryInput.value.trim();
                if (val) {
                    _fetchWeldingType(val);
                }
            }
        });

        batteryInput.addEventListener('input', () => {
            batteryInput.classList.remove('form-input--error');
            if (!batteryInput.value.trim()) {
                weldTypeGroup.style.display = 'none';
                weldTypeSelect.value = '';
                paramsSection.innerHTML = '';
                paramsSection.style.display = 'none';
                submitBtn.disabled = true;
            }
        });

        // Also fetch on blur if value exists
        batteryInput.addEventListener('blur', () => {
            const val = batteryInput.value.trim();
            if (val && weldTypeSelect.value === '' && weldTypeGroup.style.display === 'none') {
                _fetchWeldingType(val);
            }
        });

        // ── Weld type selected → render editable parameters ──
        weldTypeSelect.addEventListener('change', () => {
            const key = weldTypeSelect.value;
            if (!key) {
                paramsSection.innerHTML = '';
                paramsSection.style.display = 'none';
                submitBtn.disabled = true;
                return;
            }

            const cfg = WELD_TYPES[key];
            if (!cfg) return;

            _renderParams(cfg);
            submitBtn.disabled = false;
        });

        // ── Render editable parameter sections ───────────────
        function _renderParams(cfg) {
            let html = '';
            cfg.sections.forEach((section, sIdx) => {
                html += `
                    <div style="margin-bottom:var(--space-5); padding:var(--space-5); background:var(--color-bg-body); border:1px solid var(--color-border-light); border-radius:var(--radius-md);">
                        <div style="font-size:13px; font-weight:700; color:var(--color-primary); margin-bottom:var(--space-4); text-transform:uppercase; letter-spacing:.5px; border-bottom:2px solid var(--color-primary-surface); padding-bottom:var(--space-2);">${_esc(section.title)}</div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
                `;

                section.params.forEach(param => {
                    const inputType = param.type === 'text' ? 'text' : 'number';
                    const stepAttr = param.type === 'number' ? ' step="' + (param.step || 1) + '"' : '';
                    html += `
                        <div class="form-group" style="margin-bottom:0;">
                            <label class="form-label" style="font-size:12px;">${_esc(param.label)}</label>
                            <input
                                type="${inputType}"
                                class="form-input weld-param-input"
                                data-key="${_esc(param.key)}"
                                data-section="${sIdx}"
                                value="${_esc(String(param.value))}"
                                ${stepAttr}
                            >
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            });

            paramsSection.innerHTML = html;
            paramsSection.style.display = 'block';
        }

        function _collectParams() {
            const inputs = paramsSection.querySelectorAll('.weld-param-input');
            const params = {};
            inputs.forEach(inp => {
                const key = inp.getAttribute('data-key');
                const val = inp.type === 'number' ? parseFloat(inp.value) || 0 : inp.value;
                params[key] = val;
            });
            return params;
        }

        // ── Form submit ──────────────────────────────────────
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isSubmitting) return;

            const batteryId = batteryInput.value.trim();
            const weldType = weldTypeSelect.value;

            if (!batteryId) {
                batteryInput.classList.add('form-input--error');
                batteryInput.focus();
                Toast.warning('Please scan the Battery Barcode.');
                return;
            }
            if (!weldType) {
                Toast.warning('Please select a Welding Type.');
                weldTypeSelect.focus();
                return;
            }

            const params = _collectParams();
            const weldLabel = WELD_TYPES[weldType]?.label || weldType;

            isSubmitting = true;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="btn__spinner"></span> Submitting...';

            const result = await API.post('/welding/submit', {
                battery_id: batteryId,
                weld_type: weldType,
                parameters: params
            });

            isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">bolt</span> Submit Welding Data';

            if (result.success) {
                Toast.success('Welding data saved for battery ' + batteryId + '.');
                resultEl.style.display = 'block';
                resultEl.innerHTML = `
                    <div class="confirmation confirmation--success">
                        <div class="confirmation__icon">✓</div>
                        <div class="confirmation__title">Welding Data Submitted</div>
                        <div class="confirmation__detail">
                            Battery <code>${_esc(batteryId)}</code> — ${_esc(weldLabel)} parameters recorded.
                        </div>
                    </div>
                `;

                form.reset();
                weldTypeGroup.style.display = 'none';
                paramsSection.innerHTML = '';
                paramsSection.style.display = 'none';
                submitBtn.disabled = true;

                setTimeout(() => {
                    resultEl.style.display = 'none';
                    batteryInput.focus();
                }, 3000);
            } else if (result.error === 'VALIDATION_ERROR') {
                resultEl.style.display = 'block';
                resultEl.innerHTML = `
                    <div class="confirmation confirmation--error">
                        <div class="confirmation__icon">✕</div>
                        <div class="confirmation__title">Submission Failed</div>
                        <div class="confirmation__detail">${_esc(typeof result.detail === 'string' ? result.detail : JSON.stringify(result.detail))}</div>
                    </div>
                `;
            }
        });

        return null;
    }
};

export default Welding;
