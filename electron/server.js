const express = require('express');
const cors = require('cors');
const path = require('path');

const { dataDir } = require('./db'); // ensures schema is initialized before routes touch it

function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/images', express.static(path.join(dataDir, 'images')));

  app.use('/api/products', require('./routes/products'));
  app.use('/api/customers', require('./routes/customers'));
  app.use('/api/suppliers', require('./routes/suppliers'));
  app.use('/api/invoices', require('./routes/invoices'));
  app.use('/api/purchases', require('./routes/purchases'));
  app.use('/api/stock-ledger', require('./routes/stockLedger'));
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api/settings', require('./routes/settings'));
  app.use('/api/backup', require('./routes/backup'));

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal error' });
  });

  return app;
}

module.exports = { createServer };
