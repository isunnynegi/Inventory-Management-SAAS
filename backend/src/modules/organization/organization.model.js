import mongoose from "mongoose";
import { basePlugin } from "../../common/basePlugin.js";

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  storeType: { type: String, enum: ["general","electronics","sanitary","hardware","pharmacy","grocery","clothing","other"], default: "general" },
  currency: { type: String, default: "INR" },
  currencySymbol: { type: String, default: "₹" },
  address: {
    street: String, city: String, state: String,
    country: { type: String, default: "India" }, zip: String
  },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  gstin: { type: String, trim: true },
  logo: { type: String },
  invoicePrefix: { type: String, default: "INV" },
  invoiceCounter: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isActive: { type: Boolean, default: true },
  settings: {
    lowStockAlert: { type: Boolean, default: true },
    taxEnabled: { type: Boolean, default: false },
    defaultTaxRate: { type: Number, default: 0 },
  },
}, { timestamps: true });

organizationSchema.plugin(basePlugin);
const Organization = mongoose.model("Organization", organizationSchema);
export default Organization;
