import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3, Package, FileText, Users, Zap, Shield,
  Store, ChevronRight, Check, ArrowRight,
  Smartphone, Globe, TrendingUp, X, Menu,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore.js";

const PLANS = [
  {
    slug: "free",
    name: "Free",
    price: 0,
    priceYearly: 0,
    description: "Perfect for getting started",
    features: [
      "Up to 50 products",
      "1 team member",
      "Basic inventory tracking",
      "Sales recording",
      "Dashboard analytics",
    ],
    limitations: ["No GST invoicing", "No purchase management", "No data export"],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    slug: "starter",
    name: "Starter",
    price: 499,
    priceYearly: 4999,
    description: "For growing businesses",
    features: [
      "Unlimited products",
      "Up to 2 team members",
      "GST invoicing & compliance",
      "Purchase management",
      "Customer & supplier records",
      "Data export (CSV / PDF)",
    ],
    limitations: ["No barcode scanning", "No online storefront", "No advanced analytics"],
    cta: "Start with Starter",
    highlight: false,
  },
  {
    slug: "pro",
    name: "Pro",
    price: 999,
    priceYearly: 9999,
    description: "For established businesses",
    features: [
      "Everything in Starter",
      "Unlimited team members",
      "Barcode scanning",
      "Online storefront",
      "Advanced analytics & reports",
      "Multi-branch management",
      "Role-based access control",
      "Ledger & accounting",
    ],
    limitations: [],
    cta: "Upgrade to Pro",
    highlight: true,
  },
];

const FEATURES = [
  {
    icon: FileText,
    title: "GST-Ready Invoicing",
    desc: "Generate professional GST invoices with CGST/SGST/IGST split. HSN codes, sequential numbering, PDF download — fully compliant.",
  },
  {
    icon: Package,
    title: "Smart Inventory",
    desc: "Track stock across categories, get low-stock alerts, manage purchases and sales with zero spreadsheets.",
  },
  {
    icon: BarChart3,
    title: "Business Analytics",
    desc: "Real-time dashboards with sales trends, top products, revenue charts, and stock movement reports.",
  },
  {
    icon: Globe,
    title: "Online Storefront",
    desc: "Launch your branded online store instantly. Customers can browse, order, and pay — no coding needed.",
  },
  {
    icon: Users,
    title: "Team Management",
    desc: "Role-based access for admin and staff. Each person sees exactly what they need.",
  },
  {
    icon: Smartphone,
    title: "Works Everywhere",
    desc: "Fully responsive. Manage your store from your phone, tablet, or desktop browser — anywhere, anytime.",
  },
];

const STORE_TYPES = [
  "Electronics", "Pharmacy", "Grocery & FMCG", "Clothing & Apparel",
  "Hardware & Sanitary", "General Store",
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Register your store",
    desc: "Create a free account, add your store details, GST number, and choose your store type.",
  },
  {
    step: "02",
    title: "Add your products",
    desc: "Import or add products manually. Each store type gets a tailored product form — no irrelevant fields.",
  },
  {
    step: "03",
    title: "Start selling",
    desc: "Record sales, generate GST invoices, manage purchases, and watch your analytics grow.",
  },
];

