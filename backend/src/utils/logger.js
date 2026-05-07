import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, "../../logs");
const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const consoleFmt = combine(
  colorize({ all: true }),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) =>
    `[${ts}] ${level}: ${stack || message}`)
);

const transports = [new winston.transports.Console({ format: consoleFmt })];

if (process.env.NODE_ENV !== "test") {
  transports.push(
    new DailyRotateFile({ dirname: LOG_DIR, filename: "app-%DATE%.log", datePattern: "YYYY-MM-DD", maxFiles: "14d", format: combine(timestamp(), errors({ stack: true }), json()) }),
    new DailyRotateFile({ dirname: LOG_DIR, filename: "error-%DATE%.log", datePattern: "YYYY-MM-DD", level: "error", maxFiles: "30d", format: combine(timestamp(), errors({ stack: true }), json()) })
  );
}

const logger = winston.createLogger({ level: process.env.NODE_ENV === "production" ? "warn" : "debug", transports });
export default logger;
