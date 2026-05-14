import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { User, Lock, Building2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { useAuthStore } from "../../stores/authStore.js";
import { authApi } from "../../api/index.js";
import toast from "react-hot-toast";

function PersonalTab() {
  const { user, organization, setAuth } = useAuthStore();
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () => authApi.updateMe(form),
    onSuccess: (res) => {
      setAuth({ user: res.data.user, organization, accessToken: window.__accessToken || "" });
      toast.success("Profile updated");
    },
    onError: err => toast.error(err.response?.data?.message || "Update failed"),
  });

  const pwMutation = useMutation({
    mutationFn: () => {
      if (pwForm.next !== pwForm.confirm) throw new Error("Passwords do not match");
      if (pwForm.next.length < 8) throw new Error("Password must be at least 8 characters");
      return authApi.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.next });
    },
    onSuccess: () => { setPwForm({ current: "", next: "", confirm: "" }); toast.success("Password changed"); },
    onError: err => toast.error(err.message || err.response?.data?.message || "Failed"),
  });

  return (
    <div className="space-y-5">
      {/* Personal info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <User size={15} className="text-primary-600" /> Personal Info
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" value={user?.email || ""} readOnly
              className="w-full px-3 py-2 text-sm border border-gray-100 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+91 9999999999"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <input readOnly value={user?.role === "superAdmin" ? "Super Admin" : user?.role === "admin" ? "Admin" : "Staff"}
              className="w-full px-3 py-2 text-sm border border-gray-100 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed" />
          </div>
        </div>
        <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isLoading}
          className="mt-4 px-5 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors">
          {updateMutation.isLoading ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <Lock size={15} className="text-primary-600" /> Change Password
        </h2>
        <div className="space-y-3">
          {[["Current password", "current"], ["New password", "next"], ["Confirm new password", "confirm"]].map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={pwForm[key]}
                  onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 pr-10 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition" />
                {key === "current" && (
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute inset-y-0 right-3 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => pwMutation.mutate()} disabled={pwMutation.isLoading || !pwForm.current || !pwForm.next}
          className="mt-4 px-5 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors">
          {pwMutation.isLoading ? "Changing…" : "Change password"}
        </button>
      </div>
    </div>
  );
}

function BusinessTab() {
  const { organization } = useAuthStore();
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h2 className="font-semibold text-gray-900 text-sm mb-1 flex items-center gap-2">
        <Building2 size={15} className="text-primary-600" /> Business Info
      </h2>
      <p className="text-xs text-gray-400">Manage full store details in Settings.</p>

      <div className="grid grid-cols-2 gap-3">
        {[
          ["Store name", organization?.storeName || organization?.name],
          ["Store type", organization?.storeType],
          ["Email", organization?.email],
          ["Phone", organization?.phone],
          ["GSTIN", organization?.gstin || "—"],
          ["Currency", `${organization?.currencySymbol || "₹"} (${organization?.currency || "INR"})`],
        ].map(([label, val]) => (
          <div key={label}>
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-gray-900">{val || "—"}</p>
          </div>
        ))}
        {organization?.address && (
          <div className="col-span-2">
            <p className="text-xs text-gray-500 mb-0.5">Address</p>
            <p className="text-sm text-gray-900">
              {[organization.address.street, organization.address.city, organization.address.state, organization.address.zip]
                .filter(Boolean).join(", ")}
            </p>
          </div>
        )}
      </div>

      <Link to="/settings" className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:underline mt-2">
        Edit in Settings <ExternalLink size={12} />
      </Link>
    </div>
  );
}

export default function StoreOwnerProfile() {
  const [tab, setTab] = useState("personal");
  const { user } = useAuthStore();

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">{user?.name} · {user?.email}</p>
      </div>

      <div className="flex border-b border-gray-100 mb-5">
        {[{ id: "personal", label: "Personal", icon: User }, { id: "business", label: "Business", icon: Building2 }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? "border-primary-600 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "personal" ? <PersonalTab /> : <BusinessTab />}
    </div>
  );
}
