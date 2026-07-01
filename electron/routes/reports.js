const express = require('express');
const { db } = require('../db');

const router = express.Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function resolveRange(req) {
  const to = req.query.to || todayStr();
  const from = req.query.from || to;
  return { from, to };
}

// Pure UTC date-only arithmetic. Going through the local-time Date
// constructor (`new Date(dateStr + 'T00:00:00')`) and then `.toISOString()`
// round-trips through the local timezone offset — in any zone ahead of UTC
// (e.g. IST, UTC+5:30) that can shift the date backward by a day, making
// `addDays(d, 1) === d` and turning the sales-trend loop below infinite.
function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

function periodSummary(from, to) {
  const summary = db
    .prepare(
      `SELECT COUNT(*) AS invoice_count, COALESCE(SUM(total), 0) AS total_sales,
              COALESCE(SUM(gst_amt), 0) AS total_gst, COALESCE(SUM(discount), 0) AS total_discount
       FROM invoices WHERE date BETWEEN ? AND ?`
    )
    .get(from, to);

  const grossProfit = db
    .prepare(
      `SELECT COALESCE(SUM(ii.line_total - (p.cost_price * ii.qty)), 0) AS gross_profit
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       JOIN products p ON p.id = ii.product_id
       WHERE i.date BETWEEN ? AND ?`
    )
    .get(from, to).gross_profit;

  const avgBill = summary.invoice_count > 0 ? Math.round(summary.total_sales / summary.invoice_count) : 0;

  return { ...summary, avg_bill: avgBill, gross_profit: grossProfit };
}

router.get('/daily-sales', (req, res) => {
  const date = req.query.date || todayStr();
  const summary = periodSummary(date, date);
  const byPaymentMode = db
    .prepare(
      `SELECT payment_mode, COUNT(*) AS count, COALESCE(SUM(total), 0) AS total
       FROM invoices WHERE date = ? GROUP BY payment_mode`
    )
    .all(date);
  res.json({ date, ...summary, by_payment_mode: byPaymentMode });
});

// KPI summary for an arbitrary date range, plus the same metrics for the
// immediately-preceding period of equal length, so the UI can show % change.
router.get('/period-summary', (req, res) => {
  const { from, to } = resolveRange(req);
  const periodDays = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(periodDays - 1));

  res.json({
    from,
    to,
    current: periodSummary(from, to),
    previous: periodSummary(prevFrom, prevTo),
  });
});

router.get('/sales-trend', (req, res) => {
  let from = req.query.from;
  let to = req.query.to;
  if (!from || !to) {
    const days = Math.min(Number(req.query.days || 14), 180);
    to = todayStr();
    from = addDays(to, -(days - 1));
  }

  const rows = db
    .prepare(
      `SELECT date, COUNT(*) AS count, COALESCE(SUM(total), 0) AS total, COALESCE(SUM(gst_amt), 0) AS gst
       FROM invoices
       WHERE date BETWEEN ? AND ?
       GROUP BY date`
    )
    .all(from, to);
  const byDate = Object.fromEntries(rows.map((r) => [r.date, r]));

  // Fill in zero-sale days so the trend line/bars stay continuous.
  const series = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    series.push(byDate[d] || { date: d, count: 0, total: 0, gst: 0 });
  }
  res.json(series);
});

router.get('/breakdown', (req, res) => {
  const { from, to } = resolveRange(req);
  const by = req.query.by === 'category' ? 'category' : 'brand';
  const rows = db
    .prepare(
      `SELECT COALESCE(NULLIF(p.${by}, ''), 'Unspecified') AS key,
              COALESCE(SUM(ii.line_total), 0) AS revenue,
              COALESCE(SUM(ii.qty), 0) AS qty
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       JOIN products p ON p.id = ii.product_id
       WHERE i.date BETWEEN ? AND ?
       GROUP BY key
       ORDER BY revenue DESC`
    )
    .all(from, to);
  res.json(rows);
});

router.get('/top-products', (req, res) => {
  const { from, to } = resolveRange(req);
  const limit = Math.min(Number(req.query.limit || 10), 50);
  const orderBy = req.query.by === 'qty' ? 'qty_sold' : 'revenue';
  const rows = db
    .prepare(
      `SELECT p.id, p.part_no, p.name, p.brand, p.stock,
              COALESCE(SUM(ii.qty), 0) AS qty_sold,
              COALESCE(SUM(ii.line_total), 0) AS revenue
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       JOIN products p ON p.id = ii.product_id
       WHERE i.date BETWEEN ? AND ?
       GROUP BY p.id
       ORDER BY ${orderBy} DESC
       LIMIT ?`
    )
    .all(from, to, limit);
  res.json(rows);
});

