const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  hello: () => ipcRenderer.invoke("hello"),
  captureArea: (coords) => ipcRenderer.invoke("capture-area", coords),
  translate: (text) => ipcRenderer.invoke("translate-text", text),
  on: (channel, callback) => ipcRenderer.on(channel, callback),
  send: (channel, data) => ipcRenderer.send(channel, data),
  setIgnoreMouse: (ignore) => ipcRenderer.send("set-ignore-mouse", ignore),
});
