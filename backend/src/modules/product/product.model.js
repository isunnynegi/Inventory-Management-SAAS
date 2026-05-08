import mongoose from "mongoose";
import { basePlugin } from "../../common/basePlugin.js";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  sku: { type: String, trim: true, uppercase: true },
  barcode: { type: String, trim: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  description: { type: String, trim: true, maxlength: 1000 },
  unit: { type: String, default: "pcs", trim: true },
  stock: { type: Number, default: 0, min: 0 },
  reorderLevel: { type: Number, default: 10 },
  purchasePrice: { type: Number, default: 0, min: 0 },
  sellingPrice: { type: Number, default: 0, min: 0 },
  taxPercent: { type: Number, default: 0, min: 0, max: 100 },
  image: { type: String },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  soldCount: { type: Number, default: 0, min: 0 },
  // Dynamic attributes: e.g. [{ key: "Color", value: "Red" }]
  attributes: [{ key: { type: String, trim: true }, value: { type: String, trim: true } }],
}, { timestamps: true });

productSchema.index({ organizationId: 1, isActive: 1 });
productSchema.index({ organizationId: 1, stock: 1 });
productSchema.index({ sku: 1, organizationId: 1 }, { sparse: true });
productSchema.index({ barcode: 1, organizationId: 1 }, { sparse: true });
productSchema.index({ organizationId: 1, isFeatured: 1, isActive: 1 });
productSchema.index({ organizationId: 1, isActive: 1, soldCount: -1 });

productSchema.virtual("isLowStock").get(function() {
  return this.stock <= this.reorderLevel;
});

productSchema.plugin(basePlugin);
const Product = mongoose.model("Product", productSchema);
export default Product;
