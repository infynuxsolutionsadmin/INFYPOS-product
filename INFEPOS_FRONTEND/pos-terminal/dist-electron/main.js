import { fileURLToPath as e } from "url";
import t, { dirname as n } from "path";
import { BrowserWindow as r, app as i, ipcMain as a } from "electron";
import { createRequire as o } from "module";
//#region electron/polyfill.ts
var s = n(e(import.meta.url));
Object.assign(globalThis, {
	__filename: e(import.meta.url),
	__dirname: s
});
//#endregion
//#region electron/main.ts
var c = o(import.meta.url)("sqlite3").verbose(), l = n(e(import.meta.url)), u = process.env.NODE_ENV === "development", d = null, f = null;
function p() {
	let e = t.join(i.getPath("userData"), "pos-offline.sqlite");
	f = new c.Database(e, (t) => {
		t ? console.error("Database open error:", t) : console.log("SQLite database opened at", e);
	}), f.serialize(() => {
		f.run("\n      CREATE TABLE IF NOT EXISTS products (\n        id TEXT PRIMARY KEY,\n        name TEXT NOT NULL,\n        price REAL NOT NULL,\n        vatRate REAL NOT NULL,\n        sku TEXT,\n        barcode TEXT,\n        categoryId TEXT,\n        stockQuantity REAL DEFAULT 0\n      );\n    "), f.run("ALTER TABLE products ADD COLUMN stockQuantity REAL DEFAULT 0", () => {}), f.run("\n      CREATE TABLE IF NOT EXISTS inventory (\n        productId TEXT PRIMARY KEY,\n        quantity INTEGER NOT NULL\n      );\n    "), f.run("\n      CREATE TABLE IF NOT EXISTS sync_queue (\n        id TEXT PRIMARY KEY,\n        type TEXT NOT NULL,\n        payload TEXT NOT NULL,\n        status TEXT DEFAULT 'PENDING',\n        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP\n      );\n    "), f.run("\n      CREATE TABLE IF NOT EXISTS cashiers (\n        id TEXT PRIMARY KEY,\n        firstName TEXT NOT NULL,\n        lastName TEXT,\n        pinCodeHash TEXT\n      );\n    "), f.all("PRAGMA table_info(products)", (e, t) => {
			!e && t && !t.some((e) => e.name === "barcode") && f.run("ALTER TABLE products ADD COLUMN barcode TEXT", (e) => {
				e || console.log("Added barcode column to products table");
			});
		});
	});
}
function m() {
	d = new r({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: t.join(l, "preload.mjs"),
			nodeIntegration: !1,
			contextIsolation: !0
		}
	}), u ? (d.loadURL(process.env.VITE_DEV_SERVER_URL || "http://localhost:5174"), d.webContents.openDevTools()) : d.loadFile(t.join(l, "../dist/index.html")), d.webContents.openDevTools();
}
i.whenReady().then(() => {
	p(), m(), i.on("activate", () => {
		r.getAllWindows().length === 0 && m();
	});
}), i.on("window-all-closed", () => {
	process.platform !== "darwin" && i.quit();
});
var h = /* @__PURE__ */ new Map();
a.handle("db:query", (e, t, ...n) => new Promise((e, r) => {
	if (!f) return r(/* @__PURE__ */ Error("DB not initialized"));
	let i = h.get(t);
	if (!i) try {
		i = f.prepare(t, (e) => {
			if (e) return h.delete(t), r(e);
		}), h.set(t, i);
	} catch (e) {
		return r(e);
	}
	process.nextTick(() => {
		h.has(t) && (t.trim().toLowerCase().startsWith("select") || t.trim().toLowerCase().startsWith("pragma") ? i.all(n, (t, n) => {
			t ? r(t) : e(n);
		}) : i.run(n, function(t) {
			t ? r(t) : e({
				changes: this.changes,
				lastInsertRowid: this.lastID
			});
		}));
	});
}));
//#endregion
export {};
