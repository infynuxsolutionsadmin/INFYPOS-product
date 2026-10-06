const { PrismaClient } = require('../../backend/node_modules/@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

const prisma = new PrismaClient();
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'pos-terminal', 'pos-offline.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error(err);
});

prisma.product.findMany().then(products => {
  db.serialize(() => {
    products.forEach(p => {
      db.run(
        `INSERT OR REPLACE INTO products (id, name, price, vatRate, sku, barcode, categoryId) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.name, p.sellingPrice || 0, p.vatRate || 20, p.sku || '', p.barcode || '', p.categoryId || '']
      );
    });
    console.log('Inserted', products.length, 'products into SQLite');
  });
}).finally(() => {
  prisma.$disconnect();
  db.close();
});
