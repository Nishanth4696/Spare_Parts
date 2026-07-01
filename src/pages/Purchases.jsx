import { useState } from 'react';
import { Plus, X, Truck } from 'lucide-react';
import {
  useGetSuppliersQuery,
  useAddSupplierMutation,
  useCreatePurchaseMutation,
  useGetPurchasesQuery,
} from '../store/apiSlice.js';
import { formatMoney, paiseToRupees, rupeesToPaise } from '../lib/money.js';
import SearchBox from '../components/SearchBox.jsx';
import ProductImage from '../components/ProductImage.jsx';
import ProductForm from '../components/ProductForm.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useToast } from '../components/ToastProvider.jsx';

export default function Purchases() {
  const toast = useToast();
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplier, setSupplier] = useState(null);
  const [newSupplierMode, setNewSupplierMode] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierInvNo, setSupplierInvNo] = useState('');
  const [lines, setLines] = useState([]);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [error, setError] = useState(null);

  const { data: supplierResults = [] } = useGetSuppliersQuery(
    { search: supplierQuery },
    { skip: !supplierQuery.trim() || !!supplier }
  );
  const [addSupplier] = useAddSupplierMutation();
  const [createPurchase, { isLoading: saving }] = useCreatePurchaseMutation();
  const { data: recent = [] } = useGetPurchasesQuery();

  async function createSupplier() {
    if (!newSupplierName.trim()) return;
    const s = await addSupplier({ name: newSupplierName.trim() }).unwrap();
    setSupplier(s);
    setNewSupplierMode(false);
    setNewSupplierName('');
  }

  function addLine(product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { product, qty: 1, cost: paiseToRupees(product.cost_price) }];
    });
  }

  function updateLine(productId, field, value) {
    setLines((prev) => prev.map((l) => (l.product.id === productId ? { ...l, [field]: value } : l)));
  }

  function removeLine(productId) {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  }

  const total = lines.reduce((sum, l) => sum + rupeesToPaise(l.cost) * Number(l.qty || 0), 0);

  async function savePurchase() {
    if (!supplier) {
      setError('Select or create a supplier');
      return;
    }
    if (lines.length === 0) {
      setError('Add at least one line item');
      return;
    }
    setError(null);
    try {
      const purchase = await createPurchase({
        supplier_id: supplier.id,
        date,
        supplier_inv_no: supplierInvNo || null,
        items: lines.map((l) => ({
          product_id: l.product.id,
          qty: Number(l.qty),
          cost: rupeesToPaise(l.cost),
        })),
      }).unwrap();
      toast.success(`Stock-in saved · ${formatMoney(purchase.total)} from ${supplier.name}`);
      setLines([]);
      setSupplierInvNo('');
      setSupplier(null);
    } catch (err) {
      setError(err?.data?.error || err.message || 'Failed to save purchase');
    }
  }

  return (
    <div className="p-6 flex flex-col h-full gap-4 max-w-[1400px]">
      <PageHeader
        title="Purchase / Stock-in"
        subtitle="Record what arrived from a supplier — stock and cost update immediately, and this is how the catalog grows."
      />

      <div className="flex gap-4 items-end bg-white border border-slate-200 rounded-xl p-4 shadow-card">
        <div className="flex-1 relative">
          <label htmlFor="supplier-search" className="block text-sm font-semibold text-slate-600 mb-1">
            Supplier *
          </label>
          {newSupplierMode ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="New supplier name"
                className="input"
              />
              <button onClick={createSupplier} className="bg-brand-600 text-white px-4 rounded-lg font-semibold cursor-pointer">
                Save
              </button>
              <button onClick={() => setNewSupplierMode(false)} className="px-4 rounded-lg border border-slate-300 cursor-pointer">
                Cancel
              </button>
            </div>
          ) : (
            <>
              <input
                id="supplier-search"
                value={supplier ? supplier.name : supplierQuery}
                onChange={(e) => {
                  setSupplier(null);
                  setSupplierQuery(e.target.value);
                }}
                placeholder="Search supplier…"
                className="input"
              />
              {supplierResults.length > 0 && !supplier && (
                <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-auto">
                  {supplierResults.map((s) => (
                    <li
                      key={s.id}
                      onClick={() => {
                        setSupplier(s);
                        setSupplierQuery('');
                      }}
                      className="px-3 py-2 hover:bg-brand-50 cursor-pointer"
                    >
                      {s.name}
                    </li>
                  ))}
                </ul>
              )}
              {supplierQuery && supplierResults.length === 0 && (
                <button
                  onClick={() => {
                    setNewSupplierMode(true);
                    setNewSupplierName(supplierQuery);
                  }}
                  className="text-sm text-brand-700 mt-1.5 cursor-pointer font-medium"
                >
                  + Create supplier "{supplierQuery}"
                </button>
              )}
            </>
          )}
        </div>
        <div className="w-40">
          <label htmlFor="purchase-date" className="block text-sm font-semibold text-slate-600 mb-1">Date</label>
          <input id="purchase-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </div>
        <div className="w-48">
          <label htmlFor="supplier-inv-no" className="block text-sm font-semibold text-slate-600 mb-1">
            Supplier invoice no
          </label>
          <input id="supplier-inv-no" value={supplierInvNo} onChange={(e) => setSupplierInvNo(e.target.value)} className="input" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchBox onPick={addLine} priceField="cost_price" autoFocus={false} />
        </div>
        <button
          onClick={() => setShowNewProduct(true)}
          className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold px-4 py-3.5 rounded-xl cursor-pointer transition-colors duration-150"
        >
          <Plus size={18} /> New Product
        </button>
      </div>

      <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-card">
        <table className="w-full text-base">
          <thead className="bg-slate-50 sticky top-0 text-slate-500 text-sm uppercase tracking-wide">
            <tr className="text-left">
              <th className="px-4 py-3">Part</th>
              <th className="px-3 py-3 w-24">Qty</th>
              <th className="px-3 py-3 w-32">Cost (₹)</th>
              <th className="px-3 py-3 w-32">Line Total</th>
              <th className="px-3 py-3 w-14"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.product.id} className="border-t border-slate-100">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <ProductImage product={l.product} size="sm" />
                    <div>
                      <div className="font-semibold text-slate-800">{l.product.name}</div>
                      <div className="text-sm text-slate-500">{l.product.part_no}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <input
                    type="number"
                    min="1"
                    value={l.qty}
                    onChange={(e) => updateLine(l.product.id, 'qty', e.target.value)}
                    className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 focus:border-brand-600 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <input
                    type="number"
                    step="0.01"
                    value={l.cost}
                    onChange={(e) => updateLine(l.product.id, 'cost', e.target.value)}
                    className="w-28 border border-slate-300 rounded-lg px-2 py-1.5 focus:border-brand-600 focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2.5 font-semibold text-slate-800">
                  {formatMoney(rupeesToPaise(l.cost) * Number(l.qty || 0))}
                </td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => removeLine(l.product.id)}
                    className="text-slate-400 hover:text-red-600 cursor-pointer p-1.5 rounded-lg hover:bg-red-50 transition-colors duration-150"
                    aria-label={`Remove ${l.product.name}`}
                  >
                    <X size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-12 text-center text-slate-400">
                  <Truck size={36} className="mx-auto mb-2 text-slate-300" />
                  Search a part above to add it to this purchase
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{error}</div>
      )}

      <div className="flex justify-between items-center">
        <div className="text-2xl font-heading font-bold text-slate-800">Total: {formatMoney(total)}</div>
        <button
          onClick={savePurchase}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-lg font-heading font-semibold px-6 py-3.5 rounded-xl cursor-pointer shadow-card transition-colors duration-150"
        >
          {saving ? 'Saving…' : 'Save Purchase'}
        </button>
      </div>

      <div className="mt-2">
        <h2 className="text-lg font-heading font-semibold text-slate-800 mb-2">Recent purchases</h2>
        <div className="border border-slate-200 rounded-xl bg-white overflow-auto max-h-56 shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 text-slate-500">
              <tr className="text-left">
                <th className="px-4 py-2.5">Date</th>
                <th className="px-3 py-2.5">Supplier</th>
                <th className="px-3 py-2.5">Supplier Inv No</th>
                <th className="px-3 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{p.date}</td>
                  <td className="px-3 py-2">{p.supplier_name}</td>
                  <td className="px-3 py-2">{p.supplier_inv_no || '—'}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatMoney(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNewProduct && (
        <ProductForm
          product={null}
          onClose={() => setShowNewProduct(false)}
          onSaved={(p) => {
            addLine(p);
            toast.success(`Added "${p.name}" to catalog and this purchase`);
          }}
        />
      )}
    </div>
  );
}
