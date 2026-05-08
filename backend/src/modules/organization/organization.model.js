import mongoose from "mongoose";
import { basePlugin } from "../../common/basePlugin.js";

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  storeName: { type: String, trim: true, maxlength: 100 },
  slug: { type: String, unique: true, lowercase: true, trim: true },
  storeType: { type: String, enum: ["general","electronics","electrical","sanitary","hardware","pharmacy","grocery","clothing","other"], default: "general" },
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
  storefront: {
    enabled: { type: Boolean, default: false },
    paymentMethods: { type: [String], default: ["cash"] },
    deliveryEnabled: { type: Boolean, default: true },
    pickupEnabled: { type: Boolean, default: true },
    deliveryCharge: { type: Number, default: 0 },
    freeDeliveryAbove: { type: Number, default: 0 },
    upiId: { type: String, trim: true },
    upiName: { type: String, trim: true },
    juspay: {
      enabled: { type: Boolean, default: false },
      merchantId: { type: String, trim: true },
      apiKey: { type: String, trim: true },
      environment: { type: String, enum: ["sandbox", "production"], default: "sandbox" },
    },
    branding: {
      primaryColor: { type: String, trim: true, match: /^#[0-9a-fA-F]{6}$/ },
      tagline: { type: String, trim: true, maxlength: 150 },
      bannerTitle: { type: String, trim: true, maxlength: 100 },
      bannerSubtitle: { type: String, trim: true, maxlength: 200 },
      bannerImage: { type: String, trim: true },
    },
  },
}, { timestamps: true });

organizationSchema.pre("save", async function(next) {
  if (!this.isModified("name") && this.slug) return next();
  const base = slugify(this.storeName || this.name);
  let slug = base;
  let i = 1;
  while (await this.constructor.exists({ slug, _id: { $ne: this._id } })) {
    slug = `${base}-${i++}`;
  }
  this.slug = slug;
  next();
});

organizationSchema.plugin(basePlugin);
const Organization = mongoose.model("Organization", organizationSchema);
export default Organization;
