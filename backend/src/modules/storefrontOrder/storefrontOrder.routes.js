import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import * as ctrl from "./storefrontOrder.controller.js";

const router = Router();

router.use(authenticate, authorize("admin", "superAdmin", "staff"));

router.get("/", ctrl.listOrders);
router.get("/stats", ctrl.getOrderStats);
router.get("/:id", ctrl.getOrder);
router.patch("/:id/status", ctrl.updateOrderStatus);
router.patch("/:id/payment", ctrl.confirmPayment);

export default router;
