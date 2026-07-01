const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const { search } = req.query;
  let sql = 'SELECT * FROM customers WHERE 1=1';
  const params = [];
  if (search) {
    sql += ' AND (name LIKE ? OR phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY name LIMIT 100';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Not found' });
  res.json(customer);
});

router.post('/', (req, res) => {
  const { name, type = 'retail', phone, gstin, credit_limit = 0 } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const info = db
    .prepare(
      'INSERT INTO customers (name, type, phone, gstin, credit_limit, balance) VALUES (?, ?, ?, ?, ?, 0)'
    )
    .run(name, type, phone || null, gstin || null, credit_limit);
  res.status(201).json(db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, type, phone, gstin, credit_limit } = req.body;
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare(
    'UPDATE customers SET name = ?, type = ?, phone = ?, gstin = ?, credit_limit = ? WHERE id = ?'
  ).run(
    name ?? existing.name,
    type ?? existing.type,
    phone ?? existing.phone,
    gstin ?? existing.gstin,
    credit_limit ?? existing.credit_limit,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id));
});

module.exports = router;
