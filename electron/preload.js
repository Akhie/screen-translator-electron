const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  hello: () => ipcRenderer.invoke("hello"),
  captureArea: (coords) => ipcRenderer.invoke("capture-area", coords)
});
