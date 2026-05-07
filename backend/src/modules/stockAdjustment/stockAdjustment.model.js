import mongoose from "mongoose";
import { basePlugin } from "../../common/basePlugin.js";

const stockAdjSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  type: { type: String, enum: ["increase","decrease"], required: true },
  qty: { type: Number, required: true, min: 0.01 },
  previousStock: { type: Number },
  newStock: { type: Number },
  reason: { type: String, trim: true, maxlength: 300 },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

stockAdjSchema.index({ organizationId: 1, date: -1 });
stockAdjSchema.plugin(basePlugin);
const StockAdjustment = mongoose.model("StockAdjustment", stockAdjSchema);
export default StockAdjustment;
