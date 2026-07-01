# Two-Wheeler Spare Parts POS — Build Spec

A single-PC, offline, hardware-optional point-of-sale + inventory app for a
3-brand-deep two-wheeler spare parts shop (Honda, Hero, TVS).

Stack: **React + Vite + Tailwind + Electron** (frontend/shell), **Node + Express**
(embedded in Electron main process), **SQLite** (single-file DB).

---

## 0. Guiding philosophy (read before coding)

1. **Ship the billing loop first.** The shop cannot open without: add product → find product → bill → stock decrements → print. Everything else is secondary. Build P1, use it, then extend.
2. **Catalog your stock, not the universe.** Do NOT try to pre-load every part of every bike. The product master grows as you enter purchases. A new staffer needs "the part we have + its rack," not an encyclopedia.
3. **Fast + legible beats beautiful.** Counter tool used at speed by an untrained person: big fonts, high contrast, keyboard-first, minimal clicks to bill. Any "pretty" that adds a click to a sale is an anti-feature.
4. **Self-imposed timebox:** target a usable P1 in ~2–3 weeks of evenings. Resist gold-plating.

---

## 1. Locked architecture decisions

| Decision | Choice | Reason |
|---|---|---|
| Terminals | 1 PC | Embed API + DB in Electron. No server, no LAN, no sync. |
| DB | SQLite | Relational data (parts↔models↔invoices↔stock), offline, zero-admin, one file. |
| Backend | Node + Express in Electron main process | No separate process to manage on one PC. |
| Hardware | Optional / pluggable | Scanner = keyboard emulation (works today). Printing behind an abstraction; PDF/browser print first, ESC/POS thermal later. |
| Money storage | INTEGER paise | Avoids float rounding bugs. `₹123.50` stored as `12350`. Format only at display. |

**Suggested libraries**
- DB access: `better-sqlite3` (synchronous, fast, simple) or **Prisma** if you want typed models + migrations. For learning + safety, Prisma is a good pick.
- Data grid: TanStack Table (fast, keyboard-friendly).
- State/server-cache: TanStack Query (even against a local API) or just fetch + Zustand.
- PDF invoice: `pdfmake` or render HTML → print. Thermal later: `node-thermal-printer` (ESC/POS).
- Barcode label gen: `bwip-js`.
- Backup: plain `fs` copy of the `.sqlite` file on a schedule.

---

## 2. Non-negotiables (bake these in from day one)

- **Automatic backup.** One corrupt SQLite file = the whole business gone. On every app close (and daily), copy the DB to a timestamped file on disk + optionally a USB path / cloud folder. Keep last N backups. This is P1, not later.
- **Stock only moves through a ledger.** Never a bare `UPDATE products SET stock = ...`. Every change is a row in `stock_ledger` (in / out / adjust / return); current stock is derived or updated inside the same transaction. Gives you auditability + pilferage tracing.
- **Invoices are immutable once printed.** No editing a finalized bill. Corrections happen via a return/credit note. Prevents the classic "edited bill" fraud + keeps GST clean.
- **Keyboard-first billing.** Enter to add, arrow keys to pick, F-keys for actions. A trained counter person should be able to bill without the mouse.
- **Every price field is GST-inclusive-aware.** Decide once (recommend: store prices ex-GST, compute tax at billing) and be consistent.

---

## 3. Feature phases

### Phase 1 — MVP (the shop runs on this)
- **Product master CRUD**: part_no, name, brand, category, HSN, gst_rate, cost, sale, mrp, garage_price, stock, min_stock, **rack_location**, barcode, image (optional).
- **Fast find**: search by part_no / name / brand / model; **barcode scan → instant match**.
- **Billing**: add items, retail vs garage price toggle, line + bill discount, auto CGST+SGST, save, print. GST-compliant invoice (see §6).
- **Stock auto-decrement** on sale (via ledger). **Low-stock alert** when stock ≤ min_stock.
- **Purchase / stock-in**: supplier, invoice no, cost, qty → stock increments (via ledger).
- **Reports**: daily sales, gross profit, current stock value, fast/slow movers.
- **Automatic backup.**

