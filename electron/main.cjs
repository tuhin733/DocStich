const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const { execFile } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { promisify } = require("node:util");

const devServerUrl = "http://127.0.0.1:5173";
let mainWindow;
const execFileAsync = promisify(execFile);

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

function sendUpdateProgress(percent) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("app:update-progress", percent);
  }
}

autoUpdater.on("download-progress", (progress) => {
  sendUpdateProgress(progress.percent);
});

autoUpdater.on("error", (error) => {
  console.error("Unable to download or install update", error);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(
      "app:update-error",
      "The update could not be installed.",
    );
  }
});

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

ipcMain.handle("scanner:scan-document", async (event) => {
  if (!isTrustedSender(event)) throw new Error("Untrusted scanner request");

  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "docstitch-scan-"));
  const outputPath = path.join(tempDirectory, "scan.jpg");
  const scriptPath = path.join(__dirname, "scan-document.ps1");

  try {
    try {
      await execFileAsync(
        "powershell.exe",
        [
          "-NoProfile",
          "-STA",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          scriptPath,
          outputPath,
        ],
        {
          windowsHide: false,
          timeout: 180_000,
          encoding: "utf8",
        },
      );
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === 2) {
        return { canceled: true };
      }
      if (error && typeof error === "object" && "killed" in error && error.killed) {
        throw new Error(
          "The scanner did not respond within 3 minutes. Check that it is powered on and connected, close any other scanning apps, then try again.",
        );
      }
      const details =
        error && typeof error === "object"
          ? `${"message" in error ? error.message : ""}\n${"stderr" in error ? error.stderr : ""}`
          : "";
      if (/No WIA device of the selected type is available/i.test(details)) {
        throw new Error(
          "Windows could not find a WIA-compatible scanner. Connect and power on the scanner, install its WIA driver, and confirm it can scan in Windows Scan or Windows Fax and Scan.",
        );
      }
      throw error;
    }

    const image = await fs.readFile(outputPath);
    if (image.length === 0) throw new Error("The scanner returned an empty image");

    return {
      canceled: false,
      bytes: new Uint8Array(image),
      fileName: `scan-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`,
    };
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
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

ipcMain.handle("app:download-update", async (event, tag) => {
  if (!isTrustedSender(event)) throw new Error("Untrusted update download request");
  if (!app.isPackaged) {
    throw new Error("In-app updates are only available in an installed build");
  }
  if (typeof tag !== "string" || !/^v?\d+\.\d+\.\d+$/.test(tag)) {
    throw new TypeError("Invalid update version");
  }

  const result = await autoUpdater.checkForUpdates();
  if (
    !result ||
    result.updateInfo.version !== tag.replace(/^v/, "")
  ) {
    throw new Error("The available release changed. Restart the app to check again.");
  }

  sendUpdateProgress(0);
  await autoUpdater.downloadUpdate();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("app:update-installing");
  }
  setTimeout(() => autoUpdater.quitAndInstall(false, true), 0);
  return { installing: true };
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
