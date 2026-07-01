import { useEffect, useState } from 'react';
import { useGetSettingsQuery, useUpdateSettingsMutation } from '../store/apiSlice.js';
import PageHeader from '../components/PageHeader.jsx';
import { useToast } from '../components/ToastProvider.jsx';

export default function Settings() {
  const { data } = useGetSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation();
  const [form, setForm] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function save() {
    await updateSettings(form).unwrap();
    toast.success('Shop settings saved');
  }

  if (!form) return <div className="p-6 text-slate-500">Loading…</div>;

  return (
    <div className="p-6 max-w-xl flex flex-col gap-4">
      <PageHeader title="Shop settings" subtitle="Shown on every printed invoice and PDF report." />
      <div className="flex flex-col gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-card">
        <Field label="Shop name" id="s_name">
          <input id="s_name" className="input" value={form.shop_name || ''} onChange={(e) => set('shop_name', e.target.value)} />
        </Field>
        <Field label="Address" id="s_addr">
          <textarea id="s_addr" className="input" rows={2} value={form.shop_address || ''} onChange={(e) => set('shop_address', e.target.value)} />
        </Field>
        <Field label="Phone" id="s_phone">
          <input id="s_phone" className="input" value={form.shop_phone || ''} onChange={(e) => set('shop_phone', e.target.value)} />
        </Field>
        <Field label="GSTIN" id="s_gstin">
          <input id="s_gstin" className="input" value={form.shop_gstin || ''} onChange={(e) => set('shop_gstin', e.target.value)} />
        </Field>
        <Field label="Invoice number prefix" id="s_prefix">
          <input id="s_prefix" className="input" value={form.invoice_prefix || ''} onChange={(e) => set('invoice_prefix', e.target.value)} />
        </Field>

        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={save}
            disabled={saving}
            className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-semibold px-6 py-3 rounded-lg cursor-pointer transition-colors duration-150"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, id, children }) {
  return (
    <label htmlFor={id} className="block">
      <span className="block font-medium text-slate-600 mb-1 text-sm">{label}</span>
      {children}
    </label>
  );
}
