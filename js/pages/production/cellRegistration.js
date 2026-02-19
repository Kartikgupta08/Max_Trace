/**
 * cellRegistration.js — Cell Registration Page
 * 
 * Operators scan individual cell barcodes to register them into the system.
 * Single-purpose, large input, auto-focus, keyboard-friendly.
 * Shows the last 5 registered cells with Cell ID, Registration Date & Time.
 * Refresh button clears the list so new cells can be entered.
 */

import API from '../../core/api.js';
import Toast from '../../components/toast.js';

/* ── Local store for recently registered cells (max 5) ── */
let recentCells = [];

function _saveRecent() {
    localStorage.setItem('mt_recent_cells', JSON.stringify(recentCells));
}

/** Fetch recent registrations from the backend, fall back to localStorage */
async function _loadRecentCells() {
    try {
        const result = await API.get('/cells/recent-registrations');
        if (result.success && Array.isArray(result.data)) {
            recentCells = result.data.map(c => {
                const d = c.registration_date ? new Date(c.registration_date) : new Date();
                return {
                    cellId: c.cell_id,
                    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
                };
            });
            _saveRecent();
            return;
        }
    } catch (_) { /* ignore */ }
    // Fallback to localStorage
    recentCells = JSON.parse(localStorage.getItem('mt_recent_cells') || '[]').slice(0, 5);
}

const CellRegistration = {
    render() {
        return `
            <div class="content__inner">
                <div class="page-header">
                    <h1 class="page-header__title">Cell Registration</h1>
                    <p class="page-header__subtitle">Scan or enter cell barcode to register a new cell into the system</p>
                </div>

                <div class="production-form">
                    <div class="scanner-section">
                        <div class="scanner-section__header">
                            <div class="scanner-section__icon">
                                <span class="material-symbols-outlined">qr_code_scanner</span>
                            </div>
                            <div>
                                <div class="scanner-section__title">Scan Cell Barcode</div>
                                <div class="scanner-section__subtitle">Place cursor in field, then scan barcode with scanner</div>
                            </div>
                        </div>

                        <form id="cell-reg-form" autocomplete="off">
                            <div class="form-group">
                                <label class="form-label form-label--required" for="cell-id">Cell ID</label>
                                <input
                                    type="text"
                                    id="cell-id"
                                    class="form-input form-input--scanner"
                                    placeholder="Scan or type Cell ID..."
                                    required
                                    autofocus
                                    maxlength="64"
                                >
                                <div class="form-hint">Barcode scanner will auto-submit after scan</div>
                            </div>

                            <button type="submit" id="btn-register" class="btn btn--primary btn--lg btn--full">
                                Register Cell
                            </button>
                        </form>
                    </div>

                    <!-- Confirmation area (shown after submit) -->
                    <div id="reg-confirmation" style="display:none;"></div>
                </div>

                <!-- Recently Added Cells (last 5) -->
                <div class="card" style="margin-top:24px;">
                    <div class="card__header" style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border-default, #E2E6ED);">
                        <h3 style="font-size:15px;font-weight:600;margin:0;">Recently Added Cells</h3>
                        <button type="button" id="btn-refresh-cells" class="btn btn--primary btn--sm" title="Clear list and start fresh">
                            <span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle;">refresh</span>
                            Refresh
                        </button>
                    </div>
                    <div class="card__body" id="recent-cells-list" style="padding:16px 20px;">
                        <!-- rendered by JS -->
                    </div>
                </div>
            </div>
        `;
    },

    init() {
        const form = document.getElementById('cell-reg-form');
        const cellIdInput = document.getElementById('cell-id');
        const btn = document.getElementById('btn-register');
        const confirmationEl = document.getElementById('reg-confirmation');
        const refreshBtn = document.getElementById('btn-refresh-cells');

        let isSubmitting = false;

        // Auto-focus scanner input
        setTimeout(() => cellIdInput?.focus(), 100);

        // Load recent cells from backend, then render
        _loadRecentCells().then(() => _renderRecentCells());

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isSubmitting) return;

            const cellId = cellIdInput.value.trim();

            // Validation
            if (!cellId) {
                cellIdInput.classList.add('form-input--error');
                cellIdInput.focus();
                return;
            }

            // Prevent double submission
            isSubmitting = true;
            btn.disabled = true;
            btn.innerHTML = '<span class="btn__spinner"></span> Registering...';

            // POST /cells/register/{cell_id} — cell_id goes in the URL path
            const result = await API.post(`/cells/register/${encodeURIComponent(cellId)}`);

            isSubmitting = false;
            btn.disabled = false;
            btn.textContent = 'Register Cell';

            if (result.success) {
                Toast.success(`Cell ${cellId} registered successfully.`);

                // Add to recent cells list (keep max 5, newest first)
                const now = new Date();
                recentCells.unshift({
                    cellId,
                    date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
                });
                if (recentCells.length > 5) recentCells = recentCells.slice(0, 5);
                _saveRecent();
                _renderRecentCells();

                // Reset form for next scan
                form.reset();
                setTimeout(() => {
                    cellIdInput.focus();
                }, 1000);
            } else {
                const msg = typeof result.detail === 'string'
                    ? result.detail
                    : (result.message || 'Registration failed. Please try again.');
                Toast.error(msg);
                cellIdInput.focus();
            }
        });

        // Refresh button — reloads recent cells from backend
        refreshBtn.addEventListener('click', async () => {
            await _loadRecentCells();
            _renderRecentCells();
            form.reset();
            cellIdInput.focus();
            confirmationEl.style.display = 'none';
            Toast.success('Refreshed from server.');
        });

        // Clear error state on input
        cellIdInput.addEventListener('input', () => {
            cellIdInput.classList.remove('form-input--error');
        });

        // No cleanup needed
        return null;
    }
};

/** Render the last 5 registered cells into the card body */
function _renderRecentCells() {
    const container = document.getElementById('recent-cells-list');
    if (!container) return;

    if (!recentCells.length) {
        container.innerHTML = `
            <div style="text-align:center;padding:24px 0;color:var(--text-muted, #8892A4);">
                <div style="font-size:28px;margin-bottom:8px;">📋</div>
                <div>No cells registered yet. Start scanning!</div>
            </div>`;
        return;
    }

    let html = `
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
                <tr style="border-bottom:2px solid var(--border-default, #E2E6ED);text-align:left;">
                    <th style="padding:10px 12px;font-weight:600;color:var(--text-muted, #8892A4);font-size:12px;text-transform:uppercase;letter-spacing:.5px;">#</th>
                    <th style="padding:10px 12px;font-weight:600;color:var(--text-muted, #8892A4);font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Cell ID</th>
                    <th style="padding:10px 12px;font-weight:600;color:var(--text-muted, #8892A4);font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Registration Date</th>
                    <th style="padding:10px 12px;font-weight:600;color:var(--text-muted, #8892A4);font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Registration Time</th>
                </tr>
            </thead>
            <tbody>`;

    recentCells.forEach((cell, i) => {
        html += `
                <tr style="border-bottom:1px solid var(--border-default, #E2E6ED);">
                    <td style="padding:10px 12px;color:var(--text-muted, #8892A4);">${i + 1}</td>
                    <td style="padding:10px 12px;font-family:'JetBrains Mono',monospace;font-weight:600;">${_escapeHtml(cell.cellId)}</td>
                    <td style="padding:10px 12px;">${_escapeHtml(cell.date)}</td>
                    <td style="padding:10px 12px;">${_escapeHtml(cell.time)}</td>
                </tr>`;
    });

    html += `
            </tbody>
        </table>`;

    container.innerHTML = html;
}

function _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export default CellRegistration;
