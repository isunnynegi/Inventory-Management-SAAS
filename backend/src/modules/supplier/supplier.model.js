import mongoose from "mongoose";
import { basePlugin } from "../../common/basePlugin.js";

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  gstin: { type: String, trim: true },
  address: { type: String, trim: true, maxlength: 300 },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  balance: { type: Number, default: 0 }, // payable balance
  notes: { type: String, trim: true },
}, { timestamps: true });

supplierSchema.plugin(basePlugin);
const Supplier = mongoose.model("Supplier", supplierSchema);
export default Supplier;
