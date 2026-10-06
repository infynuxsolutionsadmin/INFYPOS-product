const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'pos-terminal', 'pos-offline.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
});

db.all('SELECT id, name, sku, barcode FROM products', (err, rows) => {
  console.log('Products:', rows);
  db.close();
});
