const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run(`CREATE TABLE sync_queue (id TEXT, type TEXT, payload TEXT, status TEXT)`);
});

const statementCache = new Map();

function executeQuery(sql, ...params) {
  return new Promise((resolve, reject) => {
    let stmt = statementCache.get(sql);
    
    if (!stmt) {
      stmt = db.prepare(sql, (err) => {
        if (err) return reject(err);
      });
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
}

async function test() {
  try {
    console.log(await executeQuery(`INSERT INTO sync_queue (id, type, payload, status) VALUES (?, ?, ?, 'PENDING')`, '1', 'SALE', '{}'));
    console.log(await executeQuery(`INSERT INTO sync_queue (id, type, payload, status) VALUES (?, ?, ?, 'PENDING')`, '2', 'SALE', '{}'));
    console.log(await executeQuery(`SELECT * FROM sync_queue`));
  } catch(e) {
    console.error('Error:', e);
  }
}

test();
