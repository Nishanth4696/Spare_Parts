import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ReceiptText, Package, Truck, BarChart3, Users, Settings as SettingsIcon, Wrench, AlertTriangle, DatabaseBackup } from 'lucide-react';
import { useGetSettingsQuery, useGetDailySalesQuery, useGetLowStockQuery, useGetBackupsQuery } from '../store/apiSlice.js';
import { formatMoney } from '../lib/money.js';

const NAV_ITEMS = [
  { to: '/', label: 'Billing', key: 'F1', icon: ReceiptText },
  { to: '/products', label: 'Products', key: 'F2', icon: Package },
  { to: '/purchases', label: 'Purchases', key: 'F3', icon: Truck },
  { to: '/customers', label: 'Customers', key: 'F4', icon: Users },
  { to: '/reports', label: 'Reports', key: 'F5', icon: BarChart3 },
  { to: '/settings', label: 'Settings', key: 'F6', icon: SettingsIcon },
];

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function backupAgeLabel(mtime) {
  if (!mtime) return { text: 'No backup yet', tone: 'text-red-400' };
  const hrs = (Date.now() - new Date(mtime).getTime()) / 3600000;
  const tone = hrs > 36 ? 'text-red-400' : hrs > 20 ? 'text-amber-400' : 'text-slate-500';
  const text =
    hrs < 1 ? 'Backed up just now' : hrs < 24 ? `Backed up ${Math.round(hrs)}h ago` : `Backed up ${Math.round(hrs / 24)}d ago`;
  return { text, tone };
}

export default function Layout() {
  const navigate = useNavigate();
  const { data: settings } = useGetSettingsQuery();
  const now = useClock();
  const today = now.toISOString().slice(0, 10);
  const { data: dailySales } = useGetDailySalesQuery(today);
  const { data: lowStock = [] } = useGetLowStockQuery();
  const { data: backups = [] } = useGetBackupsQuery();
  const backupStatus = backupAgeLabel(backups[0]?.mtime);

  useEffect(() => {
    function handleKeyDown(e) {
      const item = NAV_ITEMS.find((n) => n.key === e.key);
      if (item) {
        e.preventDefault();
        navigate(item.to);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="flex h-screen bg-slate-50">
      <nav className="w-56 shrink-0 bg-slate-900 text-slate-100 flex flex-col">
        <div className="flex items-center gap-2 px-4 h-16 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <Wrench size={18} className="text-white" />
          </div>
          <div className="font-heading font-semibold text-base leading-tight truncate">
            {settings?.shop_name || 'Spare Parts POS'}
          </div>
        </div>

        <div className="mx-3 mt-3 bg-slate-800/70 rounded-lg px-3 py-2.5">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Today's sales</div>
          <div className="text-lg font-heading font-bold text-white">
            {dailySales ? formatMoney(dailySales.total_sales) : '—'}
          </div>
          <div className="text-[11px] text-slate-400">{dailySales?.invoice_count ?? 0} bills so far</div>
        </div>

        <div className="flex-1 py-3 px-2 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-[15px] font-medium cursor-pointer transition-colors duration-150 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-card'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <span className="flex items-center gap-2.5">
                <item.icon size={18} strokeWidth={2} />
                {item.label}
                {item.to === '/reports' && lowStock.length > 0 && (
                  <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-400 text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
                    <AlertTriangle size={10} /> {lowStock.length}
                  </span>
                )}
              </span>
              <span className="text-[11px] text-slate-500">{item.key}</span>
            </NavLink>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500 flex flex-col gap-1">
          <span className={`flex items-center gap-1.5 ${backupStatus.tone}`}>
            <DatabaseBackup size={12} /> {backupStatus.text}
          </span>
          <span>
            {now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ·{' '}
            {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </nav>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
