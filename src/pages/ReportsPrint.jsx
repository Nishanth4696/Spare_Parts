import { useNavigate, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import {
  useGetPeriodSummaryQuery,
  useGetBreakdownQuery,
  useGetTopProductsQuery,
  useGetTopCustomersQuery,
  useGetPaymentBreakdownQuery,
  useGetAccountsQuery,
  useGetStockValueQuery,
  useGetLowStockQuery,
  useGetDeadStockQuery,
  useGetMoversQuery,
  useGetSettingsQuery,
} from '../store/apiSlice.js';
import { formatMoney } from '../lib/money.js';

export default function ReportsPrint() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const today = new Date().toISOString().slice(0, 10);
  const to = params.get('to') || today;
  const from = params.get('from') || to;

  const { data: settings = {} } = useGetSettingsQuery();
  const { data: summary } = useGetPeriodSummaryQuery({ from, to });
  const { data: byBrand = [] } = useGetBreakdownQuery({ by: 'brand', from, to });
  const { data: byCategory = [] } = useGetBreakdownQuery({ by: 'category', from, to });
  const { data: topProducts = [] } = useGetTopProductsQuery({ from, to, limit: 10 });
  const { data: topCustomers = [] } = useGetTopCustomersQuery({ from, to, limit: 10 });
  const { data: paymentBreakdown = [] } = useGetPaymentBreakdownQuery({ from, to });
  const { data: accounts } = useGetAccountsQuery();
  const { data: stockValue } = useGetStockValueQuery();
  const { data: lowStock = [] } = useGetLowStockQuery();
  const { data: deadStock = [] } = useGetDeadStockQuery({ days: 90 });
  const { data: fastMovers = [] } = useGetMoversQuery({ direction: 'fast', days: 30 });
  const { data: slowMovers = [] } = useGetMoversQuery({ direction: 'slow', days: 30 });

  const rangeLabel = from === to ? from : `${from} to ${to}`;

  return (
    <div className="min-h-screen bg-slate-200">
      <div className="no-print flex justify-center gap-3 py-4 bg-slate-900">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-lg text-lg cursor-pointer transition-colors duration-150"
        >
          <Printer size={20} /> Print / Save as PDF
        </button>
        <button
          onClick={() => navigate('/reports')}
          className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold px-6 py-3 rounded-lg text-lg cursor-pointer transition-colors duration-150"
        >
          <ArrowLeft size={20} /> Back to Reports
        </button>
      </div>

      <div className="mx-auto my-6 bg-white p-10" style={{ width: '210mm', minHeight: '297mm' }}>
        <div className="border-b-2 border-black pb-3 mb-5">
          <div className="text-2xl font-heading font-bold">{settings.shop_name}</div>
          <div className="text-sm text-slate-600">{settings.shop_address}</div>
          <div className="text-lg font-semibold mt-2">Sales &amp; Inventory Report — {rangeLabel}</div>
        </div>

        <ReportSection title="Sales summary">
          {summary && (
            <table className="w-full text-sm mb-2">
              <tbody>
                <Row label="Invoices billed" value={summary.current.invoice_count} />
                <Row label="Total sales" value={formatMoney(summary.current.total_sales)} />
                <Row label="Average bill value" value={formatMoney(summary.current.avg_bill)} />
                <Row label="GST collected" value={formatMoney(summary.current.total_gst)} />
                <Row label="Discounts given" value={formatMoney(summary.current.total_discount)} />
                <Row label="Gross profit (approx.)" value={formatMoney(summary.current.gross_profit)} />
              </tbody>
            </table>
          )}
          {paymentBreakdown.length > 0 && (
            <DataTable
              rows={paymentBreakdown}
              columns={[
                ['payment_mode', 'Payment mode'],
                ['count', 'Bills'],
                ['total', 'Total', formatMoney],
              ]}
            />
          )}
        </ReportSection>

        <div className="grid grid-cols-2 gap-6">
          <ReportSection title="Revenue by brand">
            <DataTable rows={byBrand} columns={[['key', 'Brand'], ['qty', 'Qty'], ['revenue', 'Revenue', formatMoney]]} />
          </ReportSection>
          <ReportSection title="Revenue by category">
            <DataTable rows={byCategory} columns={[['key', 'Category'], ['qty', 'Qty'], ['revenue', 'Revenue', formatMoney]]} />
          </ReportSection>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <ReportSection title="Top products by revenue">
            <DataTable
              rows={topProducts}
              columns={[['part_no', 'Part No'], ['name', 'Name'], ['qty_sold', 'Qty'], ['revenue', 'Revenue', formatMoney]]}
            />
          </ReportSection>
          <ReportSection title="Top customers by revenue">
            <DataTable
              rows={topCustomers}
              columns={[['name', 'Name'], ['invoice_count', 'Bills'], ['revenue', 'Revenue', formatMoney]]}
            />
          </ReportSection>
        </div>

        {accounts && (
          <div className="grid grid-cols-2 gap-6">
            <ReportSection title={`Receivable from customers — ${formatMoney(accounts.receivables)}`}>
              <DataTable
                rows={accounts.topReceivables}
                columns={[['name', 'Customer'], ['phone', 'Phone'], ['balance', 'Owes', formatMoney]]}
              />
            </ReportSection>
            <ReportSection title={`Payable to suppliers — ${formatMoney(accounts.payables)}`}>
              <DataTable
                rows={accounts.topPayables}
                columns={[['name', 'Supplier'], ['phone', 'Phone'], ['balance', 'Owed', formatMoney]]}
              />
            </ReportSection>
          </div>
        )}

        <ReportSection title="Current stock value">
          {stockValue && (
            <table className="w-full text-sm">
              <tbody>
                <Row label="Active SKUs" value={stockValue.sku_count} />
                <Row label="Total units on hand" value={stockValue.total_units} />
                <Row label="Stock value (at cost)" value={formatMoney(stockValue.cost_value)} />
                <Row label="Stock value (at sale price)" value={formatMoney(stockValue.sale_value)} />
              </tbody>
            </table>
          )}
        </ReportSection>

        <ReportSection title={`Low stock (${lowStock.length} parts at or below reorder level)`}>
          <DataTable
            rows={lowStock}
            columns={[
              ['part_no', 'Part No'],
              ['name', 'Name'],
              ['stock', 'Stock'],
              ['min_stock', 'Min'],
              ['rack_location', 'Rack'],
            ]}
          />
        </ReportSection>

        <ReportSection title="Dead stock — no sales in 90 days">
          <DataTable
            rows={deadStock}
            columns={[
              ['part_no', 'Part No'],
              ['name', 'Name'],
              ['stock', 'Stock'],
              ['tied_up_value', 'Capital tied up', formatMoney],
            ]}
          />
        </ReportSection>

        <div className="grid grid-cols-2 gap-6">
          <ReportSection title="Fast movers — last 30 days">
            <DataTable
              rows={fastMovers.slice(0, 10)}
              columns={[['part_no', 'Part No'], ['name', 'Name'], ['qty_sold', 'Qty sold'], ['stock', 'Stock left']]}
            />
          </ReportSection>
          <ReportSection title="Slow movers — last 30 days">
            <DataTable
              rows={slowMovers.slice(0, 10)}
              columns={[['part_no', 'Part No'], ['name', 'Name'], ['qty_sold', 'Qty sold'], ['stock', 'Stock left']]}
            />
          </ReportSection>
        </div>

        <div className="mt-8 text-xs text-center text-slate-400">
          Generated {new Date().toLocaleString('en-IN')} · Spare Parts POS
        </div>
      </div>
    </div>
  );
}

function ReportSection({ title, children }) {
  return (
    <div className="mb-6 break-inside-avoid">
      <div className="text-base font-heading font-semibold bg-slate-100 px-2 py-1.5 mb-2">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <tr>
      <td className="py-0.5 text-slate-600">{label}</td>
      <td className="py-0.5 text-right font-semibold">{value}</td>
    </tr>
  );
}

function DataTable({ rows, columns }) {
  return (
    <table className="w-full text-sm border border-slate-300">
      <thead>
        <tr className="bg-slate-100 text-left">
          {columns.map(([key, label]) => (
            <th key={key} className="px-2 py-1 border-b border-slate-300">{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.id ?? i}>
            {columns.map(([key, , fmt]) => (
              <td key={key} className="px-2 py-1 border-b border-slate-200">{fmt ? fmt(row[key]) : row[key]}</td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="px-2 py-2 text-center text-slate-400">
              None
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
