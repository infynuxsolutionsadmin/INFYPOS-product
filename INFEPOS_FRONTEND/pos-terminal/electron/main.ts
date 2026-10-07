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
        barcode TEXT,
        categoryId TEXT,
        stockQuantity REAL DEFAULT 0
      );
    `);
    db!.run(`ALTER TABLE products ADD COLUMN stockQuantity REAL DEFAULT 0`, () => {});
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
    db!.run(`
      CREATE TABLE IF NOT EXISTS cashiers (
        id TEXT PRIMARY KEY,
        firstName TEXT NOT NULL,
        lastName TEXT,
        pinCodeHash TEXT
      );
    `);
    
    // Migration: Add barcode column if it doesn't exist
    db!.all("PRAGMA table_info(products)", (err, columns) => {
      if (!err && columns && !columns.some((c: any) => c.name === 'barcode')) {
        db!.run("ALTER TABLE products ADD COLUMN barcode TEXT", (err) => {
          if (!err) console.log("Added barcode column to products table");
        });
      }
    });
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
      try {
        stmt = db.prepare(sql, (err) => {
          if (err) {
            // Remove from cache if prepare failed
            statementCache.delete(sql);
            return reject(err);
          }
        });
        // Cache the compiled binary statement
        statementCache.set(sql, stmt);
      } catch (err) {
        return reject(err);
      }
    }
    
    // Wait for the next tick to ensure prepare callback is executed if it was just created
    process.nextTick(() => {
      // If stmt was deleted from cache, it means prepare failed
      if (!statementCache.has(sql)) return;
      
      if (sql.trim().toLowerCase().startsWith('select') || sql.trim().toLowerCase().startsWith('pragma')) {
        stmt!.all(params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        stmt!.run(params, function (err) {
          if (err) reject(err);
          else resolve({ changes: this.changes, lastInsertRowid: this.lastID });
        });
      }
    });
  });
});
