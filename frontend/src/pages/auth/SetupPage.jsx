import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowRight, Plus, Trash2, Check, ShoppingCart } from "lucide-react";
import {
  authApi, setupApi, orgApi,
  categoryApi, supplierApi, productApi, purchaseApi,
} from "../../api/index.js";
import { useAuthStore } from "../../stores/authStore.js";
import toast from "react-hot-toast";

// ─── constants ───────────────────────────────────────────────────────────────
const STORE_TYPES = [
  { value: "general",     label: "General Store" },
  { value: "electronics", label: "Electronics" },
  { value: "electrical",  label: "Electrical / Hardware" },
  { value: "pharmacy",    label: "Pharmacy" },
  { value: "grocery",     label: "Grocery / Supermarket" },
  { value: "clothing",    label: "Clothing / Apparel" },
  { value: "other",       label: "Other" },
];

const STEP_META = [
  { label: "Account",   title: "Create your store",          sub: "You only do this once — takes less than a minute." },
  { label: "Store Info",title: "Store information",          sub: "Used on receipts and reports. All fields are optional." },
  { label: "Catalog",   title: "Categories & Suppliers",     sub: "Seed your catalogue. You can always add more later." },
  { label: "Products",  title: "Add products",               sub: "Add opening stock. Record purchases from your suppliers." },
];

// ─── schemas ─────────────────────────────────────────────────────────────────
const s1 = z.object({
  storeName: z.string().min(2, "Store name required"),
  storeType: z.string().min(1),
  name:      z.string().min(2, "Your name required"),
  email:     z.string().email("Valid email required"),
  password:  z.string().min(6, "Min 6 characters"),
  confirm:   z.string(),
}).refine(d => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });

const s2 = z.object({
  phone:          z.string().optional(),
  gstin:          z.string().optional(),
  currency:       z.string().default("INR"),
  currencySymbol: z.string().default("₹"),
  street:         z.string().optional(),
  city:           z.string().optional(),
  state:          z.string().optional(),
  zip:            z.string().optional(),
});

// ─── helpers ──────────────────────────────────────────────────────────────────
const Spinner = () => (
  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
);

const FieldErr = ({ msg }) => msg
  ? <p className="mt-1 text-xs text-red-500">{msg}</p>
  : null;

