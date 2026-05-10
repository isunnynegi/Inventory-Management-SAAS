/**
 * seedPlans.js — run once to seed plans and give all existing orgs a 30-day Pro trial.
 * Usage: node --env-file=.env scripts/seedPlans.js
 */
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error("MONGO_URI not set"); process.exit(1); }

await mongoose.connect(MONGO_URI);
console.log("Connected to MongoDB");

// ── Define schemas inline (avoid circular imports) ───────────────────────────

const Plan = mongoose.model("Plan", new mongoose.Schema({
  name: String, slug: String, priceMonthly: Number, priceYearly: Number,
  currency: String, productLimit: Number, userLimit: Number,
  features: [String], limitations: [String], featureKeys: [String],
  isActive: Boolean, sortOrder: Number,
}, { timestamps: true }));

const Subscription = mongoose.model("Subscription", new mongoose.Schema({
  organizationId: mongoose.Schema.Types.ObjectId,
  planSlug: String, billingCycle: String, status: String,
  startDate: Date, endDate: Date,
  effectivePlanOverride: String,
  overrideReason: String, overrideGrantedBy: mongoose.Schema.Types.ObjectId,
  overrideExpiresAt: Date,
  payments: [mongoose.Schema.Types.Mixed],
}, { timestamps: true }));

const Organization = mongoose.model("Organization", new mongoose.Schema({
  name: String, isDeleted: Boolean,
}));

// ── Seed plans ────────────────────────────────────────────────────────────────

const plans = [
  {
    name: "Free", slug: "free", priceMonthly: 0, priceYearly: 0, currency: "INR",
    productLimit: 50, userLimit: 1, sortOrder: 1, isActive: true,
    featureKeys: [],
    features: [
      "Add up to 50 products", "Basic Inventory Management",
      "Stock In / Stock Out", "Basic Sales Entry",
      "Low Stock Alerts", "Single Store Support", "Basic Reports",
    ],
    limitations: [
      "No GST Invoice", "No Barcode Scanner Support", "No Purchase Management",
      "No Multi-User Access", "No Customer/Supplier Management", "No Data Export",
    ],
  },
  {
    name: "Starter", slug: "starter", priceMonthly: 499, priceYearly: 4999, currency: "INR",
    productLimit: -1, userLimit: 2, sortOrder: 2, isActive: true,
    featureKeys: ["purchase", "customers", "suppliers", "gst_invoice", "data_export"],
    features: [
      "Unlimited Products", "Inventory Management", "Stock In / Stock Out",
      "Purchase Management", "Sales Management", "Customer Management",
      "Supplier Management", "GST Invoice (Basic)", "Basic Profit & Loss Report", "Data Backup",
    ],
    limitations: [
      "No Multi-Branch Support", "No Advanced Analytics Dashboard", "No Role-Based Access",
    ],
  },
  {
    name: "Pro", slug: "pro", priceMonthly: 999, priceYearly: 9999, currency: "INR",
    productLimit: -1, userLimit: -1, sortOrder: 3, isActive: true,
    featureKeys: [
      "purchase", "customers", "suppliers", "gst_invoice", "data_export",
      "barcode", "multi_branch", "rbac", "advanced_analytics", "storefront", "ledger",
    ],
    features: [
      "Unlimited Products", "Unlimited Users", "Full Inventory Management",
      "Purchase + Sales + Returns", "GST Invoice (Advanced)", "Barcode & QR Code Support",
      "Multi-Branch / Multi-Warehouse", "Role Based Access Control (RBAC)",
      "Advanced Reports & Analytics", "Profit/Loss + Tax Reports", "Excel/PDF Export",
      "Customer Ledger & Supplier Ledger", "Priority Support",
    ],
    limitations: [],
  },
];

let seeded = 0;
for (const p of plans) {
  const exists = await Plan.findOne({ slug: p.slug });
  if (!exists) {
    await Plan.create(p);
    console.log(`  ✓ Created plan: ${p.name}`);
    seeded++;
  } else {
    await Plan.updateOne({ slug: p.slug }, { $set: p });
    console.log(`  ↻ Updated plan: ${p.name}`);
  }
}

// ── Assign Pro trial (30 days) to all existing orgs without a subscription ───

const orgs = await Organization.find({ isDeleted: { $ne: true } }).select("_id name").lean();
const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
let assigned = 0;

for (const org of orgs) {
  const existing = await Subscription.findOne({ organizationId: org._id });
  if (!existing) {
    await Subscription.create({
      organizationId: org._id,
      planSlug: "free",
      billingCycle: "grace",
      status: "active",
      startDate: new Date(),
      endDate: trialEnd,
      effectivePlanOverride: "pro",
      overrideReason: "30-day Pro trial for existing store",
    });
    console.log(`  ✓ Pro trial → ${org.name}`);
    assigned++;
  } else {
    console.log(`  – Already has subscription: ${org.name} (${existing.planSlug})`);
  }
}

console.log(`\nDone. Plans seeded: ${seeded}. Pro trials assigned: ${assigned}.`);
await mongoose.disconnect();
