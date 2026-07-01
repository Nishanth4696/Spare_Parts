CREATE TABLE IF NOT EXISTS products (
  id           INTEGER PRIMARY KEY,
  part_no      TEXT NOT NULL,
  name         TEXT NOT NULL,
  brand        TEXT,
  category     TEXT,
  hsn          TEXT,
  gst_rate     REAL DEFAULT 18,
  cost_price   INTEGER DEFAULT 0,
  sale_price   INTEGER DEFAULT 0,
  mrp          INTEGER DEFAULT 0,
  garage_price INTEGER DEFAULT 0,
  stock        INTEGER DEFAULT 0,
  min_stock    INTEGER DEFAULT 0,
  rack_location TEXT,
  barcode      TEXT,
  image_path   TEXT,
  is_active    INTEGER DEFAULT 1,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_partno  ON products(part_no);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name    ON products(name);

CREATE TABLE IF NOT EXISTS bike_models (
  id         INTEGER PRIMARY KEY,
  brand      TEXT NOT NULL,
  model_name TEXT NOT NULL,
  year_from  INTEGER, year_to INTEGER
);

CREATE TABLE IF NOT EXISTS part_fitment (
  product_id INTEGER, model_id INTEGER,
  PRIMARY KEY (product_id, model_id)
);

CREATE TABLE IF NOT EXISTS part_alt (
  product_id INTEGER, alt_product_id INTEGER,
  PRIMARY KEY (product_id, alt_product_id)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL, gstin TEXT, phone TEXT,
  credit_days INTEGER DEFAULT 0,
  balance INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY,
  supplier_id INTEGER, date TEXT, supplier_inv_no TEXT,
  total INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY,
  purchase_id INTEGER, product_id INTEGER,
  qty INTEGER, cost INTEGER
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  name TEXT, type TEXT DEFAULT 'retail',
  phone TEXT, gstin TEXT,
  credit_limit INTEGER DEFAULT 0,
  balance INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY,
  inv_no TEXT UNIQUE NOT NULL,
  date TEXT, customer_id INTEGER,
  subtotal INTEGER, discount INTEGER DEFAULT 0,
  gst_amt INTEGER, total INTEGER,
  paid INTEGER DEFAULT 0, payment_mode TEXT,
  is_finalized INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER, product_id INTEGER,
  name TEXT, part_no TEXT,
  qty INTEGER, price INTEGER, gst_rate REAL,
  line_total INTEGER
);

CREATE TABLE IF NOT EXISTS stock_ledger (
  id INTEGER PRIMARY KEY,
  product_id INTEGER,
  type TEXT,
  qty INTEGER,
  ref_type TEXT, ref_id INTEGER,
  user_id INTEGER, ts TEXT DEFAULT (datetime('now')), note TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT, role TEXT DEFAULT 'staff',
  pin_hash TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  party_type TEXT, party_id INTEGER,
  amount INTEGER, mode TEXT, ts TEXT DEFAULT (datetime('now')), note TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
