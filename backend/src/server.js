import dotenv from "dotenv";
dotenv.config();
import "./config/env.js";
import app from "./app.js";
import connectDB, { closeDB } from "./config/db.js";
import logger from "./utils/logger.js";

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
