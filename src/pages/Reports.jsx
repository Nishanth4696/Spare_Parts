import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DatabaseBackup, AlertTriangle, FileDown,
  ArrowUpRight, ArrowDownRight, Wallet, HandCoins, PackageX, Minus,
} from 'lucide-react';
import {
  useGetPeriodSummaryQuery,
  useGetSalesTrendQuery,
  useGetBreakdownQuery,
  useGetTopProductsQuery,
  useGetTopCustomersQuery,
  useGetPaymentBreakdownQuery,
  useGetAccountsQuery,
  useGetDeadStockQuery,
  useGetStockValueQuery,
  useGetLowStockQuery,
  useGetMoversQuery,
  useRunBackupMutation,
} from '../store/apiSlice.js';
import { formatMoney } from '../lib/money.js';
import PageHeader from '../components/PageHeader.jsx';
import { useToast } from '../components/ToastProvider.jsx';

const PAYMENT_COLORS = { cash: '#0ea5e9', upi: '#8b5cf6', credit: '#f59e0b' };
const BRAND_COLORS = ['#0284c7', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];

// Backend dates are UTC date-only strings (SQLite `date('now')`). Going
// through a local-time Date (`new Date().setDate(...)`) and then
// `.toISOString()` round-trips through the local offset and can land on the
// wrong day in timezones ahead of UTC (e.g. IST) — same class of bug fixed
// in electron/routes/reports.js's addDays. Stick to UTC millisecond math.
function toISO(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}
function daysAgo(n) {
  return toISO(Date.now() - n * 86400000);
}

const PRESETS = [
  { key: 'today', label: 'Today', range: () => [daysAgo(0), daysAgo(0)] },
  { key: '7d', label: '7 days', range: () => [daysAgo(6), daysAgo(0)] },
  { key: '30d', label: '30 days', range: () => [daysAgo(29), daysAgo(0)] },
  { key: 'month', label: 'This month', range: () => [`${daysAgo(0).slice(0, 7)}-01`, daysAgo(0)] },
];

