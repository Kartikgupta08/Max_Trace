/**
 * pdiInspection.js — Pre-Delivery Inspection Page
 *
 * Operator uploads 150–200 Excel files for PDI inspection data.
 * Files are sent to the backend via FormData with XHR progress tracking.
 * A progress bar keeps the operator informed during the upload.
 *
 * API: POST /api/v1/battery/pdi-inspection  (multipart/form-data)
 */

import API from '../../core/api.js';
import Toast from '../../components/toast.js';

function _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function _formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const PdiInspection = {
    render() {
        return `
            <div class="content__inner">
                <div class="page-header">
                    <h1 class="page-header__title">PDI Inspection</h1>
                    <p class="page-header__subtitle">Upload Excel files for Pre-Delivery Inspection data</p>
                </div>

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

                        <!-- File Summary (shown after selection) -->
                        <div id="pdi-file-summary" style="display:none; margin-top:var(--space-4); padding:var(--space-4); background:var(--color-bg-body); border:1px solid var(--color-border-light); border-radius:var(--radius-md);">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <span id="pdi-file-count" style="font-size:18px; font-weight:700; color:var(--color-primary);"></span>
                                    <span style="font-size:13px; color:var(--color-text-secondary); margin-left:6px;">files selected</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:var(--space-3);">
                                    <span id="pdi-total-size" style="font-size:12px; color:var(--color-text-tertiary);"></span>
                                    <button type="button" id="btn-clear-files" class="btn btn--secondary" style="padding:4px 12px; font-size:12px;">
                                        Clear All
                                    </button>
                                </div>
                            </div>
                            <!-- File list (scrollable) -->
                            <div id="pdi-file-list" style="max-height:200px; overflow-y:auto; margin-top:var(--space-3); border-top:1px solid var(--color-border-light); padding-top:var(--space-3);"></div>
                        </div>

                        <!-- Progress Section (shown during upload) -->
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
                            <button type="button" id="btn-reset-pdi" class="btn btn--success">
                                Reset
                            </button>
                            <button type="button" id="btn-submit-pdi" class="btn btn--primary btn--lg" disabled style="display:inline-flex; align-items:center; gap:8px;">
                                <span class="material-symbols-outlined" style="font-size:20px;">cloud_upload</span>
                                Upload &amp; Submit
                            </button>
                        </div>
                    </div>

                    <div id="pdi-result" style="display:none; margin-top:var(--space-6);"></div>
                </div>
            </div>
        `;
    },

    init() {
        const dropZone = document.getElementById('pdi-drop-zone');
        const fileInput = document.getElementById('pdi-file-input');
        const fileSummary = document.getElementById('pdi-file-summary');
        const fileCountEl = document.getElementById('pdi-file-count');
        const totalSizeEl = document.getElementById('pdi-total-size');
        const fileListEl = document.getElementById('pdi-file-list');
        const clearBtn = document.getElementById('btn-clear-files');
        const progressSection = document.getElementById('pdi-progress-section');
        const progressLabel = document.getElementById('pdi-progress-label');
        const progressPercent = document.getElementById('pdi-progress-percent');
        const progressBar = document.getElementById('pdi-progress-bar');
        const progressDetail = document.getElementById('pdi-progress-detail');
        const submitBtn = document.getElementById('btn-submit-pdi');
        const resetBtn = document.getElementById('btn-reset-pdi');
        const resultEl = document.getElementById('pdi-result');

        let selectedFiles = [];
        let isUploading = false;

        // ── Drop zone click → open file dialog ──────────────
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
        });

        // ── File selection via dialog ────────────────────────
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                _setFiles(Array.from(e.target.files));
            }
        });

        // ── Drag and drop ────────────────────────────────────
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('file-uploader--active');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('file-uploader--active');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('file-uploader--active');
            if (e.dataTransfer.files.length > 0) {
                // Filter to only Excel files
                const excelFiles = Array.from(e.dataTransfer.files).filter(f =>
                    f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
                );
                if (excelFiles.length === 0) {
                    Toast.warning('Please drop only Excel files (.xlsx, .xls).');
                    return;
                }
                _setFiles(excelFiles);
            }
        });

        // ── Set files + show summary ─────────────────────────
        function _setFiles(files) {
            selectedFiles = files;
            const totalSize = files.reduce((sum, f) => sum + f.size, 0);

            fileCountEl.textContent = files.length;
            totalSizeEl.textContent = 'Total: ' + _formatSize(totalSize);

            // Build scrollable file list
            let listHtml = '';
            files.forEach((f, i) => {
                listHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; font-size:12px; ${i > 0 ? 'border-top:1px solid var(--color-border-light);' : ''}">
                        <span style="color:var(--color-text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;" title="${_esc(f.name)}">📄 ${_esc(f.name)}</span>
                        <span style="color:var(--color-text-tertiary); flex-shrink:0;">${_formatSize(f.size)}</span>
                    </div>
                `;
            });
            fileListEl.innerHTML = listHtml;

            dropZone.classList.add('file-uploader--has-file');
            fileSummary.style.display = 'block';
            submitBtn.disabled = false;
            resultEl.style.display = 'none';
        }

        // ── Clear files ──────────────────────────────────────
        clearBtn.addEventListener('click', _clearFiles);

        function _clearFiles() {
            selectedFiles = [];
            fileInput.value = '';
            dropZone.classList.remove('file-uploader--has-file');
            fileSummary.style.display = 'none';
            fileListEl.innerHTML = '';
            submitBtn.disabled = true;
        }

        // ── Reset everything ─────────────────────────────────
        resetBtn.addEventListener('click', () => {
            _clearFiles();
            progressSection.style.display = 'none';
            progressBar.style.width = '0%';
            progressBar.style.background = 'var(--color-primary)';
            resultEl.style.display = 'none';
        });

        // ── Submit / Upload ──────────────────────────────────
        submitBtn.addEventListener('click', async () => {
            if (isUploading) return;
            if (selectedFiles.length === 0) {
                Toast.warning('Please select Excel files to upload.');
                return;
            }

            isUploading = true;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="btn__spinner"></span> Uploading...';
            dropZone.style.pointerEvents = 'none';
            dropZone.style.opacity = '0.5';
            clearBtn.disabled = true;

            // Show progress bar
            progressSection.style.display = 'block';
            progressBar.style.width = '0%';
            progressBar.style.background = 'var(--color-primary)';
            progressLabel.textContent = 'Uploading ' + selectedFiles.length + ' files...';
            progressPercent.textContent = '0%';
            progressDetail.textContent = 'Preparing upload...';

            // Build FormData with all files
            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });

            const result = await API.upload('/pdi/upload-batch', formData, (percent) => {
                progressBar.style.width = percent + '%';
                progressPercent.textContent = percent + '%';
                if (percent < 100) {
                    progressDetail.textContent = 'Uploading... ' + percent + '% — please wait, do not close this page.';
                } else {
                    progressDetail.textContent = 'Upload complete. Processing files on server...';
                    progressLabel.textContent = 'Processing...';
                }
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
                const hasFailed = (st.failed || 0) > 0;

                Toast.success('PDI batch processed — ' + (st.new_entries || 0) + ' new, ' + (st.overwritten_entries || 0) + ' updated.');

                let errorsHtml = '';
                if (errors.length > 0) {
                    errorsHtml = `
                        <div style="margin-top:var(--space-3); padding:var(--space-3) var(--space-4); background:var(--color-danger-surface, #fef2f2); border:1px solid var(--color-danger, #dc2626); border-radius:var(--radius-md); font-size:13px;">
                            <strong style="color:var(--color-danger, #dc2626);">⚠ Failed Files:</strong>
                            <div style="margin-top:var(--space-2); max-height:150px; overflow-y:auto;">
                                ${errors.map(e => `
                                    <div style="display:flex; justify-content:space-between; padding:3px 0; border-bottom:1px solid var(--color-border-light);">
                                        <span>📄 ${_esc(e.file)}</span>
                                        <span style="color:var(--color-danger, #dc2626); font-size:12px;">${_esc(e.reason)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                resultEl.style.display = 'block';
                resultEl.innerHTML = `
                    <div class="confirmation confirmation--${hasFailed ? 'warning' : 'success'}">
                        <div class="confirmation__icon">${hasFailed ? '⚠' : '✓'}</div>
                        <div class="confirmation__title">${result.data?.status || 'Process Complete'}</div>
                        <div class="confirmation__detail">
                            <div style="display:grid; grid-template-columns:repeat(4, auto); gap:var(--space-2) var(--space-5); font-size:13px; margin-top:var(--space-2);">
                                <span style="font-weight:600;">Total Files</span>
                                <span style="font-weight:600;">New Entries</span>
                                <span style="font-weight:600;">Overwritten</span>
                                <span style="font-weight:600;">Failed</span>
                                <code>${st.total_files ?? '—'}</code>
                                <code>${st.new_entries ?? 0}</code>
                                <code>${st.overwritten_entries ?? 0}</code>
                                <code style="${(st.failed || 0) > 0 ? 'color:var(--color-danger, #dc2626);font-weight:700;' : ''}">${st.failed ?? 0}</code>
                            </div>
                            ${errorsHtml}
                        </div>
                    </div>
                `;

                // Reset after a delay
                setTimeout(() => {
                    _clearFiles();
                    progressSection.style.display = 'none';
                    resultEl.style.display = 'none';
                }, 6000);
            } else {
                progressBar.style.background = 'var(--color-danger, #dc2626)';
                progressLabel.textContent = 'Upload failed';
                progressDetail.textContent = '';

                if (result.error === 'VALIDATION_ERROR') {
                    resultEl.style.display = 'block';
                    const detail = typeof result.detail === 'string' ? result.detail : JSON.stringify(result.detail);
                    resultEl.innerHTML = `
                        <div class="confirmation confirmation--error">
                            <div class="confirmation__icon">✕</div>
                            <div class="confirmation__title">Upload Failed</div>
                            <div class="confirmation__detail">${_esc(detail)}</div>
                        </div>
                    `;
                }
            }
        });

        return null;
    }
};

export default PdiInspection;