### Phase 2 — differentiators + money control (your real edge)
- **Find-by-bike-model**: brand → model → compatible in-stock parts + rack location. (This is the "new person finds parts easily" feature.)
- **Part compatibility** (part_fitment, many-to-many) + **substitute/alternate parts** (OEM ↔ aftermarket).
- **Customer/garage accounts + receivables**: credit limit, outstanding balance, ageing. (Guards the credit-trap: garages bleed you without this.)
- **Supplier accounts + payables**: balance owed, credit-period countdown.
- **User roles**: owner vs staff. Staff can't see cost price, can't delete, can't edit past bills.
- **Audit log / stock ledger view**: who moved what, when.
- **Barcode label generation** for parts arriving without a barcode.

### Phase 3 — nice-to-have
- Reorder suggestions (low stock + fast mover → purchase list).
- Returns / warranty tracking (defective part → supplier claim).
- Spec sheets + richer images (the "encyclopedia" layer — deliberately LAST).
- Day-close / cashbook, WhatsApp bill sharing.

---

## 4. Data model (SQLite DDL — starting point)

> Money columns are INTEGER paise. Timestamps are ISO text or unix epoch.

```sql
CREATE TABLE products (
  id           INTEGER PRIMARY KEY,
  part_no      TEXT NOT NULL,
  name         TEXT NOT NULL,
  brand        TEXT,                 -- Honda / Hero / TVS / ...
  category     TEXT,                 -- brake / clutch / filter / electrical ...
  hsn          TEXT,
  gst_rate     REAL DEFAULT 18,
  cost_price   INTEGER DEFAULT 0,    -- paise
  sale_price   INTEGER DEFAULT 0,
  mrp          INTEGER DEFAULT 0,
  garage_price INTEGER DEFAULT 0,
  stock        INTEGER DEFAULT 0,
  min_stock    INTEGER DEFAULT 0,
  rack_location TEXT,
  barcode      TEXT,
  image_path   TEXT,
  is_active    INTEGER DEFAULT 1,
  created_at   TEXT, updated_at TEXT
);
CREATE INDEX idx_products_partno  ON products(part_no);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_name    ON products(name);

CREATE TABLE bike_models (
  id         INTEGER PRIMARY KEY,
  brand      TEXT NOT NULL,
  model_name TEXT NOT NULL,         -- Activa / Splendor / Jupiter ...
  year_from  INTEGER, year_to INTEGER
);

CREATE TABLE part_fitment (          -- which part fits which model (M:N)
  product_id INTEGER, model_id INTEGER,
  PRIMARY KEY (product_id, model_id)
);

CREATE TABLE part_alt (              -- substitute / alternate parts
  product_id INTEGER, alt_product_id INTEGER,
  PRIMARY KEY (product_id, alt_product_id)
);

CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL, gstin TEXT, phone TEXT,
  credit_days INTEGER DEFAULT 0,
  balance INTEGER DEFAULT 0          -- payable, paise
);

CREATE TABLE purchases (
  id INTEGER PRIMARY KEY,
  supplier_id INTEGER, date TEXT, supplier_inv_no TEXT,
  total INTEGER DEFAULT 0, created_at TEXT
);
CREATE TABLE purchase_items (
  id INTEGER PRIMARY KEY,
  purchase_id INTEGER, product_id INTEGER,
  qty INTEGER, cost INTEGER
);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT, type TEXT DEFAULT 'retail',   -- retail | garage
  phone TEXT, gstin TEXT,
  credit_limit INTEGER DEFAULT 0,
  balance INTEGER DEFAULT 0                 -- receivable, paise
);

CREATE TABLE invoices (
  id INTEGER PRIMARY KEY,
  inv_no TEXT UNIQUE NOT NULL,              -- sequential series
  date TEXT, customer_id INTEGER,
  subtotal INTEGER, discount INTEGER DEFAULT 0,
  gst_amt INTEGER, total INTEGER,
  paid INTEGER DEFAULT 0, payment_mode TEXT, -- cash | upi | credit
  is_finalized INTEGER DEFAULT 1,           -- immutable once set
  created_at TEXT
);
CREATE TABLE invoice_items (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER, product_id INTEGER,
  qty INTEGER, price INTEGER, gst_rate REAL,
  line_total INTEGER
);

CREATE TABLE stock_ledger (               -- single source of truth for stock changes
  id INTEGER PRIMARY KEY,
  product_id INTEGER,
  type TEXT,                              -- in | out | adjust | return
  qty INTEGER,                            -- signed
  ref_type TEXT, ref_id INTEGER,          -- e.g. 'invoice'/'purchase'
  user_id INTEGER, ts TEXT, note TEXT
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT, role TEXT DEFAULT 'staff',    -- owner | staff
  pin_hash TEXT
);

CREATE TABLE payments (                    -- customer receipts / supplier payments
  id INTEGER PRIMARY KEY,
  party_type TEXT, party_id INTEGER,       -- customer | supplier
  amount INTEGER, mode TEXT, ts TEXT, note TEXT
);
```

