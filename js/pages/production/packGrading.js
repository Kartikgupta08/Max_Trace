/**
 * packGrading.js — Pack Testing Page (File Upload)
 * 
 * Upload pack-level grading test results (CSV/Excel).
 * 
 * API: POST /api/v1/battery/pack-grading/upload (multipart/form-data)
 */

import API from '../../core/api.js';
import Toast from '../../components/toast.js';
import FileUploader from '../../components/fileUploader.js';

const PackGrading = {
    render() {
        return `
            <div class="content__inner">
                <div class="page-header">
                    <h1 class="page-header__title">Pack Testing</h1>
                    <p class="page-header__subtitle">Upload battery pack testing results file</p>
                </div>

                <div class="production-form">
                    <div class="card">
                        <div class="card__header">
                            <div class="card__title">Upload Pack Testing Data</div>
                        </div>
                        <div class="card__body">
                            ${FileUploader.render({
                                id: 'pack-grading-upload',
                                accept: '.csv,.xlsx,.xls',
                                hint: 'Supported: CSV, XLSX — Contains pack test results'
                            })}
                        </div>
                        <div class="card__footer">
                            <button type="button" id="btn-upload-pack" class="btn btn--primary btn--lg" disabled>
                                Upload & Process
                            </button>
                        </div>
                    </div>

                    <div id="pack-grading-result" style="display:none;"></div>
                </div>
            </div>
        `;
    },

    init() {
        const btn = document.getElementById('btn-upload-pack');
        const resultEl = document.getElementById('pack-grading-result');
        let isSubmitting = false;

        const uploader = FileUploader.init({
            id: 'pack-grading-upload',
            onFileSelect: () => {
                btn.disabled = false;
                resultEl.style.display = 'none';
            }
        });

        btn.addEventListener('click', async () => {
            const file = uploader.getFile();
            if (!file || isSubmitting) return;

            isSubmitting = true;
            btn.disabled = true;
            btn.innerHTML = '<span class="btn__spinner"></span> Uploading...';

            const formData = new FormData();
            formData.append('file', file);

            const result = await API.upload('/batteries/upload-report', formData, (percent) => {
                uploader.setProgress(percent);
            });

            isSubmitting = false;
            btn.disabled = false;
            btn.textContent = 'Upload & Process';

            if (result.success) {
                uploader.setProgress(100);
                Toast.success('Pack testing data processed successfully.');
                resultEl.style.display = 'block';
                const s = result.data?.summary || {};
                const skipped = s.skipped_unregistered || [];

                let skippedHtml = '';
                if (skipped.length > 0) {
                    skippedHtml = `
                        <div style="margin-top:var(--space-3); padding:var(--space-3) var(--space-4); background:var(--color-warning-surface, #fff8e1); border:1px solid var(--color-warning, #f59e0b); border-radius:var(--radius-md); font-size:13px;">
                            <strong style="color:var(--color-warning, #f59e0b);">⚠ Skipped (unregistered):</strong>
                            <span>${skipped.map(id => '<code>' + id + '</code>').join(', ')}</span>
                        </div>
                    `;
                }

                resultEl.innerHTML = `
                    <div class="confirmation confirmation--success">
                        <div class="confirmation__icon">✓</div>
                        <div class="confirmation__title">Upload Successful</div>
                        <div class="confirmation__detail">
                            <div style="display:grid; grid-template-columns:repeat(4, auto); gap:var(--space-2) var(--space-5); font-size:13px; margin-top:var(--space-2);">
                                <span style="font-weight:600;">Total Rows</span>
                                <span style="font-weight:600;">Processed</span>
                                <span style="font-weight:600;">Passed & Updated</span>
                                <span style="font-weight:600;">Marked NG</span>
                                <code>${s.total_rows ?? '—'}</code>
                                <code>${s.processed ?? 0}</code>
                                <code>${s.passed_and_updated ?? 0}</code>
                                <code>${s.marked_as_ng ?? 0}</code>
                            </div>
                            ${skippedHtml}
                        </div>
                    </div>
                `;
                setTimeout(() => {
                    uploader.reset();
                    btn.disabled = true;
                }, 5000);
            } else {
                uploader.setError();
                if (result.error === 'VALIDATION_ERROR') {
                    uploader.showErrors(result.detail);
                }
            }
        });

        return null;
    }
};

export default PackGrading;
