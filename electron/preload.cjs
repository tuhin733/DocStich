const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopAPI", {
  savePdf: (bytes, filename) =>
    ipcRenderer.invoke("dialog:save-pdf", bytes, filename),
  isMaximized: () => ipcRenderer.invoke("window:is-maximized"),
  minimize: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximize: () => ipcRenderer.invoke("window:toggle-maximize"),
  close: () => ipcRenderer.invoke("window:close"),
  checkUpdates: () => ipcRenderer.invoke("app:check-updates"),
  openRepository: () => ipcRenderer.invoke("app:open-repository"),
  onMaximizeChange: (callback) => {
    const listener = (_event, isMaximized) => callback(isMaximized);
    ipcRenderer.on("window:maximize-state", listener);
    return () => ipcRenderer.removeListener("window:maximize-state", listener);
  },
});
