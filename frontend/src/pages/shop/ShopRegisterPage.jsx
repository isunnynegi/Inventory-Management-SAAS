import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useShopCustomerStore } from "../../stores/shopStore.js";
import { shopApi } from "../../api/shopApi.js";
import toast from "react-hot-toast";

export default function ShopRegisterPage() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") || "/shop";
  const setCustomer = useShopCustomerStore(s => s.setCustomer);

  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name || form.name.trim().length < 2) e.name = "Name must be at least 2 characters";
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password || form.password.length < 8) e.password = "Password must be at least 8 characters";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await shopApi.register(form);
      setCustomer({ customer: res.data.customer, accessToken: res.data.accessToken });
      toast.success("Account created!");
      nav(next, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto py-8">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Create account</h1>
        <p className="text-sm text-gray-500 mb-6">
          Already have one?{" "}
          <Link to={`/shop/login${next !== "/shop" ? `?next=${next}` : ""}`}
            className="text-primary-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
            <input type="text" autoComplete="name" placeholder="Your name"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition ${errors.name ? "border-red-400" : "border-gray-200"}`} />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email address</label>
            <input type="email" autoComplete="email" placeholder="you@email.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition ${errors.email ? "border-red-400" : "border-gray-200"}`} />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone <span className="text-gray-400">(optional)</span></label>
            <input type="tel" autoComplete="tel" placeholder="+91 9999999999"
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} autoComplete="new-password" placeholder="Minimum 8 characters"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className={`w-full px-3 pr-10 py-2 text-sm border rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition ${errors.password ? "border-red-400" : "border-gray-200"}`} />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute inset-y-0 right-3 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Create account
          </button>
        </form>
      </div>
    </div>
  );
}
