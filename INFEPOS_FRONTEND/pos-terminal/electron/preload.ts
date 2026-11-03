import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  db: {
    query: (sql: string, ...params: any[]) => ipcRenderer.invoke('db:query', sql, ...params),
  },
  printer: {
    getPrinters: () => ipcRenderer.invoke('printer:get-printers'),
    printHtml: (html: string, options?: { printerName?: string; silent?: boolean }) =>
      ipcRenderer.invoke('printer:print-html', html, options),
  },
  updater: {
    getVersion: () => ipcRenderer.invoke('updater:get-version'),
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    installUpdate: () => ipcRenderer.invoke('updater:install'),
    onUpdateAvailable: (callback: (info: any) => void) => {
      const sub = (_: any, data: any) => callback(data);
      ipcRenderer.on('updater:update-available', sub);
      return () => {
        ipcRenderer.removeListener('updater:update-available', sub);
      };
    },
    onUpdateDownloaded: (callback: (info: any) => void) => {
      const sub = (_: any, data: any) => callback(data);
      ipcRenderer.on('updater:update-downloaded', sub);
      return () => {
        ipcRenderer.removeListener('updater:update-downloaded', sub);
      };
    },
  },
});