export default function Reports() {
  const navigate = useNavigate();
  const toast = useToast();
  const [preset, setPreset] = useState('7d');
  const [customRange, setCustomRange] = useState(null); // [from, to] when preset === 'custom'

  const [from, to] = customRange || PRESETS.find((p) => p.key === preset).range();

  const { data: summary } = useGetPeriodSummaryQuery({ from, to });
  const { data: trend = [] } = useGetSalesTrendQuery({ from, to });
  const { data: byBrand = [] } = useGetBreakdownQuery({ by: 'brand', from, to });
  const { data: byCategory = [] } = useGetBreakdownQuery({ by: 'category', from, to });
  const { data: topProducts = [] } = useGetTopProductsQuery({ from, to, limit: 8 });
  const { data: topCustomers = [] } = useGetTopCustomersQuery({ from, to, limit: 8 });
  const { data: paymentBreakdown = [] } = useGetPaymentBreakdownQuery({ from, to });
  const { data: accounts } = useGetAccountsQuery();
  const { data: deadStock = [] } = useGetDeadStockQuery({ days: 90 });
  const { data: stockValue } = useGetStockValueQuery();
  const { data: lowStock = [] } = useGetLowStockQuery();
  const { data: fastMovers = [] } = useGetMoversQuery({ direction: 'fast', days: 30 });
  const { data: slowMovers = [] } = useGetMoversQuery({ direction: 'slow', days: 30 });
  const [runBackup, { isLoading: backingUp }] = useRunBackupMutation();

  async function handleBackup() {
    const res = await runBackup().unwrap();
    toast.success(`Backup saved to ${res.path}`);
  }

  const paymentData = paymentBreakdown.map((pm) => ({ name: pm.payment_mode, value: pm.total }));

  const rangeLabel = from === to ? from : `${from} → ${to}`;

  return (
    <div className="p-6 flex flex-col gap-6 overflow-auto h-full max-w-[1500px]">
      <PageHeader
        title="Reports"
        subtitle={`Analytics for ${rangeLabel}`}
        actions={
          <>
            <button
              onClick={() => navigate(`/reports/print?from=${from}&to=${to}`)}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2.5 rounded-lg cursor-pointer transition-colors duration-150"
            >
              <FileDown size={18} /> Export as PDF
            </button>
            <button
              onClick={handleBackup}
              disabled={backingUp}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-semibold px-4 py-2.5 rounded-lg cursor-pointer transition-colors duration-150"
            >
              <DatabaseBackup size={18} /> {backingUp ? 'Backing up…' : 'Run backup now'}
            </button>
          </>
        }
      />

      <div className="flex items-center gap-2 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              setPreset(p.key);
              setCustomRange(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors duration-150 ${
              preset === p.key && !customRange
                ? 'bg-brand-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="date"
            value={from}
            onChange={(e) => setCustomRange([e.target.value, customRange ? customRange[1] : to])}
            className="input !w-auto !py-2 text-sm"
          />
          <span className="text-slate-400 text-sm">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setCustomRange([customRange ? customRange[0] : from, e.target.value])}
            className="input !w-auto !py-2 text-sm"
          />
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Revenue" value={formatMoney(summary.current.total_sales)} prev={summary.previous.total_sales} curr={summary.current.total_sales} accent="text-brand-700" />
          <KpiCard label="Invoices" value={summary.current.invoice_count} prev={summary.previous.invoice_count} curr={summary.current.invoice_count} />
          <KpiCard label="Avg bill" value={formatMoney(summary.current.avg_bill)} prev={summary.previous.avg_bill} curr={summary.current.avg_bill} />
          <KpiCard label="GST collected" value={formatMoney(summary.current.total_gst)} prev={summary.previous.total_gst} curr={summary.current.total_gst} />
          <KpiCard label="Discount given" value={formatMoney(summary.current.total_discount)} prev={summary.previous.total_discount} curr={summary.current.total_discount} />
          <KpiCard label="Gross profit" value={formatMoney(summary.current.gross_profit)} prev={summary.previous.gross_profit} curr={summary.current.gross_profit} accent="text-emerald-700" />
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <section className="col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-card">
          <h2 className="text-lg font-heading font-semibold text-slate-800 mb-4">Sales trend</h2>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <YAxis tickFormatter={(v) => `₹${Math.round(v / 100 / 1000)}k`} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={44} />
              <Tooltip formatter={(v) => formatMoney(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Area type="monotone" dataKey="total" stroke="#0284c7" strokeWidth={2} fill="url(#salesFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
          <h2 className="text-lg font-heading font-semibold text-slate-800 mb-4">Payment mode</h2>
          {paymentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3}>
                  {paymentData.map((entry) => (
                    <Cell key={entry.name} fill={PAYMENT_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(v)} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                <Legend formatter={(value) => <span className="capitalize text-sm text-slate-600">{value}</span>} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart height={230} text="No sales in this range" />
          )}
        </section>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
          <h2 className="text-lg font-heading font-semibold text-slate-800 mb-4">Revenue by brand</h2>
          {byBrand.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byBrand} dataKey="revenue" nameKey="key" innerRadius={48} outerRadius={78} paddingAngle={3}>
                  {byBrand.map((entry, i) => (
                    <Cell key={entry.key} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatMoney(v)} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                <Legend iconType="circle" formatter={(value) => <span className="text-sm text-slate-600">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart height={220} text="No sales in this range" />
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
          <h2 className="text-lg font-heading font-semibold text-slate-800 mb-4">Revenue by category</h2>
          {byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byCategory} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `₹${Math.round(v / 100 / 1000)}k`} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="key" width={100} tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatMoney(v)} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                <Bar dataKey="revenue" fill="#0284c7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart height={220} text="No sales in this range" />
          )}
        </section>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
          <h2 className="text-lg font-heading font-semibold text-slate-800 mb-4">Top products by revenue</h2>
          <RankedTable
            rows={topProducts}
            columns={[
              ['name', 'Product'],
              ['qty_sold', 'Qty'],
              ['revenue', 'Revenue', (v) => formatMoney(v)],
            ]}
          />
        </section>
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
          <h2 className="text-lg font-heading font-semibold text-slate-800 mb-4">Top customers by revenue</h2>
          <RankedTable
            rows={topCustomers}
            columns={[
              ['name', 'Customer'],
              ['invoice_count', 'Bills'],
              ['revenue', 'Revenue', (v) => formatMoney(v)],
            ]}
          />
        </section>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
        <h2 className="text-lg font-heading font-semibold text-slate-800 mb-4">Accounts</h2>
        {accounts && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-red-700 font-semibold">
                <Wallet size={17} /> Receivable from customers: {formatMoney(accounts.receivables)}
              </div>
              <RankedTable
                rows={accounts.topReceivables}
                columns={[['name', 'Customer'], ['phone', 'Phone'], ['balance', 'Owes', (v) => formatMoney(v)]]}
                emptyText="No outstanding customer balances"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-700 font-semibold">
                <HandCoins size={17} /> Payable to suppliers: {formatMoney(accounts.payables)}
              </div>
              <RankedTable
                rows={accounts.topPayables}
                columns={[['name', 'Supplier'], ['phone', 'Phone'], ['balance', 'Owed', (v) => formatMoney(v)]]}
                emptyText="No outstanding supplier balances"
              />
            </div>
          </div>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
        <h2 className="text-lg font-heading font-semibold text-slate-800 mb-4">Current stock value</h2>
        {stockValue && (
          <div className="grid grid-cols-4 gap-4">
            <KpiCard label="SKUs" value={stockValue.sku_count} />
            <KpiCard label="Total units" value={stockValue.total_units} />
            <KpiCard label="Cost value" value={formatMoney(stockValue.cost_value)} />
            <KpiCard label="Sale value" value={formatMoney(stockValue.sale_value)} accent="text-brand-700" />
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-4">
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
          <h2 className="text-lg font-heading font-semibold text-amber-700 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} /> Low stock ({lowStock.length})
          </h2>
          <RankedTable
            rows={lowStock}
            columns={[
              ['part_no', 'Part No'],
              ['name', 'Name'],
              ['stock', 'Stock'],
              ['min_stock', 'Min'],
            ]}
          />
        </section>
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
          <h2 className="text-lg font-heading font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <PackageX size={18} className="text-slate-400" /> Dead stock (90d, no sales)
          </h2>
          <RankedTable
            rows={deadStock}
            columns={[
              ['name', 'Name'],
              ['stock', 'Stock'],
              ['tied_up_value', 'Capital tied up', (v) => formatMoney(v)],
            ]}
            emptyText="Nothing has gone unsold for 90 days"
          />
        </section>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MoverChart title="Fast movers (30d, by qty)" icon={<TrendingUp size={18} className="text-emerald-600" />} data={fastMovers} color="#10b981" />
        <MoverChart title="Slow movers (30d, by qty)" icon={<TrendingDown size={18} className="text-slate-400" />} data={slowMovers} color="#94a3b8" />
      </div>
    </div>
  );
}

function KpiCard({ label, value, prev, curr, accent = 'text-slate-800' }) {
  let change = null;
  if (prev !== undefined && curr !== undefined) {
    if (prev === 0 && curr === 0) change = 0;
    else if (prev === 0) change = null; // "new" — no baseline to compare to
    else change = ((curr - prev) / prev) * 100;
  }
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-lg px-3.5 py-3">
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-heading font-bold ${accent}`}>{value}</div>
      {change !== null && (
        <div className={`flex items-center gap-0.5 text-xs font-semibold mt-0.5 ${
          change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-500' : 'text-slate-400'
        }`}>
          {change > 0 ? <ArrowUpRight size={13} /> : change < 0 ? <ArrowDownRight size={13} /> : <Minus size={13} />}
          {Math.abs(change).toFixed(0)}% vs previous period
        </div>
      )}
    </div>
  );
}

function MoverChart({ title, icon, data, color }) {
  const chartData = [...data].slice(0, 8).reverse();
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
      <h2 className="text-lg font-heading font-semibold text-slate-800 mb-4 flex items-center gap-2">
        {icon} {title}
      </h2>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fontSize: 12, fill: '#334155' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v.length > 18 ? `${v.slice(0, 18)}…` : v)}
            />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} formatter={(v) => [`${v} sold`, '']} />
            <Bar dataKey="qty_sold" fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChart height={220} text="No data" />
      )}
    </section>
  );
}

function EmptyChart({ height, text }) {
  return (
    <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height }}>
      {text}
    </div>
  );
}

function RankedTable({ rows, columns, emptyText = 'No data' }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left border-b border-slate-200 text-slate-500">
          {columns.map(([key, label]) => (
            <th key={key} className="py-1.5">{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.id ?? i} className="border-b border-slate-100">
            {columns.map(([key, , fmt]) => (
              <td key={key} className="py-1.5 text-slate-700">{fmt ? fmt(row[key]) : row[key]}</td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="py-4 text-center text-slate-400">
              {emptyText}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