// ─── component ───────────────────────────────────────────────────────────────
export default function SetupPage() {
  const nav = useNavigate();
  const { setAuth } = useAuthStore();

  // wizard position
  const [step,   setStep]   = useState(1);
  const [phase,  setPhase]  = useState("products"); // "products" | "purchases" — used within step 4
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showPw, setShowPw] = useState(false);

  // step 3 state
  const [cats, setCats] = useState([{ name: "" }]);
  const [sups, setSups] = useState([{ name: "", phone: "", email: "" }]);

  // step 4 — products
  const [prods, setProds] = useState([{ name: "", categoryId: "", sellingPrice: "", stock: "" }]);
  const [allCats, setAllCats] = useState([]);

  // step 4 — purchases
  const [purchSupplierId, setPurchSupplierId] = useState("");
  const [purchItems, setPurchItems]           = useState([{ productId: "", qty: 1, costPrice: "" }]);
  const [allProds,  setAllProds]              = useState([]);
  const [allSups,   setAllSups]               = useState([]);

  // redirect if already configured
  useEffect(() => {
    setupApi.status()
      .then(res => { if (!res.data?.needsSetup) nav("/login", { replace: true }); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  // step 1 form
  const f1 = useForm({ resolver: zodResolver(s1), defaultValues: { storeType: "general" }, mode: "onChange" });
  const e1 = f1.formState.errors;

  // step 2 form
  const f2 = useForm({ resolver: zodResolver(s2), defaultValues: { currency: "INR", currencySymbol: "₹" } });

  // ── step handlers ──────────────────────────────────────────────────────────

  const handleStep1 = async ({ storeName, storeType, name, email, password }) => {
    setLoading(true);
    try {
      const res = await authApi.register({ name, email, password, storeName, storeType });
      setAuth({ user: res.data.user, organization: res.data.organization, accessToken: res.data.accessToken });
      toast.success("Store created! Let's fill in the details.");
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (data, skip = false) => {
    if (!skip) {
      setLoading(true);
      try {
        await orgApi.update({
          phone: data.phone, gstin: data.gstin,
          currency: data.currency, currencySymbol: data.currencySymbol,
          address: { street: data.street, city: data.city, state: data.state, zip: data.zip },
        });
        toast.success("Store info saved!");
      } catch {
        toast.error("Could not save store info — you can update it later in Settings.");
      } finally {
        setLoading(false);
      }
    }
    // pre-load seeded categories for step 3
    try {
      const res = await categoryApi.list({ limit: 200 });
      const seeded = res.data || [];
      if (seeded.length) setAllCats(seeded);
    } catch { /* non-blocking */ }
    setStep(3);
  };

  const handleStep3 = async (skip = false) => {
    if (!skip) {
      setLoading(true);
      try {
        const validCats = cats.filter(c => c.name.trim());
        const validSups = sups.filter(s => s.name.trim());

        if (validCats.length) {
          await Promise.all(validCats.map(c => categoryApi.create({ name: c.name.trim() })));
          toast.success(`${validCats.length} categor${validCats.length > 1 ? "ies" : "y"} added`);
        }
        if (validSups.length) {
          await Promise.all(validSups.map(s => supplierApi.create({ name: s.name.trim(), phone: s.phone, email: s.email })));
          toast.success(`${validSups.length} supplier${validSups.length > 1 ? "s" : ""} added`);
        }
      } catch {
        toast.error("Some items could not be saved — you can add them later.");
      } finally {
        setLoading(false);
      }
    }
    // refresh category list for product form
    try {
      const res = await categoryApi.list({ limit: 200 });
      setAllCats(res.data || []);
    } catch { /* non-blocking */ }
    setStep(4);
    setPhase("products");
  };

  // saves products, then moves to purchase phase within step 4
  const handleSaveProducts = async (skip = false) => {
    if (!skip) {
      setLoading(true);
      try {
        const valid = prods.filter(p => p.name.trim());
        if (valid.length) {
          await Promise.all(valid.map(p => productApi.create({
            name: p.name.trim(),
            categoryId:   p.categoryId || undefined,
            sellingPrice: Number(p.sellingPrice) || 0,
            stock:        Number(p.stock) || 0,
            unit: "pcs",
          })));
          toast.success(`${valid.length} product${valid.length > 1 ? "s" : ""} added`);
        }
      } catch {
        toast.error("Some products could not be saved.");
      } finally {
        setLoading(false);
      }
    }
    // fetch all products + suppliers for purchase form
    try {
      const [pr, sr] = await Promise.all([
        productApi.list({ limit: 200 }),
        supplierApi.list({ limit: 200 }),
      ]);
      setAllProds(pr.data || []);
      setAllSups(sr.data || []);
    } catch { /* non-blocking */ }
    setPhase("purchases");
  };

  // final — create purchase (optional) then go to dashboard
  const handleFinish = async (skip = false) => {
    if (!skip) {
      const validItems = purchItems.filter(i => i.productId && Number(i.qty) > 0);
      if (validItems.length) {
        setLoading(true);
        try {
          const sup = allSups.find(s => (s._id || s.id) === purchSupplierId);
          const items = validItems.map(i => {
            const pr   = allProds.find(p => (p._id || p.id) === i.productId);
            const line = Number(i.qty) * Number(i.costPrice || 0);
            return { productId: i.productId, qty: Number(i.qty), costPrice: Number(i.costPrice || 0), taxPercent: 0, taxAmount: 0, lineTotal: line, supplierName: pr?.name };
          });
          const total = items.reduce((s, i) => s + i.lineTotal, 0);
          await purchaseApi.create({
            supplierId:    purchSupplierId || undefined,
            supplierName:  sup?.name,
            items,
            subtotal:      total,
            taxTotal:      0,
            discount:      0,
            totalAmount:   total,
            amountPaid:    total,
            paymentMethod: "cash",
          });
          toast.success("Purchase recorded!");
        } catch {
          toast.error("Could not save the purchase — you can add it from Purchases page.");
        } finally {
          setLoading(false);
        }
      }
    }
    nav("/dashboard", { replace: true });
  };

  if (checking) return null;

  // ── derived display ────────────────────────────────────────────────────────
  const meta    = STEP_META[step - 1];
  const title   = step === 4 && phase === "purchases" ? "Record a purchase" : meta.title;
  const subtext = step === 4 && phase === "purchases"
    ? "Optional — record opening stock from a supplier."
    : meta.sub;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-gray-950 flex">

      {/* ── Left branding + stepper ── */}
      <div className="hidden lg:flex flex-col justify-between w-[280px] bg-primary-600 p-10 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm">S</div>
          <span className="text-white font-semibold text-lg tracking-tight">StockKart</span>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white leading-snug mb-8">Set up your store</h2>
          <div className="space-y-4">
            {STEP_META.map(({ label }, i) => {
              const n     = i + 1;
              const done  = step > n;
              const active= step === n;
              return (
                <div key={n} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                    done   ? "bg-white text-primary-600"
                    : active ? "bg-white/30 text-white ring-2 ring-white/50"
                             : "bg-white/10 text-white/40"
                  }`}>
                    {done ? <Check size={12} /> : n}
                  </div>
                  <span className={`text-sm font-medium ${active ? "text-white" : done ? "text-white/80" : "text-white/40"}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-primary-200 text-xs">© 2026 StockKart</p>
      </div>

      {/* ── Right — form area ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-[500px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">StockKart</span>
          </div>

          {/* Step badge + heading */}
          <div className="mb-6">
            <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
              Step {step} of 4{step === 4 && phase === "purchases" ? " — Purchases" : ""}
            </span>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight mt-0.5">{title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtext}</p>
          </div>

          {/* ══ STEP 1 — Account ══════════════════════════════════════════════ */}
          {step === 1 && (
            <form onSubmit={f1.handleSubmit(handleStep1)} className="space-y-4">
              <div>
                <label className="field-label">Store / Business Name</label>
                <input placeholder="Acme General Store" className={`input${e1.storeName ? " input-error" : ""}`} {...f1.register("storeName")} />
                <FieldErr msg={e1.storeName?.message} />
              </div>

              <div>
                <label className="field-label">Store Type</label>
                <select className="input" {...f1.register("storeType")}>
                  {STORE_TYPES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Admin Account</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="field-label">Your Name</label>
                  <input placeholder="Rahul Sharma" className={`input${e1.name ? " input-error" : ""}`} {...f1.register("name")} />
                  <FieldErr msg={e1.name?.message} />
                </div>
                <div className="col-span-2">
                  <label className="field-label">Email Address</label>
                  <input type="email" placeholder="you@example.com" autoComplete="email"
                    className={`input${e1.email ? " input-error" : ""}`} {...f1.register("email")} />
                  <FieldErr msg={e1.email?.message} />
                </div>
                <div>
                  <label className="field-label">Password</label>
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} placeholder="Min. 6 characters" autoComplete="new-password"
                      className={`input pr-10${e1.password ? " input-error" : ""}`} {...f1.register("password")} />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      className="absolute inset-y-0 right-3 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <FieldErr msg={e1.password?.message} />
                </div>
                <div>
                  <label className="field-label">Confirm Password</label>
                  <input type="password" placeholder="Repeat password" autoComplete="new-password"
                    className={`input${e1.confirm ? " input-error" : ""}`} {...f1.register("confirm")} />
                  <FieldErr msg={e1.confirm?.message} />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full btn-primary py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
                {loading ? <Spinner /> : <ArrowRight size={16} />}
                {loading ? "Creating…" : "Create My Store"}
              </button>
            </form>
          )}

          {/* ══ STEP 2 — Store Info ═══════════════════════════════════════════ */}
          {step === 2 && (
            <form onSubmit={f2.handleSubmit(d => handleStep2(d, false))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Phone</label>
                  <input placeholder="+91 98765 43210" className="input" {...f2.register("phone")} />
                </div>
                <div>
                  <label className="field-label">GST / Tax ID</label>
                  <input placeholder="22AAAAA0000A1Z5" className="input" {...f2.register("gstin")} />
                </div>
                <div>
                  <label className="field-label">Currency</label>
                  <select className="input" {...f2.register("currency")}>
                    {[["INR","₹ INR"],["USD","$ USD"],["EUR","€ EUR"],["GBP","£ GBP"]].map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Currency Symbol</label>
                  <input placeholder="₹" className="input" {...f2.register("currencySymbol")} />
                </div>
                <div className="col-span-2">
                  <label className="field-label">Street Address</label>
                  <input placeholder="123 Main Street" className="input" {...f2.register("street")} />
                </div>
                <div>
                  <label className="field-label">City</label>
                  <input placeholder="Delhi" className="input" {...f2.register("city")} />
                </div>
                <div>
                  <label className="field-label">State</label>
                  <input placeholder="Delhi" className="input" {...f2.register("state")} />
                </div>
                <div>
                  <label className="field-label">ZIP / PIN Code</label>
                  <input placeholder="110001" className="input" {...f2.register("zip")} />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={loading}
                  className="flex-1 btn-primary py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <Spinner /> : <ArrowRight size={16} />}
                  {loading ? "Saving…" : "Save & Continue"}
                </button>
                <button type="button" onClick={() => handleStep2({}, true)}
                  className="px-5 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 font-medium transition-colors">
                  Skip
                </button>
              </div>
            </form>
          )}

          {/* ══ STEP 3 — Categories & Suppliers ══════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-7">

              {/* pre-seeded notice */}
              {allCats.length > 0 && (
                <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-primary-700 dark:text-primary-300 mb-1">Pre-loaded categories</p>
                  <p className="text-xs text-primary-600 dark:text-primary-400">
                    {allCats.map(c => c.name).join(" · ")}
                  </p>
                </div>
              )}

              {/* Categories */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Add more categories</p>
                  <button type="button" onClick={() => setCats(c => [...c, { name: "" }])}
                    className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                    <Plus size={12} /> Add row
                  </button>
                </div>
                <div className="space-y-2">
                  {cats.map((cat, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={cat.name}
                        onChange={e => setCats(c => c.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        placeholder={`Category name (e.g. Cables)`}
                        className="input flex-1"
                      />
                      {cats.length > 1 && (
                        <button type="button" onClick={() => setCats(c => c.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-600 px-2 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Suppliers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Suppliers</p>
                  <button type="button" onClick={() => setSups(s => [...s, { name: "", phone: "", email: "" }])}
                    className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                    <Plus size={12} /> Add row
                  </button>
                </div>
                <div className="space-y-2">
                  {sups.map((sup, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={sup.name}
                        onChange={e => setSups(s => s.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        placeholder="Supplier name *"
                        className="input flex-1"
                      />
                      <input
                        value={sup.phone}
                        onChange={e => setSups(s => s.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))}
                        placeholder="Phone"
                        className="input w-28"
                      />
                      <input
                        value={sup.email}
                        onChange={e => setSups(s => s.map((x, j) => j === i ? { ...x, email: e.target.value } : x))}
                        placeholder="Email"
                        className="input w-36"
                      />
                      {sups.length > 1 && (
                        <button type="button" onClick={() => setSups(s => s.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-600 px-1 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => handleStep3(false)} disabled={loading}
                  className="flex-1 btn-primary py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <Spinner /> : <ArrowRight size={16} />}
                  {loading ? "Saving…" : "Save & Continue"}
                </button>
                <button type="button" onClick={() => handleStep3(true)}
                  className="px-5 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 font-medium transition-colors">
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 4a — Products ════════════════════════════════════════════ */}
          {step === 4 && phase === "products" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Name · Category · Selling Price · Opening Stock</p>
                <button type="button"
                  onClick={() => setProds(p => [...p, { name: "", categoryId: "", sellingPrice: "", stock: "" }])}
                  className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                  <Plus size={12} /> Add row
                </button>
              </div>

              <div className="space-y-2">
                {prods.map((prod, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      value={prod.name}
                      onChange={e => setProds(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      placeholder="Product name *"
                      className="input col-span-4"
                    />
                    <select
                      value={prod.categoryId}
                      onChange={e => setProds(p => p.map((x, j) => j === i ? { ...x, categoryId: e.target.value } : x))}
                      className="input col-span-3"
                    >
                      <option value="">Category</option>
                      {allCats.map(c => (
                        <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                      ))}
                    </select>
                    <input
                      value={prod.sellingPrice}
                      onChange={e => setProds(p => p.map((x, j) => j === i ? { ...x, sellingPrice: e.target.value } : x))}
                      placeholder="Price"
                      type="number" min="0"
                      className="input col-span-2"
                    />
                    <input
                      value={prod.stock}
                      onChange={e => setProds(p => p.map((x, j) => j === i ? { ...x, stock: e.target.value } : x))}
                      placeholder="Stock"
                      type="number" min="0"
                      className="input col-span-2"
                    />
                    <div className="col-span-1 flex justify-center">
                      {prods.length > 1 && (
                        <button type="button" onClick={() => setProds(p => p.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400">
                Tip: You can also import products in bulk from the Products page later.
              </p>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => handleSaveProducts(false)} disabled={loading}
                  className="flex-1 btn-primary py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <Spinner /> : <ShoppingCart size={16} />}
                  {loading ? "Saving…" : "Save & Add Purchases"}
                </button>
                <button type="button" onClick={() => handleSaveProducts(true)}
                  className="px-5 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 font-medium transition-colors">
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 4b — Purchases ═══════════════════════════════════════════ */}
          {step === 4 && phase === "purchases" && (
            <div className="space-y-5">

              {/* Supplier select */}
              <div>
                <label className="field-label">Supplier</label>
                <select className="input" value={purchSupplierId} onChange={e => setPurchSupplierId(e.target.value)}>
                  <option value="">No supplier / Cash purchase</option>
                  {allSups.map(s => (
                    <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Purchase items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Items purchased</p>
                  <button type="button"
                    onClick={() => setPurchItems(p => [...p, { productId: "", qty: 1, costPrice: "" }])}
                    className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                    <Plus size={12} /> Add item
                  </button>
                </div>
                <div className="space-y-2">
                  {purchItems.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <select
                        value={item.productId}
                        onChange={e => setPurchItems(p => p.map((x, j) => j === i ? { ...x, productId: e.target.value } : x))}
                        className="input col-span-6"
                      >
                        <option value="">Select product</option>
                        {allProds.map(p => (
                          <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        value={item.qty}
                        onChange={e => setPurchItems(p => p.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))}
                        placeholder="Qty"
                        type="number" min="1"
                        className="input col-span-2"
                      />
                      <input
                        value={item.costPrice}
                        onChange={e => setPurchItems(p => p.map((x, j) => j === i ? { ...x, costPrice: e.target.value } : x))}
                        placeholder="Cost ₹"
                        type="number" min="0"
                        className="input col-span-3"
                      />
                      <div className="col-span-1 flex justify-center">
                        {purchItems.length > 1 && (
                          <button type="button" onClick={() => setPurchItems(p => p.filter((_, j) => j !== i))}
                            className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => handleFinish(false)} disabled={loading}
                  className="flex-1 btn-primary py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading ? <Spinner /> : <Check size={16} />}
                  {loading ? "Finishing…" : "Finish Setup"}
                </button>
                <button type="button" onClick={() => handleFinish(true)}
                  className="px-5 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 font-medium transition-colors">
                  Skip
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
