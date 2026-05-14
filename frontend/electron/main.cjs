const { app, BrowserWindow, protocol, shell } = require("electron");
const path = require("path");
const fs = require("fs");

const DIST = path.join(__dirname, "..", "dist");

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".json": "application/json",
  ".webp": "image/webp",
};

// Must be called before app is ready
protocol.registerSchemesAsPrivileged([{
  scheme: "app",
  privileges: { secure: true, standard: true, supportFetchAPI: true },
}]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    autoHideMenuBar: true,
    title: "StockKart",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // Disable same-origin policy so XHR/fetch from app:// can reach the
      // production HTTPS backend without triggering CORS errors.
      webSecurity: false,
    },
  });

  win.loadURL("app://app/");

  // Open any external links in the OS default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith("app://")) shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  // Serve built React files via app:// so BrowserRouter's History API works
  protocol.handle("app", (req) => {
    const { pathname } = new URL(req.url);
    const ext = path.extname(pathname);

    // If the path looks like a static asset, try to serve it directly
    if (ext) {
      const filePath = path.join(DIST, ...pathname.split("/").filter(Boolean));
      const mime = MIME[ext] || "application/octet-stream";
      try {
        return new Response(fs.readFileSync(filePath), {
          headers: { "Content-Type": mime },
        });
      } catch {
        // File not found — fall through to index.html
      }
    }

    // SPA fallback: all extensionless paths (routes) → index.html
    return new Response(fs.readFileSync(path.join(DIST, "index.html")), {
      headers: { "Content-Type": "text/html" },
    });
  });

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
