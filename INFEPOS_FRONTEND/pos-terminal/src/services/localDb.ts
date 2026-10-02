// This file handles communication with the local SQLite database via Electron IPC

declare global {
  interface Window {
    electron?: {
      db: {
        query: (sql: string, ...params: any[]) => Promise<any>;
      };
    };
  }
}

export const isDesktopApp = () => typeof window !== 'undefined' && !!window.electron;

export const queryLocalDb = async (sql: string, ...params: any[]) => {
  if (!isDesktopApp()) {
    throw new Error('Local database is only available in the desktop app.');
  }
  return window.electron!.db.query(sql, ...params);
};

export const queueSyncEvent = async (type: string, payload: any) => {
  if (!isDesktopApp()) return false;
  
  const id = crypto.randomUUID();
  const payloadStr = JSON.stringify(payload);
  
  await queryLocalDb(
    `INSERT INTO sync_queue (id, type, payload, status) VALUES (?, ?, ?, 'PENDING')`,
    id, type, payloadStr
  );
  
  return id;
};

export const getPendingSyncEvents = async () => {
  if (!isDesktopApp()) return [];
  return queryLocalDb(`SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY createdAt ASC`);
};

export const markSyncEventCompleted = async (id: string) => {
  if (!isDesktopApp()) return;
  return queryLocalDb(`UPDATE sync_queue SET status = 'COMPLETED' WHERE id = ?`, id);
};

export const syncProductsToLocalDb = async (products: any[]) => {
  if (!isDesktopApp()) return;
  
  // Basic sync: just insert or replace products in the local DB
  for (const p of products) {
    await queryLocalDb(
      `INSERT OR REPLACE INTO products (id, name, price, vatRate, sku, categoryId) VALUES (?, ?, ?, ?, ?, ?)`,
      p.id, p.name, p.sellingPrice || 0, p.vatRate || 20, p.sku || '', p.category?.name || p.categoryId || ''
    );
  }
};
