const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const devServerUrl = "http://127.0.0.1:5173";
let mainWindow;

function isTrustedSender(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents) return false;
  const senderUrl = event.senderFrame?.url;
  return app.isPackaged
    ? senderUrl === pathToFileURL(path.join(__dirname, "../dist/index.html")).href
    : senderUrl === devServerUrl || senderUrl?.startsWith(`${devServerUrl}/`);
}

ipcMain.handle("dialog:save-pdf", async (event, bytes, filename) => {
  if (!isTrustedSender(event)) throw new Error("Untrusted PDF save request");
  if (!(bytes instanceof Uint8Array)) throw new TypeError("PDF data must be bytes");
  if (typeof filename !== "string" || !/\.pdf$/i.test(filename)) {
    throw new TypeError("A PDF filename is required");
  }

  const safeFilename = path.basename(filename);
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Save PDF",
    defaultPath: safeFilename,
    filters: [{ name: "PDF files", extensions: ["pdf"] }],
  });
  if (canceled || !filePath) return { canceled: true };

  await fs.writeFile(filePath, Buffer.from(bytes));
  return { canceled: false };
});

ipcMain.handle("window:is-maximized", (event) => {
  if (!isTrustedSender(event)) throw new Error("Untrusted window state request");
  return mainWindow.isMaximized();
});

ipcMain.handle("window:minimize", (event) => {
  if (!isTrustedSender(event)) throw new Error("Untrusted minimize request");
  mainWindow.minimize();
});

ipcMain.handle("window:toggle-maximize", (event) => {
  if (!isTrustedSender(event)) throw new Error("Untrusted maximize request");
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});

ipcMain.handle("window:close", (event) => {
  if (!isTrustedSender(event)) throw new Error("Untrusted close request");
  mainWindow.close();
});

ipcMain.handle("app:check-updates", async (event) => {
  if (!isTrustedSender(event)) throw new Error("Untrusted update check request");

  const response = await fetch(
    "https://api.github.com/repos/tuhin733/DocStich/releases/latest",
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "DocStitch",
      },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!response.ok) {
    throw new Error(`GitHub release check failed (${response.status})`);
  }

  const release = await response.json();
  if (
    typeof release.tag_name !== "string" ||
    !/^v?\d+\.\d+\.\d+$/.test(release.tag_name) ||
    typeof release.published_at !== "string" ||
    Number.isNaN(Date.parse(release.published_at))
  ) {
    throw new Error("The latest GitHub release has invalid metadata");
  }

  return {
    tag: release.tag_name,
    publishedAt: release.published_at,
  };
});

ipcMain.handle("app:open-repository", (event) => {
  if (!isTrustedSender(event)) throw new Error("Untrusted repository open request");
  return shell.openExternal("https://github.com/tuhin733/DocStich");
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 640,
    frame: false,
    icon: path.join(__dirname, "../build/icon.ico"),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const notifyMaximizeState = () => {
    mainWindow.webContents.send("window:maximize-state", mainWindow.isMaximized());
  };
  mainWindow.on("maximize", notifyMaximizeState);
  mainWindow.on("unmaximize", notifyMaximizeState);

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowedUrl = app.isPackaged
      ? pathToFileURL(path.join(__dirname, "../dist/index.html")).href
      : devServerUrl;
    if (url !== allowedUrl) event.preventDefault();
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    mainWindow.loadURL(devServerUrl);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  if (process.platform !== "win32") {
    dialog.showErrorBox(
      "Unsupported platform",
      "DocStitch is only supported on Windows.",
    );
    app.quit();
    return;
  }

  Menu.setApplicationMenu(null);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
