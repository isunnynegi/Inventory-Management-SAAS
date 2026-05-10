// Mirror of backend/src/utils/featureKeys.js — keep in sync.

export const FEATURES = {
  PURCHASE:           "purchase",
  CUSTOMERS:          "customers",
  SUPPLIERS:          "suppliers",
  GST_INVOICE:        "gst_invoice",
  DATA_EXPORT:        "data_export",
  BARCODE:            "barcode",
  MULTI_BRANCH:       "multi_branch",
  RBAC:               "rbac",
  ADVANCED_ANALYTICS: "advanced_analytics",
  STOREFRONT:         "storefront",
  LEDGER:             "ledger",
};

export const PLAN_FEATURES = {
  free: [],
  starter: ["purchase", "customers", "suppliers", "gst_invoice", "data_export"],
  pro: [
    "purchase", "customers", "suppliers", "gst_invoice", "data_export",
    "barcode", "multi_branch", "rbac", "advanced_analytics", "storefront", "ledger",
  ],
};

export const PLAN_LIMITS = {
  free:    { products: 50, users: 1 },
  starter: { products: -1, users: 2 },
  pro:     { products: -1, users: -1 },
};

export const PLAN_META = {
  free:    { label: "Free",    color: "gray",   price: 0 },
  starter: { label: "Starter", color: "blue",   price: 499 },
  pro:     { label: "Pro",     color: "violet", price: 999 },
};
