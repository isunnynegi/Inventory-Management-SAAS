import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Package } from "lucide-react";
import { Input, Button, Select } from "../../components/ui/index.jsx";
import { useAuthStore } from "../../stores/authStore.js";
import { authApi } from "../../api/index.js";
import toast from "react-hot-toast";
import { useState } from "react";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email(),
  password: z.string().min(8, "Min 8 characters").regex(/[A-Z]/, "Need uppercase").regex(/\d/, "Need number"),
  organizationName: z.string().min(2, "Store name required"),
  storeType: z.string(),
});

const storeTypes = ["general","electronics","sanitary","hardware","pharmacy","grocery","clothing","other"];

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const nav = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { storeType: "general" } });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authApi.register(data);
      setAuth({ user: res.data.user, organization: res.data.organization, accessToken: res.data.accessToken });
      toast.success("Account created! Welcome aboard 🎉");
      nav("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 mb-4 shadow-lg"><Package size={26} className="text-white"/></div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-1 text-sm">Already registered? <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link></p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Your Name" placeholder="John Doe" error={errors.name?.message} {...register("name")} />
            <Input label="Email Address" type="email" placeholder="john@store.com" error={errors.email?.message} {...register("email")} />
            <Input label="Password" type="password" placeholder="Min. 8 characters" error={errors.password?.message} {...register("password")} />
            <Input label="Store / Business Name" placeholder="Acme General Store" error={errors.organizationName?.message} {...register("organizationName")} />
            <Select label="Store Type" error={errors.storeType?.message} {...register("storeType")}>
              {storeTypes.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </Select>
            <Button type="submit" className="w-full mt-2" loading={loading}>Create account — it's free</Button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">No credit card required · 14-day free trial</p>
      </div>
    </div>
  );
}
