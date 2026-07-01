import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Billing from './pages/Billing.jsx';
import Products from './pages/Products.jsx';
import Purchases from './pages/Purchases.jsx';
import Customers from './pages/Customers.jsx';
import Reports from './pages/Reports.jsx';
import ReportsPrint from './pages/ReportsPrint.jsx';
import Settings from './pages/Settings.jsx';
import InvoicePrint from './pages/InvoicePrint.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/invoices/:id/print" element={<InvoicePrint />} />
      <Route path="/reports/print" element={<ReportsPrint />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Billing />} />
        <Route path="/products" element={<Products />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
