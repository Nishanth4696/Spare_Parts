const express = require('express');
const { db } = require('../db');

const router = express.Router();

function getSetting(key) {
  return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value;
}

function nextInvoiceNo() {
  const prefix = getSetting('invoice_prefix') || 'INV';
  const seq = Number(getSetting('next_invoice_seq') || '1');
  return `${prefix}-${String(seq).padStart(5, '0')}`;
}

router.get('/next-number', (req, res) => {
  res.json({ inv_no: nextInvoiceNo() });
});

router.get('/', (req, res) => {
  const { date, customer_id } = req.query;
  let sql = `
    SELECT i.*, c.name AS customer_name
    FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id
    WHERE 1=1`;
  const params = [];
  if (date) {
    sql += ' AND i.date = ?';
    params.push(date);
  }
  if (customer_id) {
    sql += ' AND i.customer_id = ?';
    params.push(customer_id);
  }
  sql += ' ORDER BY i.id DESC LIMIT 200';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const invoice = db
    .prepare(
      `SELECT i.*, c.name AS customer_name, c.phone AS customer_phone, c.gstin AS customer_gstin
       FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id WHERE i.id = ?`
    )
    .get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Not found' });
  invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);
  res.json(invoice);
});

// Finalize a bill: invoice + items + stock_ledger 'out' rows + stock decrement,
// all inside one transaction so a mid-sale crash can never leave stock out of sync.
// Finds an existing customer by exact phone, otherwise creates one — lets
// counter staff capture name+phone at billing time without a separate step.
function findOrCreateCustomer(name, phone) {
  if (!phone) {
    if (!name) return null;
    return db.prepare('INSERT INTO customers (name, type, balance) VALUES (?, \'retail\', 0)').run(name)
      .lastInsertRowid;
  }
  const existing = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
  if (existing) return existing.id;
  return db
    .prepare('INSERT INTO customers (name, type, phone, balance) VALUES (?, \'retail\', ?, 0)')
    .run(name || phone, phone).lastInsertRowid;
}

router.post('/', (req, res) => {
  const {
    items,
    discount = 0,
    customer_id = null,
    customer_name = null,
    customer_phone = null,
    payment_mode = 'cash',
    paid,
    user_id = null,
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items are required' });
  }

  const createInvoice = db.transaction(() => {
    const resolvedCustomerId =
      customer_id || findOrCreateCustomer(customer_name, customer_phone) || null;

    let subtotal = 0;
    let gstAmt = 0;
    const resolvedItems = [];

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
      if (!product) throw new Error(`Product ${item.product_id} not found`);
      if (product.stock < item.qty) {
        throw new Error(`Insufficient stock for ${product.name} (have ${product.stock}, need ${item.qty})`);
      }
      const price = item.price ?? product.sale_price;
      const gstRate = product.gst_rate;
      const lineTaxable = price * item.qty - (item.line_discount || 0);
      const lineGst = Math.round(lineTaxable * (gstRate / 100));
      const lineTotal = lineTaxable + lineGst;

      subtotal += lineTaxable;
      gstAmt += lineGst;

      resolvedItems.push({
        product, qty: item.qty, price, gstRate, lineTotal,
      });
    }

    const total = subtotal + gstAmt - discount;

    if (payment_mode === 'credit') {
      if (!resolvedCustomerId) throw new Error('Customer is required for credit sales');
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(resolvedCustomerId);
      if (!customer) throw new Error('Customer not found');
      if (customer.credit_limit > 0 && customer.balance + total > customer.credit_limit) {
        throw new Error(
          `Credit limit exceeded for ${customer.name} (limit ${customer.credit_limit}, would be ${customer.balance + total})`
        );
      }
    }

    const invNo = nextInvoiceNo();
    const paidAmount = paid ?? (payment_mode === 'credit' ? 0 : total);

    const invoiceInfo = db
      .prepare(
        `INSERT INTO invoices (inv_no, date, customer_id, subtotal, discount, gst_amt, total, paid, payment_mode, is_finalized)
         VALUES (?, date('now'), ?, ?, ?, ?, ?, ?, ?, 1)`
      )
      .run(invNo, resolvedCustomerId, subtotal, discount, gstAmt, total, paidAmount, payment_mode);

    const invoiceId = invoiceInfo.lastInsertRowid;

    const insertItem = db.prepare(
      `INSERT INTO invoice_items (invoice_id, product_id, name, part_no, qty, price, gst_rate, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertLedger = db.prepare(
      `INSERT INTO stock_ledger (product_id, type, qty, ref_type, ref_id, user_id, note)
       VALUES (?, 'out', ?, 'invoice', ?, ?, ?)`
    );
    const decrementStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

    for (const ri of resolvedItems) {
      insertItem.run(invoiceId, ri.product.id, ri.product.name, ri.product.part_no, ri.qty, ri.price, ri.gstRate, ri.lineTotal);
      insertLedger.run(ri.product.id, -ri.qty, invoiceId, user_id, `Sale ${invNo}`);
      decrementStock.run(ri.qty, ri.product.id);
    }

    // Bump the sequence only after everything above succeeded.
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(
      String(Number(getSetting('next_invoice_seq') || '1') + 1),
      'next_invoice_seq'
    );

    if (payment_mode === 'credit' && resolvedCustomerId) {
      db.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?').run(
        total - paidAmount,
        resolvedCustomerId
      );
    }

    return invoiceId;
  });

  try {
    const invoiceId = createInvoice();
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
