import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../../stores/authStore.js";
import { authApi } from "../../api/index.js";
import toast from "react-hot-toast";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const nav = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm({ mode: "onChange", resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      setAuth({ user: res.data.user, organization: res.data.organization, accessToken: res.data.accessToken });
      toast.success(`Welcome back, ${res.data.user.name}!`);
      nav("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-primary-600 p-10 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm">S</div>
          <span className="text-white font-semibold text-lg tracking-tight">StockKart</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white leading-snug mb-3">
            Inventory management<br />built for Indian SMBs
          </h2>
          <p className="text-primary-100 text-sm leading-relaxed">
            GST-ready billing, multi-location stock, barcode scanning, and smart analytics — all in one place.
          </p>
          <div className="mt-8 space-y-3">
            {["GST invoicing & tax compliance", "Schema-driven product catalog", "Role-based team access"].map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-white/90">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="text-primary-200 text-xs">© 2026 StockKart. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="font-bold text-gray-900 text-lg">StockKart</span>
          </div>

          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Sign in</h1>
          <p className="text-sm text-gray-500 mt-1 mb-8">
            New here? <Link to="/register" className="text-primary-600 font-medium hover:underline">Create a free account</Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="field-label">Email address</label>
              <input
                type="email"
                placeholder="you@store.com"
                autoComplete="email"
                className={`input ${errors.email ? "input-error" : ""}`}
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="field-label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline">Forgot?</Link>
              </div>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`input pr-10 ${errors.password ? "input-error" : ""}`}
                  {...register("password")}
                />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute inset-y-0 right-3 text-gray-400 hover:text-gray-600 transition-colors">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-primary py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
