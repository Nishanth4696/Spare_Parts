const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, dataDir } = require('../db');

const router = express.Router();

const imagesDir = path.join(dataDir, 'images');
fs.mkdirSync(imagesDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: imagesDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `product-${req.params.id}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

router.get('/filters', (req, res) => {
  const brands = db
    .prepare("SELECT DISTINCT brand FROM products WHERE is_active = 1 AND brand IS NOT NULL AND brand != '' ORDER BY brand")
    .all()
    .map((r) => r.brand);
  const racks = db
    .prepare(
      "SELECT DISTINCT rack_location FROM products WHERE is_active = 1 AND rack_location IS NOT NULL AND rack_location != '' ORDER BY rack_location"
    )
    .all()
    .map((r) => r.rack_location);
  res.json({ brands, racks });
});

router.get('/', (req, res) => {
  const { search, brand, category, rack_location, low_stock } = req.query;
  let sql = 'SELECT * FROM products WHERE is_active = 1';
  const params = [];

  if (search) {
    sql += ' AND (part_no LIKE ? OR name LIKE ? OR barcode = ?)';
    const like = `%${search}%`;
    params.push(like, like, search);
  }
  if (brand) {
    sql += ' AND brand = ?';
    params.push(brand);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (rack_location) {
    sql += ' AND rack_location = ?';
    params.push(rack_location);
  }
  if (low_stock === '1') {
    sql += ' AND stock <= min_stock';
  }
  sql += ' ORDER BY name LIMIT 200';

  res.json(db.prepare(sql).all(...params));
});

router.get('/barcode/:code', (req, res) => {
  const product = db
    .prepare('SELECT * FROM products WHERE barcode = ? AND is_active = 1')
    .get(req.params.code);
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
});

router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
});

const productFields = [
  'part_no', 'name', 'brand', 'category', 'hsn', 'gst_rate',
  'cost_price', 'sale_price', 'mrp', 'garage_price',
  'stock', 'min_stock', 'rack_location', 'barcode', 'image_path',
];

router.post('/', (req, res) => {
  const body = req.body;
  if (!body.part_no || !body.name) {
    return res.status(400).json({ error: 'part_no and name are required' });
  }
  const cols = productFields.filter((f) => body[f] !== undefined);
  const placeholders = cols.map((c) => `@${c}`).join(', ');
  const stmt = db.prepare(
    `INSERT INTO products (${cols.join(', ')}, created_at, updated_at)
     VALUES (${placeholders}, datetime('now'), datetime('now'))`
  );
  const initialStock = body.stock || 0;
  const info = stmt.run(body);

  if (initialStock > 0) {
    db.prepare(
      `INSERT INTO stock_ledger (product_id, type, qty, ref_type, note)
       VALUES (?, 'adjust', ?, 'opening', 'Opening stock on product creation')`
    ).run(info.lastInsertRowid, initialStock);
  }

  res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const body = req.body;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const cols = productFields.filter((f) => body[f] !== undefined && f !== 'stock');
  const setClause = cols.map((c) => `${c} = @${c}`).join(', ');

  const updateProduct = db.transaction(() => {
    if (cols.length) {
      db.prepare(`UPDATE products SET ${setClause}, updated_at = datetime('now') WHERE id = @id`).run({
        ...body,
        id: req.params.id,
      });
    }
    // Stock is only ever changed through the ledger, even from the edit form.
    if (body.stock !== undefined && Number(body.stock) !== existing.stock) {
      const delta = Number(body.stock) - existing.stock;
      db.prepare(
        `INSERT INTO stock_ledger (product_id, type, qty, ref_type, note)
         VALUES (?, 'adjust', ?, 'manual', 'Manual stock correction')`
      ).run(req.params.id, delta);
      db.prepare(`UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?`).run(
        Number(body.stock),
        req.params.id
      );
    }
  });
  updateProduct();

  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

router.post('/:id/image', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    // Drop the previous file so re-uploads don't pile up in the images folder.
    if (product.image_path) {
      fs.unlink(path.join(imagesDir, product.image_path), () => {});
    }

    db.prepare(`UPDATE products SET image_path = ?, updated_at = datetime('now') WHERE id = ?`).run(
      req.file.filename,
      req.params.id
    );
    res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
  });
});

module.exports = router;
