const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

function getDataDir() {
  let baseDir;
  try {
    // Only available inside Electron's main process.
    const { app } = require('electron');
    baseDir = app.getPath('userData');
  } catch {
    baseDir = path.join(__dirname, '..', '..', 'data');
  }
  fs.mkdirSync(baseDir, { recursive: true });
  return baseDir;
}

const dataDir = getDataDir();
const dbPath = path.join(dataDir, 'spareparts.sqlite');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

const defaultSettings = {
  shop_name: 'My Spare Parts Shop',
  shop_address: '',
  shop_gstin: '',
  shop_phone: '',
  invoice_prefix: 'INV',
  next_invoice_seq: '1',
};
const insertSetting = db.prepare(
  'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
);
const seedSettings = db.transaction(() => {
  for (const [k, v] of Object.entries(defaultSettings)) {
    insertSetting.run(k, v);
  }
});
seedSettings();

module.exports = { db, dataDir, dbPath };
