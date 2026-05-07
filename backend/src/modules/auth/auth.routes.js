import { Router } from "express";
import * as ctrl from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { authLimiter, strictLimiter } from "../../middleware/rateLimiter.js";

const router = Router();
router.post("/register",         authLimiter,  ctrl.register);
router.post("/login",            authLimiter,  ctrl.login);
router.post("/refresh",                        ctrl.refreshToken);
router.post("/forgot-password",  strictLimiter, ctrl.forgotPassword);
router.post("/reset-password",   strictLimiter, ctrl.resetPassword);
router.use(authenticate);
router.get("/me",                ctrl.getMe);
router.post("/logout",           ctrl.logout);
router.patch("/change-password", ctrl.changePassword);
export default router;
