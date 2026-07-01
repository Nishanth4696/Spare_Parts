import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, PackageSearch, ArrowUp, ArrowDown, ArrowUpDown, X } from 'lucide-react';
import { useGetProductsQuery, useGetProductFiltersQuery, useDeleteProductMutation } from '../store/apiSlice.js';
import { formatMoney } from '../lib/money.js';
import ProductForm from '../components/ProductForm.jsx';
import ProductImage from '../components/ProductImage.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useToast } from '../components/ToastProvider.jsx';

const COLUMNS = [
  { key: 'name', label: 'Product', sortable: true },
  { key: 'part_no', label: 'Part No', sortable: true },
  { key: 'brand', label: 'Brand', sortable: true },
  { key: 'rack_location', label: 'Rack', sortable: true },
  { key: 'stock', label: 'Stock', sortable: true, align: 'right' },
  { key: 'sale_price', label: 'Sale Price', sortable: true, align: 'right' },
  { key: 'garage_price', label: 'Garage Price', sortable: true, align: 'right' },
];

export default function Products() {
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [rack, setRack] = useState('');
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, product = edit
  const toast = useToast();

  const { data: filters } = useGetProductFiltersQuery();
  const { data: products = [], isFetching, error } = useGetProductsQuery({
    search: search || undefined,
    brand: brand || undefined,
    rack_location: rack || undefined,
  });
  const [deleteProduct] = useDeleteProductMutation();

  const sorted = useMemo(() => {
    const rows = [...products];
    rows.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av ?? '').localeCompare(String(bv ?? ''));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [products, sort]);

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  async function handleDelete(product) {
    if (!confirm(`Remove "${product.name}" from the catalog? It will no longer appear in billing or search.`)) return;
    await deleteProduct(product.id);
    toast.success(`Removed "${product.name}" from the catalog`);
  }

  const hasFilters = search || brand || rack;

  return (
    <div className="p-6 flex flex-col h-full gap-4">
      <PageHeader
        title="Products"
        subtitle="Your catalog grows as stock arrives — add parts here or straight from a purchase."
        actions={
          <button
            onClick={() => setEditing(null)}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-lg cursor-pointer shadow-card transition-colors duration-150"
          >
            <Plus size={18} /> Add Product
          </button>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search part no / name / brand…"
          className="flex-1 min-w-[240px] border border-slate-300 rounded-xl px-4 py-3 text-lg bg-white focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100 transition-colors duration-150"
        />
        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="input !w-44 cursor-pointer"
        >
          <option value="">All brands</option>
          {(filters?.brands || []).map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select
          value={rack}
          onChange={(e) => setRack(e.target.value)}
          className="input !w-44 cursor-pointer"
        >
          <option value="">All racks</option>
          {(filters?.racks || []).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => {
              setSearch('');
              setBrand('');
              setRack('');
            }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 cursor-pointer px-2 py-1"
          >
            <X size={15} /> Clear filters
          </button>
        )}
        <span className="ml-auto text-sm text-slate-500">{sorted.length} product{sorted.length === 1 ? '' : 's'}</span>
      </div>

      {error && (
        <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          Failed to load products.
        </div>
      )}

      <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-card">
        <table className="w-full text-base">
          <thead className="bg-slate-50 sticky top-0 text-slate-500 text-sm uppercase tracking-wide">
            <tr className="text-left">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && toggleSort(col.key)}
                  className={`px-3 py-3 first:px-4 select-none ${col.sortable ? 'cursor-pointer hover:text-slate-800' : ''} ${
                    col.align === 'right' ? 'text-right' : ''
                  }`}
                >
                  <span className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'flex-row-reverse' : ''}`}>
                    {col.label}
                    {col.sortable &&
                      (sort.key === col.key ? (
                        sort.dir === 'asc' ? (
                          <ArrowUp size={13} />
                        ) : (
                          <ArrowDown size={13} />
                        )
                      ) : (
                        <ArrowUpDown size={13} className="text-slate-300" />
                      ))}
                  </span>
                </th>
              ))}
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <ProductImage product={p} size="sm" />
                    <span className="font-semibold text-slate-800">{p.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-slate-600">{p.part_no}</td>
                <td className="px-3 py-2.5 text-slate-600">{p.brand}</td>
                <td className="px-3 py-2.5 text-slate-600">{p.rack_location || '—'}</td>
                <td className="px-3 py-2.5 text-right">
                  <span
                    className={`font-semibold px-2 py-0.5 rounded ${
                      p.stock <= p.min_stock ? 'bg-amber-100 text-amber-700' : 'text-slate-700'
                    }`}
                  >
                    {p.stock}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-slate-700">{formatMoney(p.sale_price)}</td>
                <td className="px-3 py-2.5 text-right text-slate-700">{formatMoney(p.garage_price)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setEditing(p)}
                      className="text-slate-400 hover:text-brand-700 cursor-pointer p-2 rounded-lg hover:bg-brand-50 transition-colors duration-150"
                      aria-label={`Edit ${p.name}`}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="text-slate-400 hover:text-red-600 cursor-pointer p-2 rounded-lg hover:bg-red-50 transition-colors duration-150"
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isFetching && sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-16 text-center text-slate-400">
                  <PackageSearch size={40} className="mx-auto mb-3 text-slate-300" />
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <ProductForm
          product={editing}
          onClose={() => setEditing(undefined)}
          onSaved={(p) => toast.success(`Saved "${p.name}"`)}
        />
      )}
    </div>
  );
}
