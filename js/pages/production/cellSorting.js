/**
 * cellSorting.js — Cell Sorting Page (File Upload)
 *
 * Operators upload CSV/Excel files containing cell sorting data.
 * Backend validates and processes the file.
 *
 * API: POST /cells/upload-sorting (multipart/form-data)
 */

import API          from '../../core/api.js';
import Toast        from '../../components/toast.js';
import FileUploader from '../../components/fileUploader.js';

const CellSorting = {
    render() {
        return `
            <div class="content__inner">
                <div class="page-header">
                    <h1 class="page-header__title">Cell Sorting</h1>
                    <p class="page-header__subtitle">Upload cell sorting data file (Excel)</p>
                </div>

                <div class="production-form">
                    <div class="card">
                        <div class="card__header">
                            <div class="card__title">Upload Sorting Data</div>
                        </div>
                        <div class="card__body">
                            ${FileUploader.render({
                                id:     'sorting-upload',
                                accept: '.xlsx,.xls',
                                hint:   'Supported formats: XLSX, XLS — Max 10 MB'
                            })}
                        </div>
                        <div class="card__footer">
                            <button type="button" id="btn-upload-sorting"
                                class="btn btn--primary btn--lg" disabled>
                                Upload &amp; Process
                            </button>
                        </div>
                    </div>

                    <div id="sorting-result" style="display:none;margin-top:var(--space-5);"></div>
                </div>
            </div>`;
    },

    init() {
        const btn      = document.getElementById('btn-upload-sorting');
        const resultEl = document.getElementById('sorting-result');
        let isSubmitting = false;

        // ── Default button label
        const BTN_DEFAULT = 'Upload &amp; Process';

        const uploader = FileUploader.init({
            id: 'sorting-upload',
            onFileSelect: () => {
                btn.disabled           = false;
                resultEl.style.display = 'none';
            }
        });

        btn.addEventListener('click', async () => {
            const file = uploader.getFile();
            if (!file || isSubmitting) return;

            isSubmitting   = true;
            btn.disabled   = true;
            btn.innerHTML  = '<span class="btn__spinner"></span> Uploading…';

            const formData = new FormData();
            formData.append('file', file);

            const result = await API.upload('/cells/upload-sorting', formData, pct => {
                uploader.setProgress(pct);
            });

            isSubmitting  = false;
            btn.disabled  = false;
            // FIX #5 — always restore via innerHTML so spinner is fully replaced
            btn.innerHTML = BTN_DEFAULT;

            if (result.success) {
                uploader.setProgress(100);
                Toast.success('Sorting data uploaded and processed successfully.');

                // FIX #6 — backend now returns "sorted" not "success"
                // FIX #7 — show not_found and missing_data counts
                const summary = result.data?.summary || {};
                const total   = (summary.sorted       || 0)
                              + (summary.not_graded   || 0)
                              + (summary.not_found    || 0)
                              + (summary.missing_data || 0)
                              + (summary.errors       || 0);

                const errorsHtml = result.data?.errors?.length
                    ? `<div style="margin-top:var(--space-3);padding:var(--space-3) var(--space-4);
                            background:var(--color-error-bg);border:1px solid var(--color-error-border);
                            border-radius:var(--radius-md);font-size:12px;">
                            <strong style="color:var(--color-error);">
                                ⚠ ${result.data.errors.length} row(s) had issues:
                            </strong>
                            <div style="margin-top:var(--space-2);max-height:120px;overflow-y:auto;">
                                ${result.data.errors.map(e =>
                                    `<div style="padding:3px 0;border-bottom:1px solid var(--color-error-border);">
                                        <strong>${_esc(e.cell_id)}</strong> — ${_esc(e.reason)}
                                    </div>`
                                ).join('')}
                            </div>
                        </div>`
                    : '';

                resultEl.style.display = 'block';
                resultEl.innerHTML = `
                    <div class="confirmation confirmation--success">
                        <div class="confirmation__icon">✓</div>
                        <div class="confirmation__title">Upload Successful</div>
                        <div class="confirmation__detail">
                            File <code>${_esc(file.name)}</code> — processed <code>${total}</code> records:<br>
                            <code>${summary.sorted       || 0}</code> sorted,
                            <code>${summary.not_graded   || 0}</code> not yet graded,
                            <code>${summary.not_found    || 0}</code> not found in system,
                            <code>${summary.missing_data || 0}</code> missing IR/voltage data,
                            <code>${summary.errors       || 0}</code> errors.
                            ${errorsHtml}
                        </div>
                    </div>`;

                setTimeout(() => {
                    uploader.reset();
                    btn.disabled = true;
                }, 5000);

            } else {
                uploader.setError();
                if (result.error === 'VALIDATION_ERROR') {
                    uploader.showErrors(result.detail);
                } else {
                    const msg = result.detail || result.message || 'Upload failed. Please try again.';
                    Toast.error(typeof msg === 'string' ? msg : 'Upload failed.');
                }
            }
        });

        return () => {};
    }
};

function _esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str ?? '');
    return d.innerHTML;
}

export default CellSorting;