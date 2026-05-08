import { useState } from "react";
import { Link, useOutletContext, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useCustomerStore } from "../../stores/storefrontStore.js";
import toast from "react-hot-toast";

export default function CustomerLoginPage() {
  const { store, slug, api } = useOutletContext();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get("next") || `/store/${slug}`;
  const setCustomer = useCustomerStore(s => s.setCustomer);

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.login(form);
      setCustomer({ customer: res.data.customer, accessToken: res.data.accessToken });
      window.__sfAccessToken = res.data.accessToken;
      toast.success(`Welcome back, ${res.data.customer.name}!`);
      nav(nextUrl, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto py-8">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Sign in</h1>
        <p className="text-sm text-gray-500 mb-6">
          New here?{" "}
          <Link to={`/store/${slug}/register${nextUrl !== `/store/${slug}` ? `?next=${nextUrl}` : ""}`}
            className="text-primary-600 font-medium hover:underline">
            Create an account
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email address</label>
            <input type="email" autoComplete="email" placeholder="you@email.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className={`w-full px-3 py-2 text-sm border rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition ${errors.email ? "border-red-400" : "border-gray-200"}`} />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} autoComplete="current-password" placeholder="••••••••"
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
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
