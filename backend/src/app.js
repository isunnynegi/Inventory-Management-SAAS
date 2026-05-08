import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import { generalLimiter } from "./middleware/rateLimiter.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";
import logger from "./utils/logger.js";

import authRoutes         from "./modules/auth/auth.routes.js";
import organizationRoutes from "./modules/organization/organization.routes.js";
import categoryRoutes     from "./modules/category/category.routes.js";
import productRoutes      from "./modules/product/product.routes.js";
import supplierRoutes     from "./modules/supplier/supplier.routes.js";
import customerRoutes     from "./modules/customer/customer.routes.js";
import purchaseRoutes     from "./modules/purchase/purchase.routes.js";
import saleRoutes         from "./modules/sale/sale.routes.js";
import stockAdjRoutes     from "./modules/stockAdjustment/stockAdjustment.routes.js";
import invoiceRoutes      from "./modules/invoice/invoice.routes.js";
import dashboardRoutes    from "./modules/dashboard/dashboard.routes.js";
import reportRoutes       from "./modules/report/report.routes.js";
import userRoutes         from "./modules/user/user.routes.js";
import storefrontRoutes   from "./modules/storefront/storefront.routes.js";
import sfOrderRoutes      from "./modules/storefrontOrder/storefrontOrder.routes.js";
import couponRoutes        from "./modules/coupon/coupon.routes.js";

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",").map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null, true) : cb(new Error(`CORS: ${origin} not allowed`)),
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));

// ── Parsing ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.use(compression());
app.use(mongoSanitize());
app.use(hpp());
app.set("trust proxy", 1);

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined", {
    stream: { write: msg => logger.http(msg.trim()) },
    skip: req => req.url === "/health",
  }));
}

// ── Rate Limiting ─────────────────────────────────────────────────────────────
app.use("/api", generalLimiter);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({
  status: "ok", timestamp: new Date().toISOString(),
  env: process.env.NODE_ENV, uptime: Math.floor(process.uptime()),
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/v1/auth",          authRoutes);
app.use("/api/v1/organizations", organizationRoutes);
app.use("/api/v1/categories",    categoryRoutes);
app.use("/api/v1/products",      productRoutes);
app.use("/api/v1/suppliers",     supplierRoutes);
app.use("/api/v1/customers",     customerRoutes);
app.use("/api/v1/purchases",     purchaseRoutes);
app.use("/api/v1/sales",         saleRoutes);
app.use("/api/v1/stock-adjustments", stockAdjRoutes);
app.use("/api/v1/invoices",      invoiceRoutes);
app.use("/api/v1/dashboard",     dashboardRoutes);
app.use("/api/v1/reports",       reportRoutes);
app.use("/api/v1/users",         userRoutes);
app.use("/api/v1/store/:slug",   storefrontRoutes);
app.use("/api/v1/storefront-orders", sfOrderRoutes);
app.use("/api/v1/coupons",       couponRoutes);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
