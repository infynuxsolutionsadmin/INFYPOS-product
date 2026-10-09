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
  
  let id: string;
  try {
    id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  } catch (e) {
    id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  const payloadStr = JSON.stringify(payload);
  
  await queryLocalDb(
    `INSERT INTO sync_queue (id, type, payload, status) VALUES (?, ?, ?, 'PENDING')`,
    id, type, payloadStr
  );
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('sync-queue-updated'));
  }
  
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
  if (!isDesktopApp() || !products || products.length === 0) return;
  
  try {
    await queryLocalDb('BEGIN TRANSACTION');
    await queryLocalDb('DELETE FROM products');

    for (const p of products) {
      if (p.status === 'INACTIVE') continue;

      const stock = p.inventories?.[0]?.quantityOnHand !== undefined 
        ? parseFloat(p.inventories[0].quantityOnHand)
        : (p.stockQuantity !== undefined ? parseFloat(p.stockQuantity) : 100);

      await queryLocalDb(
        `INSERT OR REPLACE INTO products (id, name, price, vatRate, sku, barcode, categoryId, stockQuantity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p.id,
        p.name || '',
        p.sellingPrice || p.price || 0,
        p.vatRate || 20,
        p.sku || '',
        p.barcode || '',
        p.category?.name || p.category || p.categoryId || 'General',
        stock,
        p.status || 'ACTIVE'
      );
    }

    await queryLocalDb('COMMIT');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('local-catalog-updated'));
    }
  } catch (err) {
    try {
      await queryLocalDb('ROLLBACK');
    } catch {}
    console.error('Failed to sync products to local database:', err);
    throw err;
  }
};

export const decrementLocalProductStock = async (items: { productId: string; quantity: number }[]) => {
  if (!isDesktopApp() || !items || items.length === 0) return;
  try {
    await queryLocalDb('BEGIN TRANSACTION');
    for (const item of items) {
      await queryLocalDb(
        `UPDATE products SET stockQuantity = MAX(0, stockQuantity - ?) WHERE id = ?`,
        item.quantity,
        item.productId
      );
    }
    await queryLocalDb('COMMIT');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('local-catalog-updated'));
    }
  } catch (err) {
    try { await queryLocalDb('ROLLBACK'); } catch {}
  }
};

export const syncCashiersToLocalDb = async (cashiers: any[]) => {
  if (!isDesktopApp()) {
    localStorage.setItem('pos-cashiers-cache', JSON.stringify(cashiers));
    return;
  }
  
  for (const c of cashiers) {
    await queryLocalDb(
      `INSERT OR REPLACE INTO cashiers (id, firstName, lastName, pinCodeHash) VALUES (?, ?, ?, ?)`,
      c.id, c.firstName, c.lastName || '', c.pinCodeHash || ''
    );
  }
};

export const getLocalCashiers = async (): Promise<any[]> => {
  if (!isDesktopApp()) {
    try {
      return JSON.parse(localStorage.getItem('pos-cashiers-cache') || '[]');
    } catch {
      return [];
    }
  }
  return queryLocalDb(`SELECT * FROM cashiers`);
};
