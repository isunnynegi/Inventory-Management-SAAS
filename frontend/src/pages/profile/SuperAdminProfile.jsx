import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck, Lock, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../../stores/authStore.js";
import { authApi } from "../../api/index.js";
import toast from "react-hot-toast";

export default function SuperAdminProfile() {
  const { user, setAuth, organization } = useAuthStore();
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);

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
    <div className="max-w-md mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <ShieldCheck size={20} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Platform Admin</h1>
          <p className="text-sm text-gray-500">{user?.name} · {user?.email}</p>
        </div>
      </div>

      {/* Admin info (read-only) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
        <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <ShieldCheck size={15} className="text-violet-600" /> Account Details
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input readOnly value={user?.name || ""}
              className="w-full px-3 py-2 text-sm border border-gray-100 bg-gray-50 rounded-lg text-gray-700 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input readOnly value={user?.email || ""}
              className="w-full px-3 py-2 text-sm border border-gray-100 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-100 rounded-lg">
              <ShieldCheck size={14} className="text-violet-600" />
              <span className="text-sm font-medium text-violet-700">Super Admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <Lock size={15} className="text-violet-600" /> Change Password
        </h2>
        <div className="space-y-3">
          {[["Current password", "current"], ["New password", "next"], ["Confirm new password", "confirm"]].map(([label, key]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={pwForm[key]}
                  onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 pr-10 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition" />
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
          className="mt-4 px-5 py-2 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-60 transition-colors">
          {pwMutation.isLoading ? "Changing…" : "Change password"}
        </button>
      </div>
    </div>
  );
}
