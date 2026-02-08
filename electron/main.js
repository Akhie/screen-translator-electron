const { app, BrowserWindow, ipcMain, screen, globalShortcut, desktopCapturer  } = require("electron");
const path = require("path");

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
     frame: false,
     transparent: true,
     alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.maximize();
  console.log(__dirname);
  //win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  win.loadURL("http://localhost:5173");
  // Open DevTools (for renderer logs)
   win.webContents.openDevTools();
}

ipcMain.handle("hello", () => {
  return "Hello from Electron 👋";
});

ipcMain.handle("capture-area", async (event, { x, y, width, height }) => {
  // 1️⃣ Get the primary display
  const primaryDisplay = screen.getPrimaryDisplay();

  // 2️⃣ Get the screen sources
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: primaryDisplay.size.width, height: primaryDisplay.size.height }
  });

  // 3️⃣ Pick the first screen (main display)
  const screenSource = sources[0];

  // 4️⃣ Crop the area
  const image = screenSource.thumbnail.crop({ x, y, width, height });

  // 5️⃣ Return PNG bytes to renderer
  return image.toPNG(); // Uint8Array / Buffer
});

app.whenReady().then(() => {
  createWindow();

  // Register a global shortcut, e.g., Ctrl+Shift+S
  globalShortcut.register("Control+Shift+S", () => {
    if (win.isVisible()) {
      win.hide(); // hide if already visible
    } else {
      win.show(); // show if hidden
      win.focus(); // bring to front
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
