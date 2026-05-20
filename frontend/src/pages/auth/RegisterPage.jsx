import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore.js";
import { authApi, orgApi } from "../../api/index.js";
import toast from "react-hot-toast";
import { useState } from "react";
import { Eye, EyeOff, Store, Monitor } from "lucide-react";
import { SearchableSelect } from "../../components/ui/index.jsx";
import { isElectron } from "../../utils/platform.js";

const electron = isElectron();

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

// Display labels for each backend enum value — extend here when new types are added
const STORE_TYPE_LABELS = {
  general:     "General Store",
  electronics: "Electronics",
  electrical:  "Electrical / Wiring",
  sanitary:    "Sanitary / Plumbing",
  hardware:    "Hardware / Tools",
  pharmacy:    "Pharmacy / Medical",
  grocery:     "Grocery / Supermarket",
  clothing:    "Clothing / Apparel",
  other:       "Other",
};

const labelFor = (value) =>
  STORE_TYPE_LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1);

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [storeCode, setStoreCode] = useState("");
  const { setAuth } = useAuthStore();
  const nav = useNavigate();

  const { data: storeTypesRes } = useQuery({
    queryKey: ["store-types"],
    queryFn: orgApi.storeTypes,
    staleTime: Infinity,
  });
  const storeTypes = storeTypesRes?.data ?? Object.keys(STORE_TYPE_LABELS);

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    mode: "onChange",
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
    <div className="min-h-screen bg-[#fafbfc] dark:bg-gray-950 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm">S</div>
          <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">StockKart</span>
        </div>

        {electron && (
          <p className="text-sm text-primary-600 dark:text-primary-400 mb-4 flex items-center gap-1.5">
            <Monitor size={13} /> Desktop — offline mode
          </p>
        )}
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Create your account</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-8">
          Already registered?{" "}
          <Link to={electron ? "/welcome" : "/login"} className="text-primary-600 font-medium hover:underline">
            {electron ? "Go back" : "Sign in"}
          </Link>
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-7 shadow-sm">
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
                <Controller control={control} name="storeType" render={({ field }) => (
                  <SearchableSelect
                    options={storeTypes.map(v => ({ value: v, label: labelFor(v) }))}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )} />
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

        {!electron && (
          <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
              <Store size={13} /> Customer? Register with your store
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter store code (e.g. my-store)"
                value={storeCode}
                onChange={e => setStoreCode(e.target.value.trim().toLowerCase())}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
              <button
                type="button"
                disabled={!storeCode}
                onClick={() => nav(`/store/${storeCode}/register`)}
                className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                Go
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
