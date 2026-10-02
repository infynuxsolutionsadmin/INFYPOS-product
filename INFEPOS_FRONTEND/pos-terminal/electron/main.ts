import './polyfill';
import { app, BrowserWindow, ipcMain } from 'electron';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sqlite3 = require('sqlite3').verbose();

const currentDir = dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let db: sqlite3.Database | null = null;

function initDb() {
  const dbPath = path.join(app.getPath('userData'), 'pos-offline.sqlite');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Database open error:', err);
    else console.log('SQLite database opened at', dbPath);
  });

  // Create tables for offline data
  db.serialize(() => {
    db!.run(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        vatRate REAL NOT NULL,
        sku TEXT,
        categoryId TEXT
      );
    `);
    db!.run(`
      CREATE TABLE IF NOT EXISTS inventory (
        productId TEXT PRIMARY KEY,
        quantity INTEGER NOT NULL
      );
    `);
    db!.run(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(currentDir, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(currentDir, '../dist/index.html'));
  }
  
  // Force devtools open to debug blank screen
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  initDb();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Statement Cache for Optimization
const statementCache = new Map<string, sqlite3.Statement>();

ipcMain.handle('db:query', (event, sql, ...params) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('DB not initialized'));
    
    // Attempt to retrieve pre-compiled statement from cache
    let stmt = statementCache.get(sql);
    
    if (!stmt) {
      stmt = db.prepare(sql, (err) => {
        if (err) return reject(err);
      });
      // Cache the compiled binary statement to eliminate future parsing overhead
      statementCache.set(sql, stmt);
    }
    
    if (sql.trim().toLowerCase().startsWith('select')) {
      stmt.all(params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    } else {
      stmt.run(params, function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes, lastInsertRowid: this.lastID });
      });
    }
  });
});
