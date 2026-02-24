/**
 * dispatch.js — Dispatch Page
 * 
 * Operator enters battery ID, customer name, invoice ID and invoice date
 * to mark the battery pack as dispatched.
 * 
 * API: POST /api/v1/battery/dispatch
 * Payload: { battery_id, customer_name, invoice_id, invoice_date }
 */

import API from '../../core/api.js';
import Toast from '../../components/toast.js';

const Dispatch = {
    render() {
        const today = new Date().toISOString().split('T')[0];

        return `
            <div class="content__inner">
                <div class="page-header">
                    <h1 class="page-header__title">Dispatch</h1>
                    <p class="page-header__subtitle">Enter dispatch details to mark battery pack as dispatched</p>
                </div>

                <div class="production-form">
                    <div class="scanner-section">
                        <div class="scanner-section__header">
                            <div class="scanner-section__icon">
                                <span class="material-symbols-outlined">local_shipping</span>
                            </div>
                            <div>
                                <div class="scanner-section__title">Dispatch Details</div>
                                <div class="scanner-section__subtitle">Battery pack must pass PDI before dispatch</div>
                            </div>
                        </div>

                        <form id="dispatch-form" autocomplete="off">
                            <div class="form-group">
                                <label class="form-label form-label--required" for="dispatch-battery-id">Battery ID</label>
                                <input
                                    type="text"
                                    id="dispatch-battery-id"
                                    class="form-input form-input--scanner"
                                    placeholder="Scan or type Battery ID..."
                                    required
                                    autofocus
                                    maxlength="64"
                                >
                            </div>

                            <div class="form-group">
                                <label class="form-label form-label--required" for="dispatch-customer">Customer Name</label>
                                <input
                                    type="text"
                                    id="dispatch-customer"
                                    class="form-input"
                                    placeholder="Enter customer name"
                                    required
                                    maxlength="128"
                                >
                            </div>

                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label form-label--required" for="dispatch-invoice-id">Invoice ID</label>
                                    <input
                                        type="text"
                                        id="dispatch-invoice-id"
                                        class="form-input"
                                        placeholder="Enter Invoice ID"
                                        required
                                        maxlength="64"
                                    >
                                </div>

                                <div class="form-group">
                                    <label class="form-label form-label--required" for="dispatch-invoice-date">Invoice Date</label>
                                    <input
                                        type="date"
                                        id="dispatch-invoice-date"
                                        class="form-input"
                                        required
                                        value="${today}"
                                    >
                                </div>
                            </div>

                            <button type="submit" id="btn-dispatch" class="btn btn--success btn--lg btn--full">
                                Confirm Dispatch
                            </button>
                        </form>

                        <div id="dispatch-result" style="display:none;"></div>
                    </div>
                </div>
            </div>
        `;
    },

    init() {
        const form = document.getElementById('dispatch-form');
        const batteryInput = document.getElementById('dispatch-battery-id');
        const btn = document.getElementById('btn-dispatch');
        const resultEl = document.getElementById('dispatch-result');
        let isSubmitting = false;

        setTimeout(() => batteryInput?.focus(), 100);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isSubmitting) return;

            const batteryId = batteryInput.value.trim();
            const customerName = document.getElementById('dispatch-customer').value.trim();
            const invoiceId = document.getElementById('dispatch-invoice-id').value.trim();
            const invoiceDate = document.getElementById('dispatch-invoice-date').value;

            if (!batteryId) {
                batteryInput.classList.add('form-input--error');
                batteryInput.focus();
                return;
            }
            if (!customerName) {
                Toast.warning('Please enter a customer name.');
                return;
            }
            if (!invoiceId) {
                Toast.warning('Please enter an Invoice ID.');
                return;
            }
            if (!invoiceDate) {
                Toast.warning('Please select an Invoice Date.');
                return;
            }

            isSubmitting = true;
            btn.disabled = true;
            btn.innerHTML = '<span class="btn__spinner"></span> Dispatching...';

            let result;
            try {
                result = await API.post('/dispatch/submit', {
                    battery_id: batteryId,
                    customer_name: customerName,
                    invoice_id: invoiceId,
                    invoice_date: invoiceDate
                });
            } catch (err) {
                result = { success: false, error: 'NETWORK_ERROR', message: err?.message || 'Network error' };
            }

            isSubmitting = false;
            btn.disabled = false;
            btn.textContent = 'Confirm Dispatch';

            if (result && (result.success || typeof result.data === 'string')) {
                Toast.success('Dispatch registered successfully.');
                resultEl.style.display = 'block';
                resultEl.innerHTML = `
                    <div class="confirmation confirmation--success">
                        <div class="confirmation__icon">🚚</div>
                        <div class="confirmation__title">Dispatched Successfully</div>
                        <div class="confirmation__detail">
                            Battery <code>${_esc(batteryId)}</code><br>
                            Customer: <code>${_esc(customerName)}</code><br>
                            Invoice: <code>${_esc(invoiceId)}</code> | Date: <code>${_esc(invoiceDate)}</code>
                        </div>
                    </div>
                `;

                form.reset();
                // Re-set today's date after reset
                document.getElementById('dispatch-invoice-date').value = new Date().toISOString().split('T')[0];
                setTimeout(() => {
                    resultEl.style.display = 'none';
                    batteryInput.focus();
                }, 3000);
            } else if (result && result.error === 'VALIDATION_ERROR') {
                resultEl.style.display = 'block';
                resultEl.innerHTML = `
                    <div class="confirmation confirmation--error">
                        <div class="confirmation__icon">✕</div>
                        <div class="confirmation__title">Dispatch Failed</div>
                        <div class="confirmation__detail">${_esc(typeof result.detail === 'string' ? result.detail : JSON.stringify(result.detail))}</div>
                    </div>
                `;
            } else {
                Toast.error('Dispatch failed. Please try again.');
            }
        });

        batteryInput.addEventListener('input', () => batteryInput.classList.remove('form-input--error'));

        return null;
    }
};

function _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

export default Dispatch;
