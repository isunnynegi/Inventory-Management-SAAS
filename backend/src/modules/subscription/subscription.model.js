import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  amount:     { type: Number, required: true },
  currency:   { type: String, default: "INR" },
  cycle:      { type: String, enum: ["monthly", "yearly", "grace", "manual"] },
  paidAt:     { type: Date, default: Date.now },
  method:     { type: String, trim: true },
  reference:  { type: String, trim: true },
  notes:      { type: String, trim: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { _id: true });

const subscriptionSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId, ref: "Organization",
    required: true, unique: true, index: true,
  },
  planSlug:     { type: String, enum: ["free", "starter", "pro"], default: "free" },
  billingCycle: { type: String, enum: ["monthly", "yearly", "grace"], default: "grace" },
  status:       { type: String, enum: ["active", "expired", "cancelled"], default: "active" },
  startDate:    { type: Date, default: Date.now },
  endDate:      { type: Date },

  // SuperAdmin waiver: treat this org as having a higher effective plan
  effectivePlanOverride: { type: String, enum: ["free", "starter", "pro", null], default: null },
  overrideReason:        { type: String, trim: true },
  overrideGrantedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  overrideExpiresAt:     { type: Date },

  payments: [paymentSchema],
}, { timestamps: true });

// Virtual: the actual plan slug to use for feature checks
subscriptionSchema.virtual("effectivePlan").get(function () {
  if (this.effectivePlanOverride) return this.effectivePlanOverride;
  return this.planSlug;
});

subscriptionSchema.set("toJSON", { virtuals: true });
subscriptionSchema.set("toObject", { virtuals: true });

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
