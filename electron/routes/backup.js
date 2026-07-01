const express = require('express');
const { runBackupSync, listBackups } = require('../db/backup');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(listBackups());
});

router.post('/run', (req, res) => {
  try {
    const dest = runBackupSync('manual');
    res.status(201).json({ path: dest });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
