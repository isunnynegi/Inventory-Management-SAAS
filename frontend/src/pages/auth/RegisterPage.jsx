import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore.js";
import { authApi } from "../../api/index.js";
import toast from "react-hot-toast";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Include an uppercase letter")
    .regex(/\d/, "Include a number"),
  organizationName: z.string().min(2, "Store name is required"),
  storeType: z.string(),
});

const STORE_TYPES = [
  { v: "general",     l: "General Store" },
  { v: "electronics", l: "Electronics" },
  { v: "grocery",     l: "Grocery / Supermarket" },
  { v: "pharmacy",    l: "Pharmacy / Medical" },
  { v: "clothing",    l: "Clothing / Apparel" },
  { v: "hardware",    l: "Hardware / Tools" },
  { v: "sanitary",    l: "Sanitary / Plumbing" },
  { v: "other",       l: "Other" },
];

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { setAuth } = useAuthStore();
  const nav = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { storeType: "general" },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authApi.register(data);
      setAuth({ user: res.data.user, organization: res.data.organization, accessToken: res.data.accessToken });
      toast.success("Account created! Welcome aboard 🎉");
      nav("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm">S</div>
          <span className="font-bold text-gray-900 text-lg">StockKart</span>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Create your account</h1>
        <p className="text-sm text-gray-500 mt-1 mb-8">
          Already registered? <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
        </p>

        <div className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="field-label">Your name</label>
                <input type="text" placeholder="Rahul Sharma" autoComplete="name"
                  className={`input ${errors.name ? "input-error" : ""}`}
                  {...register("name")} />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="field-label">Email address</label>
                <input type="email" placeholder="rahul@mystore.com" autoComplete="email"
                  className={`input ${errors.email ? "input-error" : ""}`}
                  {...register("email")} />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="field-label">Password</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} placeholder="Min. 8 characters" autoComplete="new-password"
                    className={`input pr-10 ${errors.password ? "input-error" : ""}`}
                    {...register("password")} />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute inset-y-0 right-3 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
              </div>

              <div>
                <label className="field-label">Store / business name</label>
                <input type="text" placeholder="Acme General Store"
                  className={`input ${errors.organizationName ? "input-error" : ""}`}
                  {...register("organizationName")} />
                {errors.organizationName && <p className="mt-1 text-xs text-red-500">{errors.organizationName.message}</p>}
              </div>

              <div>
                <label className="field-label">Store type</label>
                <select className="input appearance-none bg-white" {...register("storeType")}
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: "30px" }}>
                  {STORE_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-primary py-2.5 text-sm font-semibold mt-2 flex items-center justify-center gap-2 disabled:opacity-60">
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Create account — it's free
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">No credit card required · 14-day free trial</p>
      </div>
    </div>
  );
}
