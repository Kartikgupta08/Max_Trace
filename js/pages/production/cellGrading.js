/**
 * cellGrading.js — Cell Grading Page (File Upload)
 * 
 * Operators upload CSV/Excel files containing cell grading test results.
 * Backend validates and processes the file.
 * 
 * API: POST /api/v1/cells/grading/upload (multipart/form-data)
 */

import API from '../../core/api.js';
import Toast from '../../components/toast.js';
import FileUploader from '../../components/fileUploader.js';

const CellGrading = {
    render() {
        return `
            <div class="content__inner">
                <div class="page-header">
                    <h1 class="page-header__title">Cell Grading</h1>
                    <p class="page-header__subtitle">Upload cell grading test results file (CSV or Excel)</p>
                </div>

                <div class="production-form">
                    <div class="card">
                        <div class="card__header">
                            <div class="card__title">Upload Grading Data</div>
                        </div>
                        <div class="card__body">
                            ${FileUploader.render({
                                id: 'grading-upload',
                                accept: '.csv,.xlsx,.xls',
                                hint: 'Supported formats: CSV, XLSX — Max 10MB'
                            })}
                        </div>
                        <div class="card__footer">
                            <button type="button" id="btn-upload-grading" class="btn btn--primary btn--lg" disabled>
                                Upload & Process
                            </button>
                        </div>
                    </div>

                    <!-- Upload result area -->
                    <div id="grading-result" style="display:none;"></div>
                </div>
            </div>
        `;
    },

    init() {
        const btn = document.getElementById('btn-upload-grading');
        const resultEl = document.getElementById('grading-result');
        let isSubmitting = false;

        // Initialize file uploader
        const uploader = FileUploader.init({
            id: 'grading-upload',
            onFileSelect: (file) => {
                btn.disabled = false;
                resultEl.style.display = 'none';
            }
        });

        // Upload handler
        btn.addEventListener('click', async () => {
            const file = uploader.getFile();
            if (!file || isSubmitting) return;

            isSubmitting = true;
            btn.disabled = true;
            btn.innerHTML = '<span class="btn__spinner"></span> Uploading...';

            const formData = new FormData();
            formData.append('file', file);

            const result = await API.upload('/cells/upload-grading', formData, (percent) => {
                uploader.setProgress(percent);
            });

            isSubmitting = false;
            btn.disabled = false;
            btn.textContent = 'Upload & Process';

            if (result.success) {
                uploader.setProgress(100);
                Toast.success('Grading data uploaded and processed successfully.');
                resultEl.style.display = 'block';

                const data = result.data || {};
                const summary = data.summary || {};
                const total = (summary.success || 0) + (summary.skipped || 0) + (summary.errors || 0);
                resultEl.innerHTML = `
                    <div class="confirmation confirmation--success">
                        <div class="confirmation__icon">✓</div>
                        <div class="confirmation__title">Upload Successful</div>
                        <div class="confirmation__detail">
                            Processed <code>${total}</code> records.
                            <code>${summary.success || 0}</code> graded,
                            <code>${summary.skipped || 0}</code> skipped,
                            <code>${summary.errors || 0}</code> errors (cell not found).
                        </div>
                    </div>
                `;

                // Reset for next upload
                setTimeout(() => {
                    uploader.reset();
                    btn.disabled = true;
                }, 4000);
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

        return () => {
            // Cleanup if needed
        };
    }
};

export default CellGrading;
