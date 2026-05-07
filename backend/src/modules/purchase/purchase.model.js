import mongoose from "mongoose";
import { basePlugin } from "../../common/basePlugin.js";

const purchaseItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String },
  qty: { type: Number, required: true, min: 0.01 },
  unit: { type: String },
  costPrice: { type: Number, required: true, min: 0 },
  taxPercent: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  lineTotal: { type: Number, required: true },
}, { _id: true });

const purchaseSchema = new mongoose.Schema({
  purchaseNumber: { type: String },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
  supplierName: { type: String },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  items: [purchaseItemSchema],
  subtotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ["paid","partial","unpaid"], default: "unpaid" },
  paymentMethod: { type: String, enum: ["cash","bank","upi","credit","other"], default: "cash" },
  date: { type: Date, default: Date.now },
  notes: { type: String, trim: true },
  reference: { type: String, trim: true },
}, { timestamps: true });

purchaseSchema.index({ organizationId: 1, date: -1 });
purchaseSchema.plugin(basePlugin);
const Purchase = mongoose.model("Purchase", purchaseSchema);
export default Purchase;
