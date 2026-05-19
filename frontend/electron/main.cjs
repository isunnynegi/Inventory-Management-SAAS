const { app, BrowserWindow, protocol, shell, utilityProcess } = require("electron");
const path  = require("path");
const fs    = require("fs");
const crypto = require("crypto");
const net   = require("net");
const http  = require("http");
const { spawn } = require("child_process");

// ── Custom protocol — must be called before app is ready ──────────────────────
protocol.registerSchemesAsPrivileged([{
  scheme: "app",
  privileges: { secure: true, standard: true, supportFetchAPI: true },
}]);

const DIST   = path.join(__dirname, "..", "dist");
const isProd = app.isPackaged;

let mongodProcess  = null;
let backendProcess = null;
let mainWindow     = null;
let loadingWindow  = null;

// ── Persistent JWT secrets ───────────────────────────────────────────────────

function getSecrets() {
  const configPath = path.join(app.getPath("userData"), "stockkart-config.json");
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(configPath, "utf-8")); } catch {}
  if (!cfg.jwtSecret        || cfg.jwtSecret.length        < 32)
    cfg.jwtSecret        = crypto.randomBytes(32).toString("hex");
  if (!cfg.jwtRefreshSecret || cfg.jwtRefreshSecret.length < 32)
    cfg.jwtRefreshSecret = crypto.randomBytes(32).toString("hex");
  try { fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2)); } catch {}
  return cfg;
}

// ── Polling helpers ──────────────────────────────────────────────────────────

function pollUntil(checkFn, intervalMs = 500, maxAttempts = 60) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const t = setInterval(async () => {
      n++;
      try { if (await checkFn()) { clearInterval(t); resolve(); return; } } catch {}
      if (n >= maxAttempts) { clearInterval(t); reject(new Error("Timeout waiting for service")); }
    }, intervalMs);
  });
}

function isPortOpen(port) {
  return new Promise(resolve => {
    const s = new net.Socket();
    s.setTimeout(300);
    s.on("connect", () => { s.destroy(); resolve(true); });
    s.on("error",   () => resolve(false));
    s.on("timeout", () => { s.destroy(); resolve(false); });
    s.connect(port, "127.0.0.1");
  });
}

function isBackendReady() {
  return new Promise(resolve => {
    http.get("http://127.0.0.1:5000/health", res => {
      resolve(res.statusCode === 200);
    }).on("error", () => resolve(false));
  });
}

// ── Loading window ───────────────────────────────────────────────────────────

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 420, height: 240,
    frame: false, resizable: false, center: true,
    show: false,
    backgroundColor: "#4F46E5",
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;background:#4F46E5;display:flex;align-items:center;justify-content:center;
             height:100vh;font-family:system-ui,-apple-system,sans-serif;color:#fff;user-select:none">
<div style="text-align:center;padding:0 24px">
  <div style="font-size:28px;font-weight:700;letter-spacing:-0.5px;margin-bottom:4px">StockKart</div>
  <div id="msg" style="font-size:13px;opacity:0.75;margin-bottom:20px">Starting…</div>
  <div style="width:200px;height:4px;background:rgba(255,255,255,0.2);border-radius:99px;margin:0 auto">
    <div id="bar" style="height:100%;background:#fff;border-radius:99px;width:8%;transition:width 0.4s ease"></div>
  </div>
