import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff, Package } from "lucide-react";
import { Input, Button } from "../../components/ui/index.jsx";
import { useAuthStore } from "../../stores/authStore.js";
import { authApi, orgApi } from "../../api/index.js";
import toast from "react-hot-toast";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export default function LoginPage() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const nav = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      setAuth({ user: res.data.user, organization: res.data.organization, accessToken: res.data.accessToken });
      toast.success(`Welcome back, ${res.data.user.name}!`);
      nav("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 mb-4 shadow-lg">
            <Package size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sign in to your account</h1>
          <p className="text-gray-500 mt-1 text-sm">Don't have one? <Link to="/register" className="text-primary-600 font-medium hover:underline">Create free account</Link></p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Email address" type="email" placeholder="you@store.com" error={errors.email?.message} {...register("email")} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input type={show ? "text" : "password"} placeholder="••••••••"
                  className={"w-full px-3 py-2 pr-10 rounded-lg border text-sm outline-none transition " + (errors.password ? "border-red-400" : "border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100")}
                  {...register("password")} />
                <button type="button" onClick={() => setShow(s=>!s)} className="absolute inset-y-0 right-3 text-gray-400">
                  {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <div className="flex justify-end"><Link to="/forgot-password" className="text-xs text-primary-600 hover:underline">Forgot password?</Link></div>
            <Button type="submit" className="w-full" loading={loading}>Sign in</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
