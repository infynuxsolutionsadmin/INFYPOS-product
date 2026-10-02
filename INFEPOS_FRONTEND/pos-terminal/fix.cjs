const sqlite3 = require('sqlite3'); 
const db = new sqlite3.Database(process.env.APPDATA + '/pos-terminal/pos-offline.sqlite'); 
db.run("UPDATE sync_queue SET type = 'SALE' WHERE type = 'SALE_CREATED'");
