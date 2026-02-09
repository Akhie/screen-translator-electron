const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  hello: () => ipcRenderer.invoke("hello"),
  captureArea: (coords) => ipcRenderer.invoke("capture-area", coords),
  translate: (text) => ipcRenderer.invoke("translate-text", text)
});
