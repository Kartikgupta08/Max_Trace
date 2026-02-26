/**
 * pdiInspection.js — Pre-Delivery Inspection Page
 *
 * Two sections:
 *   1. Batch Excel upload for PDI inspection data
 *   2. Mark Battery as Ready to Dispatch
 *      — Scans/types Battery ID, calls PATCH /battery/{id}/mark-ready
 *      — Only works when battery is in FG PENDING status
 */

import API from '../../core/api.js';
import Toast from '../../components/toast.js';

const API_BASE = 'http://localhost:8000';

function _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function _formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const PdiInspection = {
    render() {
        return `
        <style>
            /* ── Scoped styles for PDI page ── */
            .pdi-page *, .pdi-page *::before, .pdi-page *::after { box-sizing: border-box; }

            .pdi-page {
                animation: pdi-fade 0.22s ease both;
            }

            @keyframes pdi-fade {
                from { opacity: 0; transform: translateY(6px); }
                to   { opacity: 1; transform: translateY(0); }
            }

            /* ── Ready-to-Dispatch card ── */
            .pdi-rtd-card {
                background: var(--color-bg-card);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-sm);
                overflow: hidden;
                margin-top: 28px;
                max-width: 900px;
            }

            .pdi-rtd-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 24px;
                border-bottom: 1px solid var(--color-border-light);
                background: var(--color-bg-card);
            }

            .pdi-rtd-title-wrap {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .pdi-rtd-icon {
                width: 36px;
                height: 36px;
                border-radius: 9px;
                background: #E3F0FF;
                color: #1565C0;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .pdi-rtd-title {
                font-size: var(--text-base);
                font-weight: 700;
                color: var(--color-text-primary);
                margin: 0;
            }

            .pdi-rtd-sub {
                font-size: 12px;
                color: var(--color-text-tertiary);
                margin: 2px 0 0;
            }

            .pdi-rtd-badge {
                font-size: 11px;
                font-weight: 700;
                color: #1565C0;
                background: #E3F0FF;
                border: 1px solid #AECEF7;
                border-radius: 20px;
                padding: 3px 12px;
                letter-spacing: 0.4px;
                white-space: nowrap;
            }

            /* Body */
            .pdi-rtd-body {
                padding: 24px;
            }

            /* Input row */
            .pdi-rtd-input-row {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 12px;
                align-items: end;
                max-width: 560px;
            }

            @media (max-width: 500px) {
                .pdi-rtd-input-row { grid-template-columns: 1fr; }
            }

            .pdi-rtd-field {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .pdi-rtd-label {
                font-size: 11px;
                font-weight: 700;
                color: var(--color-text-secondary);
                text-transform: uppercase;
                letter-spacing: 0.7px;
            }

            .pdi-rtd-input-wrap {
                position: relative;
                display: flex;
                align-items: center;
            }

            .pdi-rtd-input-icon {
                position: absolute;
                left: 11px;
                color: var(--color-text-tertiary);
                display: flex;
                align-items: center;
                pointer-events: none;
            }

            .pdi-rtd-input {
                width: 100%;
                height: 42px;
                background: var(--color-bg-input);
                border: 1.5px solid var(--color-border-input);
                border-radius: var(--radius-md);
                color: var(--color-text-primary);
                font-family: var(--font-mono);
                font-size: 14px;
                font-weight: 600;
                padding: 0 12px 0 36px;
                outline: none;
                letter-spacing: 0.5px;
                transition: border-color 140ms ease, box-shadow 140ms ease;
            }

            .pdi-rtd-input:focus {
                border-color: var(--color-primary);
                box-shadow: 0 0 0 3px var(--color-primary-surface);
            }

            .pdi-rtd-input::placeholder {
                color: var(--color-text-tertiary);
                font-family: var(--font-family);
                font-weight: 400;
                letter-spacing: 0;
            }

            /* Submit button */
            .pdi-rtd-btn {
                height: 42px;
                padding: 0 22px;
                background: var(--color-primary);
                color: #fff;
                border: none;
                border-radius: var(--radius-md);
                font-family: var(--font-family);
                font-size: var(--text-sm);
                font-weight: 600;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 7px;
                white-space: nowrap;
                box-shadow: 0 1px 4px rgba(27,58,92,0.18);
                transition: background 140ms ease, box-shadow 140ms ease, transform 100ms ease;
            }

            .pdi-rtd-btn:hover:not(:disabled)  {
                background: var(--color-primary-light);
                box-shadow: 0 3px 10px rgba(27,58,92,0.24);
            }

            .pdi-rtd-btn:active:not(:disabled) { transform: scale(0.98); }

            .pdi-rtd-btn:disabled {
                opacity: 0.55;
                cursor: not-allowed;
            }

            /* ── Result feedback ── */
            .pdi-rtd-result {
                margin-top: 18px;
                max-width: 560px;
                border-radius: var(--radius-md);
                padding: 14px 18px;
                display: none;
                align-items: flex-start;
                gap: 12px;
                font-size: var(--text-sm);
                line-height: 1.5;
                animation: pdi-result-in 0.18s ease both;
            }

            @keyframes pdi-result-in {
                from { opacity: 0; transform: translateY(-4px); }
                to   { opacity: 1; transform: translateY(0); }
            }

            .pdi-rtd-result.show { display: flex; }

            .pdi-rtd-result--success {
                background: #E6F4EC;
                border: 1px solid #A8D5BA;
                color: #1A6B3C;
            }

            .pdi-rtd-result--error {
                background: #FDECEA;
                border: 1px solid #F5C0BE;
                color: #B71C1C;
            }

            .pdi-rtd-result--warn {
                background: #FFF3E0;
                border: 1px solid #FCD38A;
                color: #92400E;
            }

            .pdi-rtd-result-icon {
                font-size: 18px;
                flex-shrink: 0;
                margin-top: 1px;
            }

            .pdi-rtd-result-body strong {
                display: block;
                font-weight: 700;
                margin-bottom: 2px;
            }

            /* Hint text below input */
            .pdi-rtd-hint {
                margin-top: 10px;
                font-size: 12px;
                color: var(--color-text-tertiary);
                display: flex;
                align-items: center;
                gap: 5px;
            }

            /* Spinner */
            @keyframes pdi-spin { to { transform: rotate(360deg); } }

            .pdi-spinner {
                width: 14px;
                height: 14px;
                border: 2px solid rgba(255,255,255,0.35);
                border-top-color: #fff;
                border-radius: 50%;
                animation: pdi-spin 0.65s linear infinite;
                flex-shrink: 0;
            }
        </style>

        <div class="content__inner pdi-page">
            <div class="page-header">
                <h1 class="page-header__title">PDI Inspection</h1>
                <p class="page-header__subtitle">Upload inspection files and manage battery dispatch readiness</p>
            </div>

            <!-- ══ SECTION 1: Batch Excel Upload ══ -->
            <div class="production-form" style="max-width:900px;">
                <div class="scanner-section">
                    <div class="scanner-section__header" style="display:flex; justify-content:space-between; align-items:center;">
                        <div class="scanner-section__title">Upload Inspection Files</div>
                        <span style="font-size:12px; font-weight:600; color:var(--color-primary); border:1px solid var(--color-primary); padding:2px 10px; border-radius:var(--radius-sm); letter-spacing:.5px;">PDI</span>
                    </div>

                    <!-- Drop Zone -->
                    <div id="pdi-drop-zone" class="file-uploader" tabindex="0" role="button" aria-label="Upload Excel files" style="min-height:160px; cursor:pointer;">
                        <div class="file-uploader__icon" style="font-size:36px;">📁</div>
                        <div class="file-uploader__text">
                            <strong>Click to upload</strong> or drag and drop
                        </div>
                        <div class="file-uploader__hint">Supported: .xlsx, .xls — Select multiple files (150–200)</div>
                        <input type="file" id="pdi-file-input" accept=".xlsx,.xls" multiple style="display:none;">
                    </div>

                    <!-- File Summary -->
                    <div id="pdi-file-summary" style="display:none; margin-top:var(--space-4); padding:var(--space-4); background:var(--color-bg-body); border:1px solid var(--color-border-light); border-radius:var(--radius-md);">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <span id="pdi-file-count" style="font-size:18px; font-weight:700; color:var(--color-primary);"></span>
                                <span style="font-size:13px; color:var(--color-text-secondary); margin-left:6px;">files selected</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:var(--space-3);">
                                <span id="pdi-total-size" style="font-size:12px; color:var(--color-text-tertiary);"></span>
                                <button type="button" id="btn-clear-files" class="btn btn--secondary" style="padding:4px 12px; font-size:12px;">Clear All</button>
                            </div>
                        </div>
                        <div id="pdi-file-list" style="max-height:200px; overflow-y:auto; margin-top:var(--space-3); border-top:1px solid var(--color-border-light); padding-top:var(--space-3);"></div>
                    </div>

                    <!-- Progress -->
                    <div id="pdi-progress-section" style="display:none; margin-top:var(--space-5);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-2);">
                            <span id="pdi-progress-label" style="font-size:13px; font-weight:600; color:var(--color-text-secondary);">Uploading files...</span>
                            <span id="pdi-progress-percent" style="font-size:13px; font-weight:700; color:var(--color-primary);">0%</span>
                        </div>
                        <div style="width:100%; height:12px; background:var(--color-bg-body); border-radius:6px; overflow:hidden; border:1px solid var(--color-border-light);">
                            <div id="pdi-progress-bar" style="width:0%; height:100%; background:var(--color-primary); border-radius:6px; transition:width 0.3s ease;"></div>
                        </div>
                        <div id="pdi-progress-detail" style="font-size:11px; color:var(--color-text-tertiary); margin-top:var(--space-2); text-align:center;"></div>
                    </div>

                    <!-- Actions -->
                    <div style="display:flex; justify-content:flex-end; margin-top:var(--space-5); padding-top:var(--space-4); border-top:1px solid var(--color-border-light); gap:var(--space-3);">
                        <button type="button" id="btn-reset-pdi" class="btn btn--secondary">Reset</button>
                        <button type="button" id="btn-submit-pdi" class="btn btn--primary btn--lg" disabled style="display:inline-flex; align-items:center; gap:8px;">
                            <span class="material-symbols-outlined" style="font-size:20px;">cloud_upload</span>
                            Upload &amp; Submit
                        </button>
                    </div>
                </div>

                <div id="pdi-result" style="display:none; margin-top:var(--space-6);"></div>
            </div>

            <!-- ══ SECTION 2: Mark Ready to Dispatch ══ -->
            <div class="pdi-rtd-card">

                <div class="pdi-rtd-header">
                    <div class="pdi-rtd-title-wrap">
                        <div class="pdi-rtd-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                        </div>
                        <div>
                            <p class="pdi-rtd-title">Mark Ready to Dispatch</p>
                            <p class="pdi-rtd-sub">Moves battery from FG Pending → Ready to Dispatch</p>
                        </div>
                    </div>
                    <span class="pdi-rtd-badge">FG → READY</span>
                </div>

                <div class="pdi-rtd-body">

                    <div class="pdi-rtd-input-row">
                        <div class="pdi-rtd-field">
                            <label class="pdi-rtd-label" for="rtd-battery-id">Battery ID / Barcode</label>
                            <div class="pdi-rtd-input-wrap">
                                <span class="pdi-rtd-input-icon">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="6" y="2" width="12" height="20" rx="2"/>
                                        <path d="M10 2v2m4-2v2M10 20v2m4-2v2M6 8h12M6 16h12"/>
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    id="rtd-battery-id"
                                    class="pdi-rtd-input"
                                    placeholder="Scan barcode or type Battery ID…"
                                    autocomplete="off"
                                    spellcheck="false"
                                    autofocus
                                />
                            </div>
                        </div>

                        <button type="button" id="rtd-submit-btn" class="pdi-rtd-btn" disabled>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                            Mark Ready
                        </button>
                    </div>

                    <p class="pdi-rtd-hint">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                        </svg>
                        Only batteries with status <strong style="color:var(--color-text-primary);margin:0 3px;">FG PENDING</strong> can be marked as Ready to Dispatch. Press <kbd style="font-size:10px;padding:1px 5px;border:1px solid var(--color-border);border-radius:3px;background:var(--color-bg-body)">Enter</kbd> to submit quickly.
                    </p>

                    <!-- Result feedback -->
                    <div id="rtd-result" class="pdi-rtd-result" role="alert">
                        <span class="pdi-rtd-result-icon" id="rtd-result-icon"></span>
                        <div class="pdi-rtd-result-body" id="rtd-result-body"></div>
                    </div>

                </div>
            </div>

        </div>`;
    },

    init() {

        /* ══════════════════════════════════════════
           SECTION 1 — File Upload (unchanged logic)
        ══════════════════════════════════════════ */
        const dropZone       = document.getElementById('pdi-drop-zone');
        const fileInput      = document.getElementById('pdi-file-input');
        const fileSummary    = document.getElementById('pdi-file-summary');
        const fileCountEl    = document.getElementById('pdi-file-count');
        const totalSizeEl    = document.getElementById('pdi-total-size');
        const fileListEl     = document.getElementById('pdi-file-list');
        const clearBtn       = document.getElementById('btn-clear-files');
        const progressSection= document.getElementById('pdi-progress-section');
        const progressLabel  = document.getElementById('pdi-progress-label');
        const progressPercent= document.getElementById('pdi-progress-percent');
        const progressBar    = document.getElementById('pdi-progress-bar');
        const progressDetail = document.getElementById('pdi-progress-detail');
        const submitBtn      = document.getElementById('btn-submit-pdi');
        const resetBtn       = document.getElementById('btn-reset-pdi');
        const resultEl       = document.getElementById('pdi-result');

        let selectedFiles = [];
        let isUploading   = false;

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
        });

        fileInput.addEventListener('change', e => {
            if (e.target.files.length > 0) _setFiles(Array.from(e.target.files));
        });

        dropZone.addEventListener('dragover', e => {
            e.preventDefault();
            dropZone.classList.add('file-uploader--active');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('file-uploader--active'));
        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            dropZone.classList.remove('file-uploader--active');
            if (e.dataTransfer.files.length > 0) {
                const excel = Array.from(e.dataTransfer.files).filter(f =>
                    f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
                );
                if (!excel.length) { Toast.warning('Please drop only Excel files (.xlsx, .xls).'); return; }
                _setFiles(excel);
            }
        });

        function _setFiles(files) {
            selectedFiles = files;
            const totalSize = files.reduce((s, f) => s + f.size, 0);
            fileCountEl.textContent = files.length;
            totalSizeEl.textContent = 'Total: ' + _formatSize(totalSize);
            fileListEl.innerHTML = files.map((f, i) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px;${i > 0 ? 'border-top:1px solid var(--color-border-light);' : ''}">
                    <span style="color:var(--color-text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%;" title="${_esc(f.name)}">📄 ${_esc(f.name)}</span>
                    <span style="color:var(--color-text-tertiary);flex-shrink:0;">${_formatSize(f.size)}</span>
                </div>`).join('');
            dropZone.classList.add('file-uploader--has-file');
            fileSummary.style.display = 'block';
            submitBtn.disabled = false;
            resultEl.style.display = 'none';
        }

        clearBtn.addEventListener('click', _clearFiles);

        function _clearFiles() {
            selectedFiles = [];
            fileInput.value = '';
            dropZone.classList.remove('file-uploader--has-file');
            fileSummary.style.display = 'none';
            fileListEl.innerHTML = '';
            submitBtn.disabled = true;
        }

        resetBtn.addEventListener('click', () => {
            _clearFiles();
            progressSection.style.display = 'none';
            progressBar.style.width = '0%';
            progressBar.style.background = 'var(--color-primary)';
            resultEl.style.display = 'none';
        });

        submitBtn.addEventListener('click', async () => {
            if (isUploading || !selectedFiles.length) {
                if (!selectedFiles.length) Toast.warning('Please select Excel files to upload.');
                return;
            }

            isUploading = true;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="btn__spinner"></span> Uploading...';
            dropZone.style.pointerEvents = 'none';
            dropZone.style.opacity = '0.5';
            clearBtn.disabled = true;

            progressSection.style.display = 'block';
            progressBar.style.width = '0%';
            progressBar.style.background = 'var(--color-primary)';
            progressLabel.textContent = 'Uploading ' + selectedFiles.length + ' files...';
            progressPercent.textContent = '0%';
            progressDetail.textContent = 'Preparing upload...';

            const formData = new FormData();
            selectedFiles.forEach(f => formData.append('files', f));

            const result = await API.upload('/pdi/upload-batch', formData, pct => {
                progressBar.style.width = pct + '%';
                progressPercent.textContent = pct + '%';
                progressDetail.textContent = pct < 100
                    ? `Uploading... ${pct}% — please wait, do not close this page.`
                    : 'Upload complete. Processing files on server...';
                if (pct >= 100) progressLabel.textContent = 'Processing...';
            });

            isUploading = false;
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">cloud_upload</span> Upload & Submit';
            dropZone.style.pointerEvents = '';
            dropZone.style.opacity = '';
            clearBtn.disabled = false;

            if (result.success) {
                progressBar.style.width = '100%';
                progressBar.style.background = 'var(--color-success, #16a34a)';
                progressPercent.textContent = '100%';
                progressLabel.textContent = 'Upload complete!';
                progressDetail.textContent = '';

                const st = result.data?.stats || {};
                const errors = result.data?.errors || [];
                Toast.success('PDI batch processed — ' + (st.new_entries || 0) + ' new, ' + (st.overwritten_entries || 0) + ' updated.');

                const errorsHtml = errors.length ? `
                    <div style="margin-top:var(--space-3);padding:var(--space-3) var(--space-4);background:var(--color-danger-surface,#fef2f2);border:1px solid var(--color-danger,#dc2626);border-radius:var(--radius-md);font-size:13px;">
                        <strong style="color:var(--color-danger,#dc2626);">⚠ Failed Files:</strong>
                        <div style="margin-top:var(--space-2);max-height:150px;overflow-y:auto;">
                            ${errors.map(e => `
                                <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--color-border-light);">
                                    <span>📄 ${_esc(e.file)}</span>
                                    <span style="color:var(--color-danger,#dc2626);font-size:12px;">${_esc(e.reason)}</span>
                                </div>`).join('')}
                        </div>
                    </div>` : '';

                const hasFailed = (st.failed || 0) > 0;
                resultEl.style.display = 'block';
                resultEl.innerHTML = `
                    <div class="confirmation confirmation--${hasFailed ? 'warning' : 'success'}">
                        <div class="confirmation__icon">${hasFailed ? '⚠' : '✓'}</div>
                        <div class="confirmation__title">${result.data?.status || 'Process Complete'}</div>
                        <div class="confirmation__detail">
                            <div style="display:grid;grid-template-columns:repeat(4,auto);gap:var(--space-2) var(--space-5);font-size:13px;margin-top:var(--space-2);">
                                <span style="font-weight:600;">Total Files</span>
                                <span style="font-weight:600;">New Entries</span>
                                <span style="font-weight:600;">Overwritten</span>
                                <span style="font-weight:600;">Failed</span>
                                <code>${st.total_files ?? '—'}</code>
                                <code>${st.new_entries ?? 0}</code>
                                <code>${st.overwritten_entries ?? 0}</code>
                                <code style="${(st.failed||0)>0?'color:var(--color-danger,#dc2626);font-weight:700;':''}">${st.failed ?? 0}</code>
                            </div>
                            ${errorsHtml}
                        </div>
                    </div>`;

                setTimeout(() => {
                    _clearFiles();
                    progressSection.style.display = 'none';
                    resultEl.style.display = 'none';
                }, 6000);

            } else {
                progressBar.style.background = 'var(--color-danger,#dc2626)';
                progressLabel.textContent = 'Upload failed';
                progressDetail.textContent = '';
                if (result.error === 'VALIDATION_ERROR') {
                    const detail = typeof result.detail === 'string' ? result.detail : JSON.stringify(result.detail);
                    resultEl.style.display = 'block';
                    resultEl.innerHTML = `
                        <div class="confirmation confirmation--error">
                            <div class="confirmation__icon">✕</div>
                            <div class="confirmation__title">Upload Failed</div>
                            <div class="confirmation__detail">${_esc(detail)}</div>
                        </div>`;
                }
            }
        });

        /* ══════════════════════════════════════════
           SECTION 2 — Mark Ready to Dispatch
        ══════════════════════════════════════════ */
        const rtdInput  = document.getElementById('rtd-battery-id');
        const rtdBtn    = document.getElementById('rtd-submit-btn');
        const rtdResult = document.getElementById('rtd-result');
        const rtdIcon   = document.getElementById('rtd-result-icon');
        const rtdBody   = document.getElementById('rtd-result-body');

        let rtdBusy = false;

        /* Enable button only when input has value */
        rtdInput.addEventListener('input', () => {
            rtdBtn.disabled = rtdInput.value.trim().length === 0;
            /* Hide previous result when user starts typing again */
            if (rtdInput.value.trim()) _rtdHideResult();
        });

        /* Enter key submits */
        rtdInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !rtdBtn.disabled && !rtdBusy) _rtdSubmit();
        });

        rtdBtn.addEventListener('click', () => { if (!rtdBusy) _rtdSubmit(); });

        async function _rtdSubmit() {
            const batteryId = rtdInput.value.trim();
            if (!batteryId) return;

            rtdBusy = true;
            rtdBtn.disabled = true;
            rtdBtn.innerHTML = `<span class="pdi-spinner"></span> Marking…`;
            _rtdHideResult();

            try {
                const res = await fetch(
                    `${API_BASE}/battery-models/${encodeURIComponent(batteryId)}/mark-ready`,
                    { method: 'PATCH', headers: { 'Content-Type': 'application/json' } }
                );

                const data = await res.json().catch(() => ({}));

                if (res.ok && data.status === 'success') {
                    /* ✅ Success */
                    _rtdShowResult('success',
                        '✓',
                        `<strong>Marked as Ready to Dispatch</strong>Battery <code style="font-family:var(--font-mono);font-size:12px;padding:1px 5px;background:rgba(0,0,0,0.06);border-radius:3px;">${_esc(batteryId)}</code> is now <strong>READY TO DISPATCH</strong>.`
                    );
                    Toast.success(`${batteryId} → Ready to Dispatch`);
                    rtdInput.value = '';
                    rtdInput.focus();

                } else if (res.status === 404) {
                    /* ❌ Battery not found */
                    _rtdShowResult('error',
                        '✕',
                        `<strong>Battery Not Found</strong>No battery with ID <code style="font-family:var(--font-mono);font-size:12px;padding:1px 5px;background:rgba(0,0,0,0.06);border-radius:3px;">${_esc(batteryId)}</code> exists in the system.`
                    );

                } else if (res.status === 400) {
                    /* ⚠ Wrong status */
                    const detail = data.detail || 'Battery is not in FG PENDING status.';
                    _rtdShowResult('warn',
                        '⚠',
                        `<strong>Cannot Mark as Ready</strong>${_esc(detail)}`
                    );

                } else {
                    /* ❌ Unexpected error */
                    _rtdShowResult('error',
                        '✕',
                        `<strong>Request Failed</strong>${_esc(data.detail || 'An unexpected error occurred. Please try again.')}`
                    );
                }

            } catch (err) {
                _rtdShowResult('error',
                    '✕',
                    `<strong>Network Error</strong>Could not reach the server. Please check your connection.`
                );
            } finally {
                rtdBusy = false;
                rtdBtn.disabled = rtdInput.value.trim().length === 0;
                rtdBtn.innerHTML = `
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    Mark Ready`;
            }
        }

        function _rtdShowResult(type, icon, html) {
            rtdResult.className = `pdi-rtd-result show pdi-rtd-result--${type}`;
            rtdIcon.textContent  = icon;
            rtdBody.innerHTML    = html;
        }

        function _rtdHideResult() {
            rtdResult.className = 'pdi-rtd-result';
        }

        return null;
    }
};

export default PdiInspection;