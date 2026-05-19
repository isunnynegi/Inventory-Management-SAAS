import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Store, ArrowRight } from "lucide-react";
import { authApi, setupApi, orgApi } from "../../api/index.js";
import { useAuthStore } from "../../stores/authStore.js";
import toast from "react-hot-toast";

const STORE_TYPE_LABELS = [
  { value: "general",     label: "General Store" },
  { value: "electronics", label: "Electronics" },
  { value: "electrical",  label: "Electrical / Hardware" },
  { value: "pharmacy",    label: "Pharmacy" },
  { value: "grocery",     label: "Grocery / Supermarket" },
  { value: "clothing",    label: "Clothing / Apparel" },
  { value: "other",       label: "Other" },
];

const schema = z.object({
  storeName: z.string().min(2, "Store name must be at least 2 characters"),
  storeType: z.string().min(1, "Select a store type"),
  name:      z.string().min(2, "Your name must be at least 2 characters"),
  email:     z.string().email("Enter a valid email"),
  password:  z.string().min(6, "Password must be at least 6 characters"),
  confirm:   z.string(),
}).refine(d => d.password === d.confirm, {
  message: "Passwords don't match",
  path: ["confirm"],
});

export default function SetupPage() {
  const nav = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { storeType: "general" },
  });

  // If store is already set up, redirect to login
  useEffect(() => {
    setupApi.status().then(res => {
      if (!res.data?.needsSetup) nav("/login", { replace: true });
    }).catch(() => {}).finally(() => setChecking(false));
  }, []);

  const onSubmit = async ({ storeName, storeType, name, email, password }) => {
    setLoading(true);
    try {
      const res = await authApi.register({ name, email, password, storeName, storeType });
      setAuth({
        user: res.data.user,
        organization: res.data.organization,
        accessToken: res.data.accessToken,
      });
      toast.success("Store created! Welcome to StockKart.");
      nav("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Setup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-gray-950 flex">
      {/* Left branding */}
      <div className="hidden lg:flex flex-col justify-between w-[380px] bg-primary-600 p-10 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm">S</div>
          <span className="text-white font-semibold text-lg tracking-tight">StockKart</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white leading-snug mb-3">
            Welcome!<br />Let's set up<br />your store.
          </h2>
          <p className="text-primary-100 text-sm leading-relaxed">
            This takes less than a minute. You only do this once.
          </p>
          <div className="mt-8 space-y-3">
            {["Your data stays on this computer", "Works without internet", "No monthly fees on desktop"].map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-white/90">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="text-primary-200 text-xs">© 2026 StockKart. All rights reserved.</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="font-bold text-gray-900 text-lg">StockKart</span>
          </div>

          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight mb-1">Set up your store</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Already set up?{" "}
            <button onClick={() => nav("/migrate")} className="text-primary-600 font-medium hover:underline">
              Import from online store instead
            </button>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Store Name */}
            <div>
              <label className="field-label">Store Name</label>
              <input placeholder="My General Store" className={`input ${errors.storeName ? "input-error" : ""}`} {...register("storeName")} />
              {errors.storeName && <p className="mt-1 text-xs text-red-500">{errors.storeName.message}</p>}
            </div>

            {/* Store Type */}
            <div>
              <label className="field-label">Store Type</label>
              <select className={`input ${errors.storeType ? "input-error" : ""}`} {...register("storeType")}>
                {STORE_TYPE_LABELS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {errors.storeType && <p className="mt-1 text-xs text-red-500">{errors.storeType.message}</p>}
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Your Admin Account</p>
            </div>

            {/* Name */}
            <div>
              <label className="field-label">Your Name</label>
              <input placeholder="Rahul Sharma" className={`input ${errors.name ? "input-error" : ""}`} {...register("name")} />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="field-label">Email Address</label>
              <input type="email" placeholder="you@example.com" autoComplete="email" className={`input ${errors.email ? "input-error" : ""}`} {...register("email")} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  className={`input pr-10 ${errors.password ? "input-error" : ""}`}
                  {...register("password")}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute inset-y-0 right-3 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="field-label">Confirm Password</label>
              <input
                type="password"
                placeholder="Repeat password"
                autoComplete="new-password"
                className={`input ${errors.confirm ? "input-error" : ""}`}
                {...register("confirm")}
              />
              {errors.confirm && <p className="mt-1 text-xs text-red-500">{errors.confirm.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-primary py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <ArrowRight size={16} />
              }
              {loading ? "Setting up…" : "Create My Store"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
