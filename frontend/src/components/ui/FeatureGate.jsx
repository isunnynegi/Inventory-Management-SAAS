import { Lock, Zap, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription } from "../../hooks/useSubscription.js";
import { PLAN_META } from "../../utils/featureKeys.js";

const FEATURE_LABELS = {
  purchase:           "Purchase Management",
  customers:          "Customer Management",
  suppliers:          "Supplier Management",
  gst_invoice:        "GST Invoice",
  data_export:        "Reports & Data Export",
  barcode:            "Barcode & QR Code",
  multi_branch:       "Multi-Branch Support",
  rbac:               "Role-Based Access Control",
  advanced_analytics: "Advanced Analytics",
  storefront:         "Online Storefront",
  ledger:             "Customer & Supplier Ledger",
};

const REQUIRED_PLAN = {
  purchase:           "starter",
  customers:          "starter",
  suppliers:          "starter",
  gst_invoice:        "starter",
  data_export:        "starter",
  barcode:            "pro",
  multi_branch:       "pro",
  rbac:               "pro",
  advanced_analytics: "pro",
  storefront:         "pro",
  ledger:             "pro",
};

function UpgradeScreen({ feature }) {
  const required = REQUIRED_PLAN[feature] || "starter";
  const meta = PLAN_META[required];

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-5">
        <Lock size={28} className="text-primary-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {FEATURE_LABELS[feature] || "This Feature"} is locked
      </h2>
      <p className="text-gray-500 text-sm max-w-sm mb-6">
        This feature is available on the{" "}
        <span className="font-semibold text-gray-700">{meta?.label}</span> plan and above.
        Upgrade to unlock it and get more out of StockKart.
      </p>

      <Link
        to="/settings/subscription"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
      >
        <Zap size={16} />
        View Plans & Upgrade
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}

// Inline pill — use inside tables/cards where a full-page block doesn't fit
export function FeatureBadge({ feature }) {
  const { hasFeature, isLoading } = useSubscription();
  if (isLoading || hasFeature(feature)) return null;
  const required = REQUIRED_PLAN[feature] || "starter";
  const meta = PLAN_META[required];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
      <Lock size={10} /> {meta?.label} plan
    </span>
  );
}

// Full-page gate — wraps an entire page/section
export default function FeatureGate({ feature, children }) {
  const { hasFeature, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasFeature(feature)) {
    return <UpgradeScreen feature={feature} />;
  }

  return children;
}
