import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  slug:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  priceMonthly: { type: Number, required: true, min: 0 },
  priceYearly:  { type: Number, required: true, min: 0 },
  currency:     { type: String, default: "INR" },
  productLimit: { type: Number, default: -1 },   // -1 = unlimited
  userLimit:    { type: Number, default: -1 },
  features:     [{ type: String }],               // display strings
  limitations:  [{ type: String }],               // display strings
  featureKeys:  [{ type: String }],               // machine-readable keys (FEATURES constant)
  isActive:     { type: Boolean, default: true },
  sortOrder:    { type: Number, default: 0 },
}, { timestamps: true });

const Plan = mongoose.model("Plan", planSchema);
export default Plan;
