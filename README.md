# Spare Parts POS

Offline, single-PC point-of-sale + inventory app for a 3-brand-deep two-wheeler
spare parts shop (Honda, Hero, TVS). See [parts-pos-build-spec.md](parts-pos-build-spec.md)
for the full design spec this implements (Phase 1 / MVP).

Stack: React + Vite + Tailwind + Electron, Redux Toolkit (RTK Query for all
server state, a `cart` slice for the billing screen), Express (embedded in
the Electron main process), SQLite (`better-sqlite3`).

## Setup

```bash
npm install     # also rebuilds better-sqlite3 for Electron's ABI (postinstall)
npm run seed    # loads 6 sample Honda/Hero/TVS parts so the UI isn't empty
```

## Run (development)

```bash
npm run dev     # starts Vite dev server + Electron together
```

## Build a production bundle

```bash
npm run build   # bundles the frontend into dist/
npm start       # runs Electron against the production build
```

## What's implemented (Phase 1)

- Product master CRUD (add/edit/remove) with search by part no / name / brand,
  a brand filter, a rack filter, click-to-sort table columns, barcode lookup,
  and a photo per product — upload from the edit form any time; products
  without a photo show a category-coded placeholder icon instead of a broken
  image.
- Billing screen: scan/search → add line → retail/garage price toggle → per-line
  and bill-level discount → auto CGST+SGST → finalize (F9) → immutable invoice
  → A5 print view. Two-column layout (cart + a persistent summary sidebar)
  so totals/payment/customer are always visible without scrolling. Flags a
  line in red if the requested qty exceeds current stock and blocks finalize
  until it's fixed. Cash payments get an "amount received" field with
  change-due calculated live. "Clear bill" resets everything without
  finalizing.
- Customers are captured straight from the billing screen (name + phone) and
  saved to the DB automatically — typing a phone that's already on file
  reuses that customer instead of creating a duplicate. A dedicated
  Customers page lists/edits everyone captured this way, plus balances owed.
- Stock only ever changes through `stock_ledger` (sale, purchase, manual
  adjustment) — never a bare `UPDATE products SET stock=`.
- Purchase / stock-in flow that grows the catalog and updates supplier payables.
- Reports is a full analytics dashboard, not just a daily snapshot: pick a
  date range (Today / 7 days / 30 days / This month / custom), and every
  section reacts — KPI cards (revenue, invoices, avg bill, GST, discount,
  gross profit) each show % change vs. the equivalent *previous* period;
  charts for sales trend, payment-mode split, revenue by brand, and revenue
  by category; ranked tables for top products and top customers by revenue;
  an **Accounts** section surfacing total receivables/payables and who owes
  the most (using the `customers.balance`/`suppliers.balance` columns that
  existed but weren't shown anywhere before); stock value, low-stock, a new
  **dead-stock** list (capital tied up in parts that haven't sold in 90
  days), and fast/slow movers. Charts via `recharts`. "Export as PDF" opens
  a clean tabular version of the same range and triggers the browser print
  dialog — "Save as PDF" (a built-in Chromium/Electron print destination)
  produces the file, the same proven pattern as invoice printing, no extra
  PDF library needed.
- Automatic backup: on every app close, plus once daily on startup, keeping
  the last 30 snapshots in the Electron `userData` folder. The sidebar shows
  how long ago the last backup ran (amber past 20h, red past 36h) and today's
  running sales total, and flags a low-stock count badge on the Reports link.
- Toast notifications confirm saves/deletes/backups consistently across
  Products, Customers, Purchases, Settings, and Reports.
- Keyboard-first: F1–F6 switch pages, Enter adds a search hit to the cart,
  arrow keys move the highlight, F9 finalizes a bill.

Phase 2 (find-by-bike-model, part fitment/substitutes, user roles, audit log
view) and Phase 3 are not yet built — the schema already has the tables
(`bike_models`, `part_fitment`, `part_alt`, `users`) to support them without
a migration. A few other gaps worth knowing about, since the groundwork
already exists in the schema but nothing uses it yet:

- **No way to record a payment** against a customer's or supplier's running
  balance — the `payments` table exists but has no route/UI.
- **No stock ledger view** — every stock change is correctly recorded in
  `stock_ledger`, but there's no screen to see it.
- **No return/credit-note path** to correct a finalized (immutable) invoice.
- **No per-customer/per-supplier transaction history** view (balance is
  visible, the invoices/purchases behind it aren't).
- **No login/PIN/roles** — `users.pin_hash` exists but is unused, so anyone
  at the PC can see cost prices, delete products, etc.

## State management

All server data (products, customers, suppliers, invoices, purchases,
reports, settings, backups) goes through a single RTK Query API slice
(`src/store/apiSlice.js`) with tag-based cache invalidation — e.g. finalizing
a bill invalidates the product list (stock changed), customer list (balance/
new customer), and reports in one place, so every screen stays in sync
without manual refetch calls. The billing cart itself (`src/store/cartSlice.js`)
is the one piece of pure client state, since it's ephemeral until finalized.

## Product photos

Uploaded photos are stored as files under `<userData>/images/` (next to the
SQLite DB) and served by the embedded Express server at `/images/<file>`;
only the filename is stored in `products.image_path`. There's no bundled
stock photography — a product without a photo shows a category-tinted icon
(brake/clutch/filter/etc.) instead, so the catalog stays legible until real
photos are added counter-side.

## Data location

The SQLite file and backups live in Electron's `userData` directory (e.g.
`~/.config/spare-parts-pos/` on Linux), not inside the project folder — so a
build/reinstall never touches shop data.

## Note on the invoice sequence

`next_invoice_seq` lives in the `settings` table and is bumped inside the same
transaction as the invoice insert, so a crash mid-sale can't produce a gap-free
guarantee under concurrent writers — fine for the single-PC/single-writer
scope this app targets.
