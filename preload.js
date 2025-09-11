const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // You can expose functions to the renderer process here
});