import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: { type: String, required: true },
  sku: String,
  image: String,
  qty: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  taxPercent: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  lineTotal: { type: Number, required: true },
}, { _id: false });

const storefrontOrderSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "StorefrontCustomer", required: true },
  customerName: { type: String },
  customerEmail: { type: String },
  customerPhone: { type: String },
  orderNumber: { type: String, required: true },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  taxTotal: { type: Number, default: 0 },
  deliveryCharge: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  fulfillmentType: { type: String, enum: ["delivery", "pickup"], required: true },
  deliveryAddress: {
    name: String, phone: String,
    street: String, city: String, state: String, zip: String,
  },
  paymentMethod: { type: String, enum: ["cash", "upi", "card"], required: true },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
  paidAt: { type: Date },
  utrNumber: { type: String, trim: true },
  juspayOrderId: { type: String, trim: true, index: true, sparse: true },
  juspayPaymentId: { type: String, trim: true },
  status: {
    type: String,
    enum: ["pending", "confirmed", "processing", "ready", "out_for_delivery", "delivered", "cancelled"],
    default: "pending",
  },
  cancelReason: { type: String, trim: true },
  notes: { type: String, trim: true },
  statusHistory: [{
    status: { type: String },
    changedAt: { type: Date, default: Date.now },
    note: { type: String },
  }],
}, { timestamps: true });

storefrontOrderSchema.index({ organizationId: 1, createdAt: -1 });
storefrontOrderSchema.index({ organizationId: 1, customerId: 1 });
storefrontOrderSchema.index({ organizationId: 1, status: 1 });

const StorefrontOrder = mongoose.model("StorefrontOrder", storefrontOrderSchema);
export default StorefrontOrder;
