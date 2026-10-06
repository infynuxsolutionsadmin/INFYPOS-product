const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const fs = require('fs');

const paths = [
  path.join(os.homedir(), 'AppData', 'Roaming', 'pos-terminal', 'pos-offline.sqlite'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'Electron', 'pos-offline.sqlite'),
];

let dbPath = paths.find(p => fs.existsSync(p));

if (!dbPath) {
  console.error('Could not find pos-offline.sqlite in known locations.');
  process.exit(1);
}

console.log('Using DB:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening DB:', err);
    process.exit(1);
  }
  db.run(`DELETE FROM sync_queue WHERE status = 'PENDING' OR status = 'FAILED'`, function(err) {
    if (err) console.error(err);
    else console.log(`Cleared ${this.changes} stuck sync events.`);
    db.close();
  });
});
