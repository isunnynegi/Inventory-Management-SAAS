import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

// Dynamic imports run AFTER dotenv.config() — required in ESM to avoid hoisting
const [{ default: app }, { default: connectDB, closeDB }, { default: logger }] = await Promise.all([
  import("./app.js"),
  import("./config/db.js"),
  import("./utils/logger.js"),
]);

const PORT = process.env.PORT || 5000;
let server;

const start = async () => {
  await connectDB();
  server = app.listen(PORT, () => {
    logger.info(`🚀 Inventory SaaS API → http://localhost:${PORT} [${process.env.NODE_ENV}]`);
  });
  server.on("error", err => { logger.error(err.message); process.exit(1); });
};

const shutdown = async (sig) => {
  logger.warn(`${sig} received – shutting down…`);
  if (server) server.close(async () => { await closeDB(); logger.info("Graceful shutdown complete"); process.exit(0); });
  setTimeout(() => process.exit(1), 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("unhandledRejection", (r) => { logger.error(`Unhandled: ${r}`); shutdown("unhandledRejection"); });
process.on("uncaughtException",  (e) => { logger.error(`Uncaught: ${e.message}`); shutdown("uncaughtException"); });

start();
