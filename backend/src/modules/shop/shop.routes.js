import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticateCustomer } from "../storefront/storefront.auth.js";
import * as ctrl from "./shop.controller.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many auth attempts.",
});

// Public
router.get("/stores", ctrl.listAllStores);

// Auth (slug-less — StorefrontCustomer is globally scoped)
router.post("/auth/register", authLimiter, ctrl.customerRegister);
router.post("/auth/login",    authLimiter, ctrl.customerLogin);
router.post("/auth/refresh",  ctrl.customerRefresh);
router.post("/auth/logout",   authenticateCustomer, ctrl.customerLogout);
router.get("/auth/me",        authenticateCustomer, ctrl.getCustomerMe);
router.patch("/auth/me",      authenticateCustomer, ctrl.updateCustomerProfile);
router.post("/auth/me/addresses",                        authenticateCustomer, ctrl.addAddress);
router.patch("/auth/me/addresses/:addressId/primary",    authenticateCustomer, ctrl.setDefaultAddress);
router.delete("/auth/me/addresses/:addressId",           authenticateCustomer, ctrl.removeAddress);
router.get("/auth/me/cart",   authenticateCustomer, ctrl.getCart);
router.put("/auth/me/cart",   authenticateCustomer, ctrl.syncCart);

// Cross-store orders
router.get("/orders", authenticateCustomer, ctrl.getAllCustomerOrders);

export default router;
