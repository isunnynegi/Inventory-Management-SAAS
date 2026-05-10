import mongoose from "mongoose";
import { basePlugin } from "../../common/basePlugin.js";

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  gstin: { type: String, trim: true, uppercase: true },
  address: { type: String, trim: true, maxlength: 300 },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  balance: { type: Number, default: 0 }, // receivable balance
  notes: { type: String, trim: true },
}, { timestamps: true });

customerSchema.plugin(basePlugin);
const Customer = mongoose.model("Customer", customerSchema);
export default Customer;
