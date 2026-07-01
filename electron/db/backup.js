const path = require('path');
const fs = require('fs');
const { db, dataDir, dbPath } = require('./index');

const backupDir = path.join(dataDir, 'backups');
const KEEP_LAST_N = 30;

function runBackup(reason = 'manual') {
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(backupDir, `spareparts-${stamp}-${reason}.sqlite`);
  // db.backup() is a safe online copy, unlike a raw fs.copyFile on a live WAL db.
  db.backup(dest)
    .then(() => pruneOldBackups())
    .catch((err) => console.error('Backup failed:', err));
  return dest;
}

function runBackupSync(reason = 'manual') {
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(backupDir, `spareparts-${stamp}-${reason}.sqlite`);
  db.backup(dest);
  pruneOldBackups();
  return dest;
}

function pruneOldBackups() {
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith('.sqlite'))
    .map((f) => ({ f, t: fs.statSync(path.join(backupDir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const { f } of files.slice(KEEP_LAST_N)) {
    fs.unlinkSync(path.join(backupDir, f));
  }
}

function listBackups() {
  fs.mkdirSync(backupDir, { recursive: true });
  return fs
    .readdirSync(backupDir)
    .filter((f) => f.endsWith('.sqlite'))
    .map((f) => {
      const stat = fs.statSync(path.join(backupDir, f));
      return { name: f, size: stat.size, mtime: stat.mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function maybeRunDailyBackup() {
  const backups = listBackups();
  const latest = backups[0];
  const oneDayMs = 24 * 60 * 60 * 1000;
  if (!latest || Date.now() - new Date(latest.mtime).getTime() > oneDayMs) {
    runBackup('daily');
  }
}

module.exports = { runBackup, runBackupSync, listBackups, maybeRunDailyBackup, backupDir };
