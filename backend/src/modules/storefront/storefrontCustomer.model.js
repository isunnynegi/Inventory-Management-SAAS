import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const addressSchema = new mongoose.Schema({
  label: { type: String, default: "Home", trim: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  zip: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  sku: { type: String },
  image: { type: String },
  unitPrice: { type: Number, required: true },
  taxPercent: { type: Number, default: 0 },
  qty: { type: Number, required: true, min: 1 },
  stock: { type: Number, default: 0 },
}, { _id: false });

const storefrontCustomerSchema = new mongoose.Schema({
  // Optional: records which store the customer first registered at (informational only)
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  password: { type: String, required: true, select: false },
  addresses: [addressSchema],
  cart: { type: [cartItemSchema], default: [] },
  refreshTokens: [{
    token: { type: String },
    expiresAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Global email uniqueness — customers can log in from any store
// MIGRATION: run db.storefrontcustomers.dropIndex({organizationId:1,email:1}) on existing data
storefrontCustomerSchema.index({ email: 1 }, { unique: true });

storefrontCustomerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

storefrontCustomerSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

const StorefrontCustomer = mongoose.model("StorefrontCustomer", storefrontCustomerSchema);
export default StorefrontCustomer;
