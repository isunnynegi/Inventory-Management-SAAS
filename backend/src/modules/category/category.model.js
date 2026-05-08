import mongoose from "mongoose";
import { basePlugin } from "../../common/basePlugin.js";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 500 },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null, index: true },
}, { timestamps: true });

categorySchema.index({ name: 1, organizationId: 1, parent: 1 }, { unique: true });
categorySchema.plugin(basePlugin);
const Category = mongoose.model("Category", categorySchema);
export default Category;
