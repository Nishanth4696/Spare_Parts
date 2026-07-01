import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useGetProductsQuery } from '../store/apiSlice.js';
import { formatMoney } from '../lib/money.js';
import ProductImage from './ProductImage.jsx';

export default function SearchBox({ onPick, priceField, autoFocus = true }) {
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);

  const trimmed = query.trim();
  const { data: results = [] } = useGetProductsQuery(
    { search: trimmed },
    { skip: trimmed.length === 0 }
  );

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    setHighlight(0);
  }, [results.length]);

  function pick(product) {
    onPick(product);
    setQuery('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const exactBarcode = results.find((r) => r.barcode === trimmed);
      const chosen = exactBarcode || results[highlight];
      if (chosen) pick(chosen);
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scan barcode or type part no / name…"
          className="w-full text-xl pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl bg-white focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100 transition-colors duration-150"
          autoComplete="off"
        />
      </div>
      {results.length > 0 && (
        <ul className="absolute z-20 w-full bg-white border border-slate-200 rounded-xl mt-2 max-h-80 overflow-auto shadow-lg">
          {results.map((r, i) => (
            <li
              key={r.id}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(r)}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer text-base border-b border-slate-100 last:border-0 ${
                i === highlight ? 'bg-brand-50' : 'hover:bg-slate-50'
              }`}
            >
              <ProductImage product={r} size="sm" />
              <span className="flex-1 min-w-0">
                <span className="font-semibold text-slate-800 truncate block">{r.name}</span>
                <span className="text-slate-500 text-sm">
                  {r.part_no} · {r.brand} · rack {r.rack_location || '—'}
                </span>
              </span>
              <span className="flex flex-col items-end gap-0.5">
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    r.stock <= r.min_stock ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  stock {r.stock}
                </span>
                <span className="font-semibold text-slate-800">{formatMoney(r[priceField])}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
