import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  db: {
    query: (sql: string, ...params: any[]) => ipcRenderer.invoke('db:query', sql, ...params),
  },
});