---

## 5. Core flows

**Billing (the hot path — optimize this)**
1. Cursor lands in search box on new bill. Scan/type part_no or name.
2. Enter adds top match as a line; qty defaults 1, editable.
3. Toggle retail/garage price (per bill or per customer type).
4. Apply line/bill discount. Tax auto-computed per line gst_rate.
5. Choose payment mode (cash/upi/credit). Credit requires a customer + checks credit_limit.
6. Finalize → insert invoice + items + stock_ledger `out` rows + update product stock, all in ONE transaction. Print. Invoice becomes immutable.

**Stock-in (purchase)**
1. Select/create supplier, enter their invoice no + date.
2. Add lines (existing product or create new on the fly). Set cost + qty. This is how the catalog grows.
3. Save → purchase + items + stock_ledger `in` rows + stock update, one transaction. Update supplier payable if on credit.

**Find-by-model (P2)**
1. Pick brand → model. Query `part_fitment` → products in stock for that model.
2. Show name, part_no, price, **rack location**, and alternates. New staffer walks to the rack.

---

## 6. GST tax-invoice field checklist (P1 billing must emit)

- Your shop name, address, **GSTIN**
- Invoice number (sequential series) + date
- Buyer name / GSTIN (for B2B / garage credit)
- Per line: description, **HSN**, qty, rate, taxable value
- **CGST + SGST** split (9% + 9% for intra-state at 18%), shown separately
- Total taxable value, total tax, grand total
- (Parts are a uniform 18% since 22 Sep 2025 — keep gst_rate configurable anyway.)

---

## 7. Hardware plan (deferred, abstraction now)

- **Barcode scanner**: none needed to start — it's a keyboard. Just make sure the search box has focus and handles a fast "type + Enter" burst as one scan. When you buy one, it works instantly.
- **Thermal printer**: wrap printing in a `printInvoice(invoice)` function with one implementation now (HTML/PDF → system print, A5). Add an ESC/POS implementation later; billing code never changes.

---

## 8. Suggested build order (evenings)

1. Electron + Vite + React + Tailwind shell boots; Express + SQLite live in main process; one test query renders.
2. Products CRUD + list/search. Seed a few real Honda/Hero/TVS parts by hand.
3. Billing screen: add lines, tax, totals, finalize transaction, stock_ledger + decrement. **This is the milestone that makes it a real tool.**
4. Print (HTML/PDF invoice) + GST fields.
5. Purchase / stock-in (catalog grows here).
6. Reports (daily sales, stock value, fast/slow movers) + **automatic backup**.
7. → P1 done. Start billing for real. Then P2: find-by-model, garage receivables, roles, audit.

---

## 9. Open decision (the only blocker-ish item)

**Day-one catalog data source.** Spec assumes default (a). Pick one:
- **(a) Grow from your own purchases** — enter parts as stock arrives. Slow, but clean, legal, and always matches reality. *Recommended to start.*
- **(b) Import a distributor price-list export** (CSV) to seed the product master, then correct. Faster catalog, needs a distributor willing to share.
- **(c) Hybrid** — seed fast-movers from (b), fill the rest via (a).

The schema supports all three (`products` + a CSV import). Decide when you get a distributor; don't block coding on it.

---

## 10. Risks to keep in view

- Scope creep into the "encyclopedia" — resist; it's P3 for a reason.
- Learning-first with no deadline → finish P1 and *use it* before polishing.
- Backup discipline — untested backups aren't backups. Verify a restore once.
- Money as float — don't. Integer paise.
- Stock drift — never bypass the ledger.
