import { useState } from 'react';
import { Plus, Pencil, Users2 } from 'lucide-react';
import { useGetCustomersQuery } from '../store/apiSlice.js';
import { formatMoney } from '../lib/money.js';
import CustomerForm from '../components/CustomerForm.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useToast } from '../components/ToastProvider.jsx';

export default function Customers() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, customer = edit
  const toast = useToast();

  const { data: customers = [], isFetching } = useGetCustomersQuery({ search: search || undefined });

  return (
    <div className="p-6 flex flex-col h-full gap-4">
      <PageHeader
        title="Customers"
        subtitle="Captured automatically from billing by phone number — add or edit anyone here too."
        actions={
          <button
            onClick={() => setEditing(null)}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-lg cursor-pointer shadow-card transition-colors duration-150"
          >
            <Plus size={18} /> Add Customer
          </button>
        }
      />

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name / phone…"
        className="border border-slate-300 rounded-xl px-4 py-3 text-lg bg-white focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100 transition-colors duration-150"
      />

      <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-card">
        <table className="w-full text-base">
          <thead className="bg-slate-50 sticky top-0 text-slate-500 text-sm uppercase tracking-wide">
            <tr className="text-left">
              <th className="px-4 py-3">Name</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">GSTIN</th>
              <th className="px-3 py-3 text-right">Credit limit</th>
              <th className="px-3 py-3 text-right">Balance owed</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-4 py-2.5 font-semibold text-slate-800">{c.name}</td>
                <td className="px-3 py-2.5 text-slate-600">{c.phone || '—'}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      c.type === 'garage' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {c.type}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-600">{c.gstin || '—'}</td>
                <td className="px-3 py-2.5 text-right text-slate-700">
                  {c.credit_limit ? formatMoney(c.credit_limit) : '—'}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className={`font-semibold ${c.balance > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                    {formatMoney(c.balance)}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setEditing(c)}
                      className="text-slate-400 hover:text-brand-700 cursor-pointer p-2 rounded-lg hover:bg-brand-50 transition-colors duration-150"
                      aria-label={`Edit ${c.name}`}
                    >
                      <Pencil size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isFetching && customers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-16 text-center text-slate-400">
                  <Users2 size={40} className="mx-auto mb-3 text-slate-300" />
                  No customers saved yet — they're captured automatically during billing, or add one here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <CustomerForm
          customer={editing}
          onClose={() => setEditing(undefined)}
          onSaved={(c) => toast.success(`Saved "${c.name}"`)}
        />
      )}
    </div>
  );
}
