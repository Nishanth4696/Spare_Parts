const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const sql = `
    SELECT p.*, s.name AS supplier_name
    FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id
    ORDER BY p.id DESC LIMIT 200`;
  res.json(db.prepare(sql).all());
});

router.get('/:id', (req, res) => {
  const purchase = db
    .prepare(
      `SELECT p.*, s.name AS supplier_name FROM purchases p
       LEFT JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ?`
    )
    .get(req.params.id);
  if (!purchase) return res.status(404).json({ error: 'Not found' });
  purchase.items = db
    .prepare(
      `SELECT pi.*, pr.name, pr.part_no FROM purchase_items pi
       JOIN products pr ON pr.id = pi.product_id WHERE pi.purchase_id = ?`
    )
    .all(req.params.id);
  res.json(purchase);
});

// Stock-in: purchase + items + stock_ledger 'in' rows + stock increment + supplier payable,
// all in one transaction. This is how the catalog grows over time (see build spec §0.2).
router.post('/', (req, res) => {
  const { supplier_id, date, supplier_inv_no, items, on_credit = true, user_id = null } = req.body;

  if (!supplier_id) return res.status(400).json({ error: 'supplier_id is required' });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items are required' });
  }

  const createPurchase = db.transaction(() => {
    let total = 0;
    for (const item of items) {
      if (!item.product_id) throw new Error('Each item needs a product_id');
      total += item.cost * item.qty;
    }

    const purchaseInfo = db
      .prepare(
        `INSERT INTO purchases (supplier_id, date, supplier_inv_no, total)
         VALUES (?, ?, ?, ?)`
      )
      .run(supplier_id, date || new Date().toISOString().slice(0, 10), supplier_inv_no || null, total);

    const purchaseId = purchaseInfo.lastInsertRowid;

    const insertItem = db.prepare(
      'INSERT INTO purchase_items (purchase_id, product_id, qty, cost) VALUES (?, ?, ?, ?)'
    );
    const insertLedger = db.prepare(
      `INSERT INTO stock_ledger (product_id, type, qty, ref_type, ref_id, user_id, note)
       VALUES (?, 'in', ?, 'purchase', ?, ?, ?)`
    );
    const incrementStock = db.prepare(
      'UPDATE products SET stock = stock + ?, cost_price = ?, updated_at = datetime(\'now\') WHERE id = ?'
    );

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
      if (!product) throw new Error(`Product ${item.product_id} not found`);

      insertItem.run(purchaseId, item.product_id, item.qty, item.cost);
      insertLedger.run(item.product_id, item.qty, purchaseId, user_id, `Purchase #${purchaseId}`);
      incrementStock.run(item.qty, item.cost, item.product_id);
    }

    if (on_credit) {
      db.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ?').run(total, supplier_id);
    }

    return purchaseId;
  });

  try {
    const purchaseId = createPurchase();
    const purchase = db.prepare('SELECT * FROM purchases WHERE id = ?').get(purchaseId);
    purchase.items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(purchaseId);
    res.status(201).json(purchase);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
