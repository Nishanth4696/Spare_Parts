const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const { search } = req.query;
  let sql = 'SELECT * FROM suppliers WHERE 1=1';
  const params = [];
  if (search) {
    sql += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }
  sql += ' ORDER BY name LIMIT 100';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Not found' });
  res.json(supplier);
});

router.post('/', (req, res) => {
  const { name, gstin, phone, credit_days = 0 } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const info = db
    .prepare(
      'INSERT INTO suppliers (name, gstin, phone, credit_days, balance) VALUES (?, ?, ?, ?, 0)'
    )
    .run(name, gstin || null, phone || null, credit_days);
  res.status(201).json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, gstin, phone, credit_days } = req.body;
  const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE suppliers SET name = ?, gstin = ?, phone = ?, credit_days = ? WHERE id = ?').run(
    name ?? existing.name,
    gstin ?? existing.gstin,
    phone ?? existing.phone,
    credit_days ?? existing.credit_days,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id));
});

module.exports = router;
