import { fileURLToPath } from "url";
import path, { dirname } from "path";
import { BrowserWindow, app, ipcMain } from "electron";
import { createRequire } from "module";
//#region electron/polyfill.ts
var currentDir$1 = dirname(fileURLToPath(import.meta.url));
Object.assign(globalThis, {
	__filename: fileURLToPath(import.meta.url),
	__dirname: currentDir$1
});
//#endregion
//#region electron/main.ts
var sqlite3 = createRequire(import.meta.url)("sqlite3").verbose();
var currentDir = dirname(fileURLToPath(import.meta.url));
var isDev = process.env.NODE_ENV === "development";
var mainWindow = null;
var db = null;
function initDb() {
	const dbPath = path.join(app.getPath("userData"), "pos-offline.sqlite");
	db = new sqlite3.Database(dbPath, (err) => {
		if (err) console.error("Database open error:", err);
		else console.log("SQLite database opened at", dbPath);
	});
	db.serialize(() => {
		db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        vatRate REAL NOT NULL,
        sku TEXT,
        categoryId TEXT
      );
    `);
		db.run(`
      CREATE TABLE IF NOT EXISTS inventory (
        productId TEXT PRIMARY KEY,
        quantity INTEGER NOT NULL
      );
    `);
		db.run(`
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
			preload: path.join(currentDir, "preload.mjs"),
			nodeIntegration: false,
			contextIsolation: true
		}
	});
	if (isDev) {
		mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || "http://localhost:5174");
		mainWindow.webContents.openDevTools();
	} else mainWindow.loadFile(path.join(currentDir, "../dist/index.html"));
	mainWindow.webContents.openDevTools();
}
app.whenReady().then(() => {
	initDb();
	createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
var statementCache = /* @__PURE__ */ new Map();
ipcMain.handle("db:query", (event, sql, ...params) => {
	return new Promise((resolve, reject) => {
		if (!db) return reject(/* @__PURE__ */ new Error("DB not initialized"));
		let stmt = statementCache.get(sql);
		if (!stmt) {
			stmt = db.prepare(sql, (err) => {
				if (err) return reject(err);
			});
			statementCache.set(sql, stmt);
		}
		if (sql.trim().toLowerCase().startsWith("select")) stmt.all(params, (err, rows) => {
			if (err) reject(err);
			else resolve(rows);
		});
		else stmt.run(params, function(err) {
			if (err) reject(err);
			else resolve({
				changes: this.changes,
				lastInsertRowid: this.lastID
			});
		});
	});
});
//#endregion
export {};