router.get('/top-customers', (req, res) => {
  const { from, to } = resolveRange(req);
  const limit = Math.min(Number(req.query.limit || 10), 50);
  const rows = db
    .prepare(
      `SELECT COALESCE(c.id, 0) AS id,
              COALESCE(c.name, 'Walk-in customer') AS name,
              COALESCE(c.type, 'retail') AS type,
              COUNT(*) AS invoice_count,
              COALESCE(SUM(i.total), 0) AS revenue
       FROM invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
       WHERE i.date BETWEEN ? AND ?
       GROUP BY COALESCE(c.id, 0)
       ORDER BY revenue DESC
       LIMIT ?`
    )
    .all(from, to, limit);
  res.json(rows);
});

router.get('/payment-breakdown', (req, res) => {
  const { from, to } = resolveRange(req);
  res.json(
    db
      .prepare(
        `SELECT payment_mode, COUNT(*) AS count, COALESCE(SUM(total), 0) AS total
         FROM invoices WHERE date BETWEEN ? AND ? GROUP BY payment_mode`
      )
      .all(from, to)
  );
});

router.get('/accounts', (req, res) => {
  const receivables = db
    .prepare(`SELECT COALESCE(SUM(balance), 0) AS total FROM customers WHERE balance > 0`)
    .get().total;
  const payables = db
    .prepare(`SELECT COALESCE(SUM(balance), 0) AS total FROM suppliers WHERE balance > 0`)
    .get().total;
  const topReceivables = db
    .prepare(`SELECT id, name, phone, balance FROM customers WHERE balance > 0 ORDER BY balance DESC LIMIT 5`)
    .all();
  const topPayables = db
    .prepare(`SELECT id, name, phone, balance FROM suppliers WHERE balance > 0 ORDER BY balance DESC LIMIT 5`)
    .all();
  res.json({ receivables, payables, topReceivables, topPayables });
});

router.get('/dead-stock', (req, res) => {
  const days = Math.min(Number(req.query.days || 90), 365);
  const rows = db
    .prepare(
      `SELECT p.id, p.part_no, p.name, p.brand, p.stock, p.cost_price,
              (p.stock * p.cost_price) AS tied_up_value
       FROM products p
       WHERE p.is_active = 1 AND p.stock > 0
         AND p.id NOT IN (
           SELECT ii.product_id FROM invoice_items ii
           JOIN invoices i ON i.id = ii.invoice_id
           WHERE i.date >= date('now', ?)
         )
       ORDER BY tied_up_value DESC
       LIMIT 20`
    )
    .all(`-${days} days`);
  res.json(rows);
});

router.get('/stock-value', (req, res) => {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(stock * cost_price), 0) AS cost_value,
              COALESCE(SUM(stock * sale_price), 0) AS sale_value,
              COUNT(*) AS sku_count,
              COALESCE(SUM(stock), 0) AS total_units
       FROM products WHERE is_active = 1`
    )
    .get();
  res.json(row);
});

router.get('/low-stock', (req, res) => {
  res.json(
    db
      .prepare(
        `SELECT * FROM products WHERE is_active = 1 AND stock <= min_stock ORDER BY (stock - min_stock) ASC`
      )
      .all()
  );
});

router.get('/movers', (req, res) => {
  const days = Number(req.query.days || 30);
  const direction = req.query.direction === 'slow' ? 'ASC' : 'DESC';
  const rows = db
    .prepare(
      `SELECT p.id, p.part_no, p.name, p.brand, p.stock,
              COALESCE(SUM(ii.qty), 0) AS qty_sold
       FROM products p
       LEFT JOIN invoice_items ii ON ii.product_id = p.id
       LEFT JOIN invoices i ON i.id = ii.invoice_id AND i.date >= date('now', ?)
       WHERE p.is_active = 1
       GROUP BY p.id
       ORDER BY qty_sold ${direction}
       LIMIT 20`
    )
    .all(`-${days} days`);
  res.json(rows);
});

module.exports = router;
