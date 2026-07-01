import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { X, ShoppingCart, User, Phone, RotateCcw, AlertTriangle } from 'lucide-react';
import SearchBox from '../components/SearchBox.jsx';
import ProductImage from '../components/ProductImage.jsx';
import { useCreateInvoiceMutation, useGetCustomersQuery } from '../store/apiSlice.js';
import {
  addItem,
  updateQty,
  removeItem,
  setLineDiscount,
  setPriceMode,
  setBillDiscount,
  setPaymentMode,
  setAmountReceived,
  setCustomer,
  setCustomerName,
  setCustomerPhone,
  resetCart,
  selectCartLines,
  selectCartTotals,
  selectCartItemCount,
} from '../store/cartSlice.js';
import { formatMoney, rupeesToPaise } from '../lib/money.js';

export default function Billing() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const cart = useSelector((s) => s.cart);
  const lines = useSelector(selectCartLines);
  const totals = useSelector(selectCartTotals);
  const itemCount = useSelector(selectCartItemCount);
  const hasStockIssue = lines.some((l) => l.insufficientStock);

  const [createInvoice, { isLoading: submitting }] = useCreateInvoiceMutation();
  const [error, setError] = useState(null);
  const [customerFocused, setCustomerFocused] = useState(false);

  const phoneQuery = cart.customerPhone.trim();
  const { data: customerMatches = [] } = useGetCustomersQuery(
    { search: phoneQuery },
    { skip: phoneQuery.length < 3 || !!cart.customerId }
  );

  const receivedPaise = rupeesToPaise(cart.amountReceived);
  const changeDue = receivedPaise - totals.total;

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'F9') {
        e.preventDefault();
        finalizeBill();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  function clearBill() {
    if (lines.length > 0 && !confirm('Clear the current bill? This cannot be undone.')) return;
    dispatch(resetCart());
    setError(null);
  }

  async function finalizeBill() {
    if (lines.length === 0 || hasStockIssue) return;
    if (cart.paymentMode === 'credit' && !cart.customerId && !cart.customerPhone.trim()) {
      setError('A customer (with phone) is required for credit sales');
      return;
    }
    setError(null);
    try {
      const invoice = await createInvoice({
        items: lines.map((l) => ({
          product_id: l.product.id,
          qty: l.qty,
          price: l.amounts.price,
          line_discount: l.lineDiscount || 0,
        })),
        discount: totals.discountPaise,
        customer_id: cart.customerId,
        customer_name: cart.customerId ? null : cart.customerName.trim() || null,
        customer_phone: cart.customerId ? null : cart.customerPhone.trim() || null,
        payment_mode: cart.paymentMode,
      }).unwrap();
      dispatch(resetCart());
      navigate(`/invoices/${invoice.id}/print`);
    } catch (err) {
      setError(err?.data?.error || err.message || 'Failed to save invoice');
    }
  }

  return (
    <div className="p-6 flex flex-col h-full gap-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <SearchBox
            onPick={(p) => dispatch(addItem(p))}
            priceField={cart.priceMode === 'garage' ? 'garage_price' : 'sale_price'}
          />
        </div>
        <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden text-base font-semibold shadow-card">
          <button
            onClick={() => dispatch(setPriceMode('retail'))}
            className={`px-5 py-3.5 cursor-pointer transition-colors duration-150 ${
              cart.priceMode === 'retail' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Retail
          </button>
          <button
            onClick={() => dispatch(setPriceMode('garage'))}
            className={`px-5 py-3.5 cursor-pointer transition-colors duration-150 ${
              cart.priceMode === 'garage' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Garage
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Cart */}
        <div className="flex-1 flex flex-col min-w-0 border border-slate-200 rounded-xl bg-white shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
            <span className="text-sm font-medium text-slate-500">
              {itemCount > 0 ? `${itemCount} item${itemCount === 1 ? '' : 's'} in cart` : 'Cart'}
            </span>
            {lines.length > 0 && (
              <button
                onClick={clearBill}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-red-600 cursor-pointer transition-colors duration-150"
              >
                <RotateCcw size={14} /> Clear bill
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-base">
              <thead className="bg-slate-50 sticky top-0 text-slate-500 text-sm uppercase tracking-wide">
                <tr className="text-left">
                  <th className="px-4 py-2.5">Part</th>
                  <th className="px-2 py-2.5 w-16">Qty</th>
                  <th className="px-2 py-2.5 w-24">Price</th>
                  <th className="px-2 py-2.5 w-20">Disc ₹</th>
                  <th className="px-2 py-2.5 w-16">GST%</th>
                  <th className="px-2 py-2.5 w-28">Total</th>
                  <th className="px-2 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr
                    key={line.product.id}
                    className={`border-t border-slate-100 ${line.insufficientStock ? 'bg-red-50/60' : 'hover:bg-slate-50/60'}`}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <ProductImage product={line.product} size="sm" />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 truncate">{line.product.name}</div>
                          <div className="text-sm text-slate-500 flex items-center gap-1.5">
                            {line.product.part_no} · rack {line.product.rack_location || '—'}
                            {line.insufficientStock && (
                              <span className="inline-flex items-center gap-0.5 text-red-600 font-medium">
                                <AlertTriangle size={12} /> only {line.product.stock} in stock
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="1"
                        value={line.qty}
                        onChange={(e) =>
                          dispatch(updateQty({ productId: line.product.id, qty: Number(e.target.value) }))
                        }
                        className="w-14 border border-slate-300 rounded-lg px-1.5 py-1.5 focus:border-brand-600 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-2 text-slate-700">{formatMoney(line.amounts.price)}</td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.lineDiscount ? line.lineDiscount / 100 : ''}
                        placeholder="0"
                        onChange={(e) =>
                          dispatch(
                            setLineDiscount({
                              productId: line.product.id,
                              discount: rupeesToPaise(e.target.value),
                            })
                          )
                        }
                        className="w-16 border border-slate-300 rounded-lg px-1.5 py-1.5 focus:border-brand-600 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-2 text-slate-700">{line.product.gst_rate}%</td>
                    <td className="px-2 py-2 font-semibold text-slate-800">{formatMoney(line.amounts.total)}</td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => dispatch(removeItem(line.product.id))}
                        className="text-slate-400 hover:text-red-600 cursor-pointer p-1.5 rounded-lg hover:bg-red-50 transition-colors duration-150"
                        aria-label={`Remove ${line.product.name}`}
                      >
                        <X size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-16 text-center text-slate-400">
                      <ShoppingCart size={40} className="mx-auto mb-3 text-slate-300" />
                      <div className="text-lg">Scan or search a part to start the bill</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/60 text-xs text-slate-400 flex gap-4">
            <span><kbd className="font-semibold">Enter</kbd> add highlighted result</span>
            <span><kbd className="font-semibold">↑ ↓</kbd> move selection</span>
            <span><kbd className="font-semibold">F9</kbd> finalize &amp; print</span>
            <span><kbd className="font-semibold">F1–F6</kbd> switch pages</span>
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="w-[380px] shrink-0 flex flex-col gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-card">
            <div className="text-sm font-semibold text-slate-600 mb-2">Customer (saved automatically)</div>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={cart.customerName}
                  onChange={(e) => dispatch(setCustomerName(e.target.value))}
                  placeholder="Name"
                  className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 focus:border-brand-600 focus:outline-none"
                />
              </div>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={cart.customerPhone}
                  onChange={(e) => dispatch(setCustomerPhone(e.target.value))}
                  onFocus={() => setCustomerFocused(true)}
                  onBlur={() => setTimeout(() => setCustomerFocused(false), 150)}
                  placeholder="Phone"
                  className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 focus:border-brand-600 focus:outline-none"
                />
                {customerFocused && customerMatches.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-auto">
                    {customerMatches.map((c) => (
                      <li
                        key={c.id}
                        onClick={() => dispatch(setCustomer({ id: c.id, name: c.name, phone: c.phone || '' }))}
                        className="px-3 py-2 hover:bg-brand-50 cursor-pointer text-sm"
                      >
                        <span className="font-medium">{c.name}</span> · {c.phone}{' '}
                        <span className="text-slate-400">({c.type})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {cart.customerId && (
                <span className="self-start text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Saved customer
                </span>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-card flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="bill-discount" className="block text-sm font-semibold text-slate-600 mb-1">
                  Bill discount (₹)
                </label>
                <input
                  id="bill-discount"
                  type="number"
                  min="0"
                  value={cart.billDiscount}
                  onChange={(e) => dispatch(setBillDiscount(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:border-brand-600 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="payment-mode" className="block text-sm font-semibold text-slate-600 mb-1">
                  Payment mode
                </label>
                <select
                  id="payment-mode"
                  value={cart.paymentMode}
                  onChange={(e) => dispatch(setPaymentMode(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:border-brand-600 focus:outline-none cursor-pointer"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
            </div>

            {cart.paymentMode === 'cash' && (
              <div>
                <label htmlFor="amount-received" className="block text-sm font-semibold text-slate-600 mb-1">
                  Amount received (₹)
                </label>
                <input
                  id="amount-received"
                  type="number"
                  min="0"
                  value={cart.amountReceived}
                  onChange={(e) => dispatch(setAmountReceived(e.target.value))}
                  placeholder={formatMoney(totals.total).replace('₹', '')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:border-brand-600 focus:outline-none"
                />
                {cart.amountReceived !== '' && (
                  <div
                    className={`text-sm font-semibold mt-1.5 ${changeDue >= 0 ? 'text-emerald-700' : 'text-red-600'}`}
                  >
                    {changeDue >= 0 ? `Change to return: ${formatMoney(changeDue)}` : `Short by: ${formatMoney(-changeDue)}`}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-900 text-white rounded-xl px-4 py-3.5 shadow-card">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Subtotal</span>
              <span>{formatMoney(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>GST</span>
              <span>{formatMoney(totals.gstAmt)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Discount</span>
              <span>-{formatMoney(totals.discountPaise)}</span>
            </div>
            <div className="flex justify-between text-2xl font-heading font-bold mt-1.5 pt-1.5 border-t border-slate-700">
              <span>Total</span>
              <span>{formatMoney(totals.total)}</span>
            </div>
          </div>

          {error && (
            <div className="text-red-700 text-sm font-medium bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}
          {hasStockIssue && !error && (
            <div className="text-red-700 text-sm font-medium bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              Reduce quantity on the highlighted line — not enough stock to finalize.
            </div>
          )}

          <button
            onClick={finalizeBill}
            disabled={submitting || lines.length === 0 || hasStockIssue}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xl font-heading font-semibold py-4 rounded-xl cursor-pointer shadow-card transition-colors duration-150"
          >
            {submitting ? 'Saving…' : 'Finalize & Print (F9)'}
          </button>
        </div>
      </div>
    </div>
  );
}
