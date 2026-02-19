/**
 * fileUploader.js — Reusable File Upload Component
 * 
 * CSV/Excel upload with drag-and-drop, filename display,
 * progress state, and backend validation error display.
 */

const FileUploader = {
    /**
     * Render file uploader HTML.
     * @param {Object} config
     * @param {string} config.id - Unique ID for this uploader
     * @param {string} [config.accept='.csv,.xlsx,.xls'] - Accepted file types
     * @param {string} [config.hint='Supported: CSV, XLSX']
     * @returns {string} HTML string
     */
    render({ id, accept = '.csv,.xlsx,.xls', hint = 'Supported formats: CSV, XLSX' }) {
        return `
            <div class="file-uploader" id="${id}-zone" tabindex="0" role="button" aria-label="Upload file">
                <div class="file-uploader__icon">📁</div>
                <div class="file-uploader__text">
                    <strong>Click to upload</strong> or drag and drop
                </div>
                <div class="file-uploader__hint">${hint}</div>
                <div class="file-uploader__filename" id="${id}-filename" style="display:none;"></div>
                <div class="progress-bar" id="${id}-progress" style="display:none;">
                    <div class="progress-bar__fill" id="${id}-progress-fill" style="width:0%"></div>
                </div>
                <input type="file" id="${id}-input" accept="${accept}" style="display:none;">
            </div>
            <div id="${id}-errors" class="mt-4" style="display:none;"></div>
        `;
    },

    /**
     * Initialize the file uploader with event handlers.
     * @param {Object} config
     * @param {string} config.id - Same ID used in render
     * @param {Function} [config.onFileSelect] - Callback with File object
     * @returns {Object} Controller { getFile, reset, setProgress, showErrors }
     */
    init({ id, onFileSelect = null }) {
        const zone = document.getElementById(`${id}-zone`);
        const input = document.getElementById(`${id}-input`);
        const filenameEl = document.getElementById(`${id}-filename`);
        const progressEl = document.getElementById(`${id}-progress`);
        const progressFill = document.getElementById(`${id}-progress-fill`);
        const errorsEl = document.getElementById(`${id}-errors`);

        let selectedFile = null;

        // Click opens file dialog
        zone.addEventListener('click', () => input.click());
        zone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                input.click();
            }
        });

        // File selected via dialog
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                _setFile(e.target.files[0]);
            }
        });

        // Drag and drop
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('file-uploader--active');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('file-uploader--active');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('file-uploader--active');
            if (e.dataTransfer.files.length > 0) {
                _setFile(e.dataTransfer.files[0]);
            }
        });

        function _setFile(file) {
            selectedFile = file;
            zone.classList.add('file-uploader--has-file');
            filenameEl.textContent = `📄 ${file.name} (${_formatSize(file.size)})`;
            filenameEl.style.display = 'block';
            progressEl.style.display = 'none';
            errorsEl.style.display = 'none';

            if (onFileSelect) onFileSelect(file);
        }

        function _formatSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }

        // Controller object
        return {
            getFile: () => selectedFile,

            reset() {
                selectedFile = null;
                input.value = '';
                zone.classList.remove('file-uploader--has-file');
                filenameEl.style.display = 'none';
                progressEl.style.display = 'none';
                errorsEl.style.display = 'none';
                progressFill.style.width = '0%';
                progressFill.className = 'progress-bar__fill';
            },

            setProgress(percent) {
                progressEl.style.display = 'block';
                progressFill.style.width = `${percent}%`;
                if (percent >= 100) {
                    progressFill.classList.add('progress-bar__fill--success');
                }
            },

            setError() {
                progressFill.classList.add('progress-bar__fill--error');
            },

            showErrors(errors) {
                errorsEl.style.display = 'block';
                if (Array.isArray(errors)) {
                    errorsEl.innerHTML = `
                        <div class="confirmation confirmation--error" style="text-align:left; padding: var(--space-4);">
                            <div style="font-weight:600; margin-bottom:8px; color:var(--color-error);">Validation Errors:</div>
                            <ul style="list-style:disc; padding-left:20px;">
                                ${errors.map(e => `<li style="font-size:var(--text-sm); margin-bottom:4px;">${_escapeHtml(typeof e === 'string' ? e : e.msg || JSON.stringify(e))}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                } else {
                    errorsEl.innerHTML = `
                        <div class="confirmation confirmation--error">
                            <div class="confirmation__title">${_escapeHtml(String(errors))}</div>
                        </div>
                    `;
                }
            }
        };
    }
};

function _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export default FileUploader;