</div>
</body></html>`;

  loadingWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  loadingWindow.once("ready-to-show", () => loadingWindow.show());
}

function setLoading(msg, pct) {
  if (!loadingWindow || loadingWindow.isDestroyed()) return;
  loadingWindow.webContents.executeJavaScript(
    `document.getElementById('msg').textContent=${JSON.stringify(msg)};` +
    `document.getElementById('bar').style.width='${pct}%';`
  ).catch(() => {});
}

// ── App startup ──────────────────────────────────────────────────────────────

async function startApp() {
  createLoadingWindow();
  const secrets = getSecrets();

  const mongodPath  = path.join(process.resourcesPath || "", "mongod.exe");
  const backendPath = isProd
    ? path.join(process.resourcesPath, "backend", "src", "server.js")
    : path.join(__dirname, "..", "..", "backend", "src", "server.js");
  const dbPath = path.join(app.getPath("userData"), "db");

  fs.mkdirSync(dbPath, { recursive: true });

  // 1 ── Start MongoDB ────────────────────────────────────────────────────────
  if (isProd && fs.existsSync(mongodPath)) {
    setLoading("Starting database…", 15);
    mongodProcess = spawn(mongodPath, [
      "--dbpath",  dbPath,
      "--port",    "27017",
      "--logpath", path.join(app.getPath("userData"), "mongod.log"),
      "--logappend",
      "--quiet",
    ], { windowsHide: true });

    mongodProcess.on("error", err => console.error("[mongod]", err.message));

    await pollUntil(() => isPortOpen(27017), 500, 60)
      .catch(err => { console.error("MongoDB failed to start:", err.message); app.quit(); });
  } else if (!isProd) {
    console.log("[Electron Dev] Skipping mongod — expecting existing backend on :5000");
  }

  // 2 ── Start Express backend ───────────────────────────────────────────────
  setLoading("Starting backend…", 50);

  if (isProd) {
    const backendEnv = {
      ...process.env,
      MONGO_URI:            "mongodb://127.0.0.1:27017/stockkart",
      PORT:                 "5000",
      NODE_ENV:             "production",
      JWT_SECRET:           secrets.jwtSecret,
      JWT_REFRESH_SECRET:   secrets.jwtRefreshSecret,
      JWT_EXPIRES_IN:       "7d",
      JWT_REFRESH_EXPIRES_IN: "30d",
      ALLOWED_ORIGINS:      "*",
      CLIENT_URL:           "http://localhost:5173",
      APP_NAME:             "StockKart",
      ELECTRON_LOCAL:       "true",
    };

    backendProcess = utilityProcess.fork(backendPath, [], {
      env:         backendEnv,
      cwd:         path.join(process.resourcesPath, "backend"),
      serviceName: "StockKart Backend",
      stdio:       "pipe",
    });

    backendProcess.stdout?.on("data", d => process.stdout.write("[backend] " + d));
    backendProcess.stderr?.on("data", d => process.stderr.write("[backend] " + d));
    backendProcess.on("exit", code => {
      if (code && code !== 0) console.error("[backend] exited with code", code);
    });
  }

  // Wait for backend to be ready
  await pollUntil(() => isBackendReady(), 500, 60)
    .catch(err => console.error("Backend timeout:", err.message));

  // 3 ── Check first-run setup ───────────────────────────────────────────────
  setLoading("Almost ready…", 85);
  let needsSetup = false;
  try {
    const r = await fetch("http://127.0.0.1:5000/api/v1/setup/status");
    const j = await r.json();
    needsSetup = j.data?.needsSetup === true;
  } catch {}

  // 4 ── Show main window ────────────────────────────────────────────────────
  setLoading("Opening StockKart…", 100);
  createMainWindow(needsSetup);
}

// ── Main window ──────────────────────────────────────────────────────────────

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".json": "application/json", ".webp": "image/webp",
};

function createMainWindow(needsSetup) {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 1024, minHeight: 600,
    autoHideMenuBar: true,
    title: "StockKart",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // allow app:// → http://localhost without CORS errors
    },
  });

  mainWindow.loadURL("app://app/");

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.close();
      loadingWindow = null;
    }
    // Signal the React app whether first-run setup is needed
    if (needsSetup) {
      mainWindow.webContents.executeJavaScript("window.__SK_NEEDS_SETUP__=true").catch(() => {});
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith("app://")) shell.openExternal(url);
    return { action: "deny" };
  });

  // Auto-updater — check for new releases on GitHub (production only)
  if (isProd) {
    try {
      const { autoUpdater } = require("electron-updater");
      autoUpdater.logger = null; // silence logs; use checkForUpdatesAndNotify for simple UX
      setTimeout(() => autoUpdater.checkForUpdatesAndNotify().catch(() => {}), 5000);
    } catch {}
  }
}

// ── Electron lifecycle ────────────────────────────────────────────────────────

app.whenReady().then(() => {
  protocol.handle("app", (req) => {
    const { pathname } = new URL(req.url);
    const ext = path.extname(pathname);

    if (ext) {
      const filePath = path.join(DIST, ...pathname.split("/").filter(Boolean));
      const mime = MIME[ext] || "application/octet-stream";
      try {
        return new Response(fs.readFileSync(filePath), { headers: { "Content-Type": mime } });
      } catch { /* fall through to index.html */ }
    }

    return new Response(fs.readFileSync(path.join(DIST, "index.html")), {
      headers: { "Content-Type": "text/html" },
    });
  });

  startApp().catch(err => console.error("Startup failed:", err));
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow(false);
});

// Graceful shutdown — kill mongod before quit
app.on("before-quit", () => {
  if (mongodProcess) {
    mongodProcess.kill("SIGTERM");
    setTimeout(() => { try { mongodProcess.kill("SIGKILL"); } catch {} }, 3000);
  }
});
