const { app, BrowserWindow, ipcMain, screen, globalShortcut, desktopCapturer } = require("electron");
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
  win.loadURL("http://localhost:8080");
  // Open DevTools (for renderer logs)
//  win.webContents.openDevTools();
}

ipcMain.handle("hello", () => {
  return "Hello from Electron 👋";
});

ipcMain.handle("translate-text", async (event, text) => {

  var settings = {
  url: "https://nsds-api.fabrix-s.samsungsds.com/sds/trial/api-chat/openapi/chat/v1/messages",
  method: "POST",
  timeout: 0,
  headers: {
    "Content-Type": "application/json",
    "x-fabrix-client": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjbGllbnRJZCI6IjIyM2M3MGFkLWQwNTctNGQ4MC1iM2U4LTNlMzc3MDdkMWQwYy0xMDI5IiwiY2xpZW50U2VjcmV0IjoiUG1BUW92clI2NkJ3MThhODFSZDVMck9XZXRQbWxkbjciLCJleHAiOjE3NzI3MjI3OTl9.NCQHQWIhiw9azlz4JNGZgsW9llJYEDL3GgyIdxkDdXU",
    "x-openapi-token": "Bearer eyJ4NXQiOiJNV0l5TkRJNVlqRTJaV1kxT0RNd01XSTNOR1ptTVRZeU5UTTJOVFZoWlRnMU5UTTNaVE5oTldKbVpERTFPVEE0TldFMVlUaGxNak5sTldFellqSXlZUSIsImtpZCI6Ik1XSXlOREk1WWpFMlpXWTFPRE13TVdJM05HWm1NVFl5TlRNMk5UVmhaVGcxTlRNM1pUTmhOV0ptWkRFMU9UQTROV0UxWVRobE1qTmxOV0V6WWpJeVlRX1JTMjU2IiwidHlwIjoiYXQrand0IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiI4NzdhNmMzNS04ZWU5LTQ1MGItODc1MS00N2MzMDUxMzQ5OTUiLCJhdXQiOiJBUFBMSUNBVElPTiIsImF1ZCI6IllVXzZkNGN1Wl9TSVRCc21FT1dGakJkMUZfb2EiLCJuYmYiOjE3NzAzNzcwMTMsImF6cCI6IllVXzZkNGN1Wl9TSVRCc21FT1dGakJkMUZfb2EiLCJzY29wZSI6ImRlZmF1bHQiLCJpc3MiOiJodHRwczpcL1wvbnNkcy13c28yLmZhYnJpeC1zLnNhbXN1bmdzZHMuY29tOjQ0M1wvb2F1dGgyXC90b2tlbiIsImV4cCI6NDkyNjEzNzAxMywiaWF0IjoxNzcwMzc3MDEzLCJqdGkiOiI3YzMyM2ExNi0wZDVjLTQ2OWUtOGM5My0yYjgwZTcxY2YyMjEiLCJjbGllbnRfaWQiOiJZVV82ZDRjdVpfU0lUQnNtRU9XRmpCZDFGX29hIn0.XZy-tWJtMPC1kvWkKYdOJvW4uSYUYTwEGON-Fk4X8eyufIMCoyHgGXU04zQfDt0uddRYJcD4CP1PTUb4pq5pIy9ptqc9mUGZMW8z1HHR8wAN-EZsQ2i23Qtvlu5zMOJ1cY-LQO02kF0sedrBRpYWT-R9V6Zq1b7Nt-zpj7jirf9ChFznk6cLHqyVw9x5EFJrL3lqc-3yFmAeC5lySVkjfUn959w5OBw6uzj7tC9SmWgtxmba5MkqSd-qBj9Fec7ocYXuJz4u8IcXtSgpBCmj8s6S2sRTnopwulOn8VZNhmyX6APhILLc16plwjlSJKVcrbviuYMFavYrHYL0CsSRUA",
    "x-generative-ai-user-email": "davinder.s1@samsung.com",
    "Cookie": "INGRESSCOOKIE=1770376705.393.78081.487324|b8d5e0e3856125cb64402f2f701e65a0"
  },
  data: JSON.stringify({
    "modelIds": [
      "01995a66-a919-7b3d-a589-e200de57555a"
    ],
    "contents": [
      "I am testing"
    ],
    "isStream": false,
    "llmConfig": {},
    "systemPrompt": "Translate the content from english to Korean",
    "files": [],
    "messageConfig": {}
  }),
};
  // translation api call and then return back the translated text
  const url = "https://translation.googleapis.com/language/translate/v2?key=AIzaSyAF_X2CDKkk666sDyQOWtT1prycpWoijUU";

    const data = {
      q: text,
      target: "en",
      source: "ko"
    };
    // ✅ Return the promise chain
    return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log("Response:", response);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json(); // returns JSON
    })
    .then(result => {
        console.log("Final result:", result);
        return result; // this goes back to ipcRenderer.invoke
    })
    .catch(error => {
        console.error("Error:", error);
        return { error: error.message }; // fallback object
    });
});

ipcMain.handle("capture-area", async (event, { x, y, width, height }) => {
  // 1️⃣ Get the primary display
  const primaryDisplay = screen.getPrimaryDisplay();

  // 2️⃣ Get the screen sources
  const sources = await desktopCapturer.getSources({
    types: ["window"],
    thumbnailSize: { width: primaryDisplay.size.width, height: primaryDisplay.size.height }
  });

  // 3️⃣ Pick the behind screen (main display)
  const screenSource = sources[1];

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
      win.webContents.send('stop-monitoring-request');
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
