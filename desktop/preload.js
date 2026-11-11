// Pont minimal entre l'application et le site : deux abonnements en lecture, rien d'autre.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('live', {
  onData: cb => ipcRenderer.on('live:data', (_e, data) => cb(data)),
  onStatus: cb => ipcRenderer.on('live:status', (_e, status) => cb(status))
});
