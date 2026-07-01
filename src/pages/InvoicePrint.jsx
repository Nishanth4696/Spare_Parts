import { useNavigate, useParams } from 'react-router-dom';
import { Printer, PlusCircle } from 'lucide-react';
import { useGetInvoiceQuery, useGetSettingsQuery } from '../store/apiSlice.js';
import { formatMoney } from '../lib/money.js';

export default function InvoicePrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: invoice, error, isLoading } = useGetInvoiceQuery(id);
  const { data: settings = {} } = useGetSettingsQuery();

  if (isLoading) return <div className="p-6 text-slate-500">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">Failed to load invoice.</div>;

  return (
    <div className="min-h-screen bg-slate-200">
      <div className="no-print flex justify-center gap-3 py-4 bg-slate-900">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-lg text-lg cursor-pointer transition-colors duration-150"
        >
          <Printer size={20} /> Print (Ctrl+P)
        </button>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg text-lg cursor-pointer transition-colors duration-150"
        >
          <PlusCircle size={20} /> New Bill
        </button>
      </div>

      <div className="mx-auto my-6 bg-white p-8 shadow-xl" style={{ width: '148mm', minHeight: '210mm' }}>
        <div className="text-center border-b-2 border-black pb-2 mb-3">
          <div className="text-2xl font-heading font-bold">{settings.shop_name}</div>
          <div className="text-sm">{settings.shop_address}</div>
          <div className="text-sm">
            {settings.shop_phone ? `Ph: ${settings.shop_phone}` : ''}
            {settings.shop_gstin ? ` · GSTIN: ${settings.shop_gstin}` : ''}
          </div>
        </div>

        <div className="flex justify-between text-sm mb-3">
          <div>
            <div><strong>Invoice:</strong> {invoice.inv_no}</div>
            <div><strong>Date:</strong> {invoice.date}</div>
          </div>
          <div className="text-right">
            <div><strong>Bill to:</strong> {invoice.customer_name || 'Walk-in customer'}</div>
            {invoice.customer_phone && <div>Ph: {invoice.customer_phone}</div>}
            {invoice.customer_gstin && <div>GSTIN: {invoice.customer_gstin}</div>}
          </div>
        </div>

        <table className="w-full text-sm border-t border-b border-black mb-3">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="py-1">Description</th>
              <th className="py-1">HSN</th>
              <th className="py-1 text-right">Qty</th>
              <th className="py-1 text-right">Rate</th>
              <th className="py-1 text-right">Taxable</th>
              <th className="py-1 text-right">GST</th>
              <th className="py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => {
              const taxable = item.price * item.qty;
              const gst = item.line_total - taxable;
              return (
                <tr key={item.id} className="border-b border-slate-300">
                  <td className="py-1">
                    {item.name}
                    <div className="text-xs text-slate-500">{item.part_no}</div>
                  </td>
                  <td className="py-1">—</td>
                  <td className="py-1 text-right">{item.qty}</td>
                  <td className="py-1 text-right">{formatMoney(item.price)}</td>
                  <td className="py-1 text-right">{formatMoney(taxable)}</td>
                  <td className="py-1 text-right">
                    {formatMoney(gst)} ({item.gst_rate}%)
                  </td>
                  <td className="py-1 text-right">{formatMoney(item.line_total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-end">
          <table className="text-sm w-64">
            <tbody>
              <tr>
                <td className="py-1">Taxable value</td>
                <td className="py-1 text-right">{formatMoney(invoice.subtotal)}</td>
              </tr>
              <tr>
                <td className="py-1">CGST</td>
                <td className="py-1 text-right">{formatMoney(Math.round(invoice.gst_amt / 2))}</td>
              </tr>
              <tr>
                <td className="py-1">SGST</td>
                <td className="py-1 text-right">{formatMoney(invoice.gst_amt - Math.round(invoice.gst_amt / 2))}</td>
              </tr>
              <tr>
                <td className="py-1">Discount</td>
                <td className="py-1 text-right">-{formatMoney(invoice.discount)}</td>
              </tr>
              <tr className="border-t-2 border-black font-bold text-lg">
                <td className="py-1">Grand Total</td>
                <td className="py-1 text-right">{formatMoney(invoice.total)}</td>
              </tr>
              <tr>
                <td className="py-1">Payment mode</td>
                <td className="py-1 text-right uppercase">{invoice.payment_mode}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 text-xs text-center text-slate-500">
          This is a computer-generated invoice. Goods once sold cannot be returned except as per warranty policy.
        </div>
      </div>
    </div>
  );
}
