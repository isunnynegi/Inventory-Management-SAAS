import mongoose from "mongoose";
import { basePlugin } from "../../common/basePlugin.js";

const invoiceItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: { type: String, required: true },
  sku: { type: String },
  hsn: { type: String },
  qty: { type: Number, required: true, min: 0.01 },
  unit: { type: String },
  price: { type: Number, required: true, min: 0 },
  taxPercent: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  lineTotal: { type: Number, required: true },
}, { _id: true });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true },
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" },
  storefrontOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "StorefrontOrder" },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  customerName: { type: String },
  customerPhone: { type: String },
  customerAddress: { type: String },
  customerGstin: { type: String },
  paymentReference: { type: String },
  placeOfSupply: { type: String },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  items: [invoiceItemSchema],
  subtotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  deliveryCharge: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  status: { type: String, enum: ["paid","unpaid","partial","cancelled"], default: "unpaid" },
  paymentMethod: { type: String, enum: ["cash","bank","upi","credit","card","other"], default: "cash" },
  notes: { type: String, trim: true },
  terms: { type: String, trim: true },
  date: { type: Date, default: Date.now },
  dueDate: { type: Date },
}, { timestamps: true });

invoiceSchema.index({ organizationId: 1, date: -1 });
invoiceSchema.index({ invoiceNumber: 1, organizationId: 1 }, { unique: true });
invoiceSchema.plugin(basePlugin);
const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;
