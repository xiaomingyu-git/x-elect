const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('ping'),
  setBaseUrl: (url) => ipcRenderer.invoke('api:set-base-url', url),
  getBaseUrl: () => ipcRenderer.invoke('api:get-base-url'),
  setAuthToken: (token) => ipcRenderer.invoke('api:set-auth-token', token),
  request: (options) => ipcRenderer.invoke('api:request', options),
  storeGet: (key) => ipcRenderer.invoke('store:get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store:set', key, value),
  storeMerge: (key, value) => ipcRenderer.invoke('store:merge', key, value)
});