function CustomerPortalModal({ onClose }) {
  const [storeCode, setStoreCode] = useState("");
  const nav = useNavigate();

  const go = () => {
    if (storeCode) {
      nav(`/store/${storeCode}/login`);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-3">
              <Store size={20} className="text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">Customer Portal</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Enter the store code shared by your shop
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mt-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. my-shop-name"
            value={storeCode}
            onChange={e => setStoreCode(e.target.value.trim().toLowerCase())}
            onKeyDown={e => e.key === "Enter" && go()}
            className="flex-1 px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            autoFocus
          />
          <button
            disabled={!storeCode}
            onClick={go}
            className="px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors"
          >
            Go
          </button>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
          Store owner?{" "}
          <Link
            to="/login"
            onClick={onClose}
            className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
          >
            Sign in to your dashboard →
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [showPortal, setShowPortal] = useState(false);
  const [billing, setBilling] = useState("monthly");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
              S
            </div>
            <span className="font-bold text-gray-900 dark:text-gray-100 text-lg tracking-tight">StockKart</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors">Pricing</a>
            {!isLoading && isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1.5"
              >
                Dashboard <ChevronRight size={14} />
              </Link>
            ) : !isLoading ? (
              <>
                <button
                  onClick={() => setShowPortal(true)}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors"
                >
                  Customer Portal
                </button>
                <Link
                  to="/login"
                  className="text-sm text-gray-700 dark:text-gray-300 font-medium hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Get Started Free
                </Link>
              </>
            ) : null}
          </div>

          {/* Mobile menu button */}
          <button
            className="sm:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4 space-y-3">
            <a href="#features" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 dark:text-gray-300 font-medium py-1">Features</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 dark:text-gray-300 font-medium py-1">Pricing</a>
            {isAuthenticated ? (
              <Link to="/dashboard" className="block w-full text-center py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg">Dashboard</Link>
            ) : (
              <>
                <button onClick={() => { setShowPortal(true); setMenuOpen(false); }} className="block w-full text-left text-sm text-gray-700 dark:text-gray-300 font-medium py-1">Customer Portal</button>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="block w-full text-center py-2.5 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold rounded-lg">Sign in</Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="block w-full text-center py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg">Get Started Free</Link>
              </>
            )}
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-48 -right-48 w-[500px] h-[500px] bg-primary-100 dark:bg-primary-900/20 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-indigo-100 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-28">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs font-semibold rounded-full mb-7 border border-primary-200 dark:border-primary-800/40">
              <Zap size={11} />
              Built for Indian SMBs · GST Compliant
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-gray-900 dark:text-gray-100 leading-tight tracking-tight mb-6">
              Inventory management<br />
              <span className="text-primary-600 dark:text-primary-400">that actually works</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 leading-relaxed mb-10 max-w-2xl mx-auto">
              GST-ready billing, smart stock tracking, online storefront, and analytics —
              everything your Indian business needs in one clean dashboard.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link
                to="/register"
                className="w-full sm:w-auto px-7 py-3.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary-600/25 text-base"
              >
                Start Free Today <ArrowRight size={17} />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-7 py-3.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-colors flex items-center justify-center gap-2 text-base"
              >
                <Store size={17} /> Store Login
              </Link>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-500">
              Already a customer?{" "}
              <button
                onClick={() => setShowPortal(true)}
                className="text-primary-600 dark:text-primary-400 font-semibold hover:underline"
              >
                Access your store portal →
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* ── Store types banner ── */}
      <section className="py-10 bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5">
            Designed for every store type
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {STORE_TYPES.map(t => (
              <span
                key={t}
                className="px-4 py-2 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 font-medium rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 bg-white dark:bg-gray-950 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Everything you need to run your store
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              No more spreadsheets, no more guesswork. StockKart gives you the tools to manage
              inventory, billing, and growth in one place.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group p-6 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-primary-200 dark:hover:border-primary-800/60 hover:shadow-md transition-all bg-white dark:bg-gray-900"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4 group-hover:bg-primary-100 dark:group-hover:bg-primary-800/40 transition-colors">
                  <Icon size={21} className="text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Up and running in minutes</h2>
            <p className="text-gray-500 dark:text-gray-400">No technical knowledge required. If you can use WhatsApp, you can use StockKart.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center text-white font-extrabold text-lg mx-auto mb-5 shadow-lg shadow-primary-600/20">
                  {step}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 bg-white dark:bg-gray-950 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Simple, transparent pricing
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-7">
              Start free, upgrade when you grow. No hidden charges.
            </p>
            <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-5 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  billing === "monthly"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("yearly")}
                className={`px-5 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  billing === "yearly"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Yearly
                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">
                  Save 17%
                </span>
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PLANS.map(plan => {
              const displayPrice =
                billing === "yearly" && plan.priceYearly > 0
                  ? Math.round(plan.priceYearly / 12)
                  : plan.price;

              return (
                <div
                  key={plan.slug}
                  className={`relative rounded-2xl p-7 border-2 transition-all ${
                    plan.highlight
                      ? "border-primary-500 dark:border-primary-600 bg-white dark:bg-gray-900 shadow-2xl shadow-primary-600/10"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-600 text-white text-xs font-bold rounded-full whitespace-nowrap shadow-md">
                      Most Popular
                    </span>
                  )}

                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-0.5">{plan.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">{plan.description}</p>

                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                      {displayPrice === 0 ? "Free" : `₹${displayPrice.toLocaleString("en-IN")}`}
                    </span>
                    {displayPrice > 0 && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">/mo</span>
                    )}
                  </div>
                  {billing === "yearly" && plan.priceYearly > 0 && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-5">
                      ₹{plan.priceYearly.toLocaleString("en-IN")} billed yearly
                    </p>
                  )}
                  {!(billing === "yearly" && plan.priceYearly > 0) && <div className="mb-5" />}

                  <ul className="space-y-2.5 mb-7">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                        <Check size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                    {plan.limitations.map(l => (
                      <li key={l} className="flex items-start gap-2.5 text-sm text-gray-400 dark:text-gray-500">
                        <X size={13} className="mt-0.5 flex-shrink-0 opacity-50" />
                        <span className="line-through">{l}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/register"
                    className={`block w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-colors ${
                      plan.highlight
                        ? "bg-primary-600 text-white hover:bg-primary-700"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-10 space-y-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Need a custom plan or have questions?{" "}
              <a
                href="https://wa.me/918979842966"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
              >
                Talk to us on WhatsApp →
              </a>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pay via UPI / bank transfer · Plan activated within 1 hour
            </p>
          </div>
        </div>
      </section>

      {/* ── Trust / stats ── */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { value: "100%", label: "GST compliant" },
              { value: "6+", label: "Store types" },
              { value: "₹0", label: "To get started" },
              { value: "< 1hr", label: "Plan activation" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-extrabold text-primary-600 dark:text-primary-400 mb-1">{value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="py-24 bg-primary-600 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-500/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to take control of your inventory?
          </h2>
          <p className="text-primary-200 mb-10 max-w-xl mx-auto text-lg">
            Join Indian businesses managing their stock, billing, and growth with StockKart.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-3.5 bg-white text-primary-700 font-bold rounded-xl hover:bg-primary-50 transition-colors shadow-lg text-base"
            >
              Create Free Account
            </Link>
            <Link
              to="/login"
              className="px-8 py-3.5 bg-transparent text-white font-semibold rounded-xl border-2 border-white/40 hover:bg-white/10 hover:border-white/60 transition-colors text-base"
            >
              Sign in to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-950 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
                  S
                </div>
                <span className="font-bold text-gray-100 tracking-tight text-lg">StockKart</span>
              </div>
              <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                Inventory management built for Indian SMBs. GST compliant, mobile-friendly, and easy to use.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Product</p>
                <a href="#features" className="block text-gray-500 hover:text-gray-300 transition-colors">Features</a>
                <a href="#pricing" className="block text-gray-500 hover:text-gray-300 transition-colors">Pricing</a>
                <Link to="/register" className="block text-gray-500 hover:text-gray-300 transition-colors">Register</Link>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Account</p>
                <Link to="/login" className="block text-gray-500 hover:text-gray-300 transition-colors">Store Login</Link>
                <button onClick={() => setShowPortal(true)} className="block text-gray-500 hover:text-gray-300 transition-colors text-left">Customer Portal</button>
                <a href="mailto:support@stockkart.in" className="block text-gray-500 hover:text-gray-300 transition-colors">Support</a>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
            <p>© 2026 StockKart. All rights reserved.</p>
            <p>Built for India · GST Compliant · Made with care</p>
          </div>
        </div>
      </footer>

      {showPortal && <CustomerPortalModal onClose={() => setShowPortal(false)} />}
    </div>
  );
}
