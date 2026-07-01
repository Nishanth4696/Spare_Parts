const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const { product_id } = req.query;
  let sql = `
    SELECT sl.*, p.name AS product_name, p.part_no
    FROM stock_ledger sl JOIN products p ON p.id = sl.product_id
    WHERE 1=1`;
  const params = [];
  if (product_id) {
    sql += ' AND sl.product_id = ?';
    params.push(product_id);
  }
  sql += ' ORDER BY sl.id DESC LIMIT 300';
  res.json(db.prepare(sql).all(...params));
});

module.exports = router;
