// Runs the seed script inside a real (headless) Electron process so it
// writes to the exact same userData DB file the packaged app will use.
const { app } = require('electron');

app.setName('spare-parts-pos');

app.whenReady().then(() => {
  require('./db/seed.js');
  app.exit(0);
});
