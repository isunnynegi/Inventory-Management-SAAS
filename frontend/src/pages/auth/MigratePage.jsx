import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowLeft, CheckCircle, Download } from "lucide-react";
import { setupApi } from "../../api/index.js";
import toast from "react-hot-toast";

const CLOUD_URL = "https://inventory-management-saas.onrender.com/api/v1";

const schema = z.object({
  cloudApiUrl: z.string().url("Enter a valid URL"),
  cloudEmail:  z.string().email("Enter a valid email"),
  cloudPassword: z.string().min(1, "Password is required"),
});

export default function MigratePage() {
  const nav = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null); // null | { counts, orgName }
  const [checking, setChecking] = useState(true);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { cloudApiUrl: CLOUD_URL },
  });

  // If already set up, redirect to login
  useEffect(() => {
    setupApi.status().then(res => {
      if (!res.data?.needsSetup) nav("/login", { replace: true });
    }).catch(() => {}).finally(() => setChecking(false));
  }, []);

  const onSubmit = async ({ cloudApiUrl, cloudEmail, cloudPassword }) => {
    setLoading(true);
    try {
      const res = await setupApi.migrate({ cloudApiUrl, cloudEmail, cloudPassword });
      setDone({ counts: res.data.counts, orgName: res.data.orgName });
      toast.success("Migration complete!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Migration failed. Check your credentials and try again.");
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
            Bring your<br />online store<br />offline.
          </h2>
          <p className="text-primary-100 text-sm leading-relaxed">
            Your products, customers, sales, and history — all imported to this computer.
          </p>
          <div className="mt-8 space-y-3">
            {[
              "All your existing data is copied",
              "Cloud store stays unchanged",
              "Log in with the same credentials",
            ].map(f => (
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

      {/* Right — form or success */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[400px]">
          <button onClick={() => nav("/setup")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 mb-6 transition-colors">
            <ArrowLeft size={14} /> Back to setup
          </button>

          {done ? (
            /* ── Success screen ── */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{done.orgName} is ready!</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">All your data has been imported successfully.</p>
              </div>

              {/* Import counts */}
              <div className="grid grid-cols-2 gap-2 text-left text-sm">
                {Object.entries(done.counts).filter(([k]) => k !== "organization").map(([key, val]) => (
                  <div key={key} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{val}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1 capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500">
                Log in with your cloud email and password.
              </p>

              <button
                onClick={() => nav("/login", { replace: true })}
                className="w-full btn-primary py-2.5 text-sm font-semibold"
              >
                Go to Login
              </button>
            </div>
          ) : (
            /* ── Form ── */
            <>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight mb-1">Import from online store</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Enter your StockKart online login details. Your data will be copied here.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="field-label">Cloud Server URL</label>
                  <input
                    className={`input font-mono text-xs ${errors.cloudApiUrl ? "input-error" : ""}`}
                    {...register("cloudApiUrl")}
                  />
                  {errors.cloudApiUrl && <p className="mt-1 text-xs text-red-500">{errors.cloudApiUrl.message}</p>}
                  <p className="mt-1 text-[11px] text-gray-400">Leave unchanged if you use the default StockKart cloud.</p>
                </div>

                <div>
                  <label className="field-label">Your Email</label>
                  <input
                    type="email"
                    placeholder="you@store.com"
                    autoComplete="email"
                    className={`input ${errors.cloudEmail ? "input-error" : ""}`}
                    {...register("cloudEmail")}
                  />
                  {errors.cloudEmail && <p className="mt-1 text-xs text-red-500">{errors.cloudEmail.message}</p>}
                </div>

                <div>
                  <label className="field-label">Your Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className={`input pr-10 ${errors.cloudPassword ? "input-error" : ""}`}
                      {...register("cloudPassword")}
                    />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      className="absolute inset-y-0 right-3 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.cloudPassword && <p className="mt-1 text-xs text-red-500">{errors.cloudPassword.message}</p>}
                </div>

                {loading && (
                  <div className="flex items-center gap-2 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                    <span className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin flex-shrink-0" />
                    <p className="text-sm text-primary-700 dark:text-primary-300">
                      Importing data from cloud — this may take a minute…
                    </p>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full btn-primary py-2.5 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                  <Download size={15} />
                  {loading ? "Importing…" : "Import My Store"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
