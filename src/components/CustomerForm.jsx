import { useState } from 'react';
import { X } from 'lucide-react';
import { paiseToRupees, rupeesToPaise } from '../lib/money.js';
import { useAddCustomerMutation, useUpdateCustomerMutation } from '../store/apiSlice.js';

function toFormState(customer) {
  return {
    name: customer?.name || '',
    phone: customer?.phone || '',
    type: customer?.type || 'retail',
    gstin: customer?.gstin || '',
    credit_limit: customer ? paiseToRupees(customer.credit_limit) : '0',
  };
}

export default function CustomerForm({ customer, onClose, onSaved }) {
  const [form, setForm] = useState(toFormState(customer));
  const [error, setError] = useState(null);
  const [addCustomer, { isLoading: adding }] = useAddCustomerMutation();
  const [updateCustomer, { isLoading: updating }] = useUpdateCustomerMutation();
  const saving = adding || updating;

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    const payload = { ...form, credit_limit: rupeesToPaise(form.credit_limit) };
    try {
      const saved = customer
        ? await updateCustomer({ id: customer.id, ...payload }).unwrap()
        : await addCustomer(payload).unwrap();
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err?.data?.error || err.message || 'Failed to save customer');
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-30 p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-heading font-semibold text-slate-800">
            {customer ? 'Edit customer' : 'Add customer'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <Field label="Name" id="cust_name" required>
            <input id="cust_name" required value={form.name} onChange={(e) => set('name', e.target.value)} className="input" />
          </Field>
          <Field label="Phone" id="cust_phone">
            <input id="cust_phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className="input" />
          </Field>
          <Field label="Type" id="cust_type">
            <select id="cust_type" value={form.type} onChange={(e) => set('type', e.target.value)} className="input cursor-pointer">
              <option value="retail">Retail</option>
              <option value="garage">Garage</option>
            </select>
          </Field>
          <Field label="GSTIN (optional)" id="cust_gstin">
            <input id="cust_gstin" value={form.gstin} onChange={(e) => set('gstin', e.target.value)} className="input" />
          </Field>
          <Field label="Credit limit (₹)" id="cust_credit">
            <input
              id="cust_credit"
              type="number"
              step="0.01"
              value={form.credit_limit}
              onChange={(e) => set('credit_limit', e.target.value)}
              className="input"
            />
          </Field>

          {error && (
            <div className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer hover:bg-slate-50 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-semibold cursor-pointer transition-colors duration-150"
            >
              {saving ? 'Saving…' : 'Save customer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, id, required, children }) {
  return (
    <label htmlFor={id} className="block text-sm">
      <span className="block font-medium text-slate-600 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}
