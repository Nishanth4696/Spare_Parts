const { app, BrowserWindow } = require('electron');
const path = require('path');
const { createServer } = require('./server');
const { runBackupSync, maybeRunDailyBackup } = require('./db/backup');

const API_PORT = 4317;
const isDev = process.env.NODE_ENV === 'development';

app.setName('spare-parts-pos');

let mainWindow;
let httpServer;

function startApiServer() {
  const app = createServer();
  httpServer = app.listen(API_PORT, '127.0.0.1', () => {
    console.log(`API server listening on http://127.0.0.1:${API_PORT}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  startApiServer();
  maybeRunDailyBackup();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  try {
    runBackupSync('on-close');
  } catch (err) {
    console.error('Backup on close failed:', err);
  }
  if (httpServer) httpServer.close();
  if (process.platform !== 'darwin') app.quit();
});
