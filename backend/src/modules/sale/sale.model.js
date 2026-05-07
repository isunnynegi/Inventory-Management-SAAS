import mongoose from "mongoose";
import { basePlugin } from "../../common/basePlugin.js";

const saleItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String },
  qty: { type: Number, required: true, min: 0.01 },
  unit: { type: String },
  sellingPrice: { type: Number, required: true, min: 0 },
  taxPercent: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  lineTotal: { type: Number, required: true },
}, { _id: true });

const saleSchema = new mongoose.Schema({
  saleNumber: { type: String },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  customerName: { type: String },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  items: [saleItemSchema],
  subtotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ["paid","partial","unpaid"], default: "unpaid" },
  paymentMethod: { type: String, enum: ["cash","bank","upi","credit","other"], default: "cash" },
  date: { type: Date, default: Date.now },
  notes: { type: String, trim: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
}, { timestamps: true });

saleSchema.index({ organizationId: 1, date: -1 });
saleSchema.plugin(basePlugin);
const Sale = mongoose.model("Sale", saleSchema);
export default Sale;
