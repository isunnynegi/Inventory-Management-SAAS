import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticateCustomer } from "./storefront.auth.js";
import * as ctrl from "./storefront.controller.js";

const router = Router({ mergeParams: true });

const sfAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many auth attempts.",
});

const sfOrderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many order requests.",
});

// Public routes
router.get("/", ctrl.getStoreInfo);
router.get("/homepage", ctrl.getHomepage);
router.get("/coupons/validate", ctrl.validateCoupon);
router.get("/products", ctrl.listProducts);
router.get("/products/:productId", ctrl.getProduct);
router.get("/categories", ctrl.listCategories);
router.get("/filter-options", ctrl.getFilterOptions);

// Auth
router.post("/auth/register", sfAuthLimiter, ctrl.customerRegister);
router.post("/auth/login", sfAuthLimiter, ctrl.customerLogin);
router.post("/auth/refresh", ctrl.customerRefresh);
router.post("/auth/logout", authenticateCustomer, ctrl.customerLogout);
router.get("/auth/me", authenticateCustomer, ctrl.getCustomerMe);
router.patch("/auth/me", authenticateCustomer, ctrl.updateCustomerProfile);
router.post("/auth/me/addresses", authenticateCustomer, ctrl.addAddress);
router.patch("/auth/me/addresses/:addressId/primary", authenticateCustomer, ctrl.setDefaultAddress);
router.delete("/auth/me/addresses/:addressId", authenticateCustomer, ctrl.removeAddress);

// Orders (requires customer auth)
router.post("/orders", authenticateCustomer, sfOrderLimiter, ctrl.createOrder);
router.get("/orders", authenticateCustomer, ctrl.getCustomerOrders);
router.get("/orders/:orderId", authenticateCustomer, ctrl.getCustomerOrder);

// Payment
router.post("/payment/juspay/initiate", authenticateCustomer, ctrl.initiateJuspayPayment);
router.post("/payment/juspay/webhook", ctrl.juspayWebhook);
router.post("/payment/utr", authenticateCustomer, ctrl.submitUtr);

export default router;
