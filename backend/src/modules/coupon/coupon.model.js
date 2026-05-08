import mongoose from "mongoose";
import { basePlugin } from "../../common/basePlugin.js";

const couponSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
  type: { type: String, enum: ["percent", "fixed"], required: true },
  value: { type: Number, required: true, min: 0 },
  minOrderAmount: { type: Number, default: 0, min: 0 },
  maxUses: { type: Number, default: 0, min: 0 },
  usedCount: { type: Number, default: 0, min: 0 },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

couponSchema.index({ organizationId: 1, code: 1 }, { unique: true });
couponSchema.plugin(basePlugin);

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
