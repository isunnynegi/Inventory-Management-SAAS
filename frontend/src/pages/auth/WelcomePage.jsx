import { useNavigate } from "react-router-dom";
import { Monitor, LogIn, UserPlus } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const isLocalBackend = API_URL.includes("localhost") || API_URL.includes("127.0.0.1");

export default function WelcomePage() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-gray-950 flex">
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

      {/* Right panel — choice */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">StockKart</span>
          </div>

          <p className="text-sm text-primary-600 dark:text-primary-400 mb-6 flex items-center gap-1.5">
            <Monitor size={13} /> Desktop — offline mode
          </p>

          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight mb-2">
            Welcome to StockKart
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Already have an account or setting up for the first time?
          </p>

          {/* API URL badge — helps spot wrong builds immediately */}
          <div className={`mb-6 px-3 py-2 rounded-lg text-xs font-mono flex items-center gap-2 ${
            isLocalBackend
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          }`}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isLocalBackend ? "bg-emerald-500" : "bg-red-500"}`} />
            {API_URL}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => nav("/login")}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 border-primary-600 bg-primary-600 hover:bg-primary-700 hover:border-primary-700 text-white transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <LogIn size={18} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Sign In</p>
                <p className="text-xs text-white/75 mt-0.5">I already have an account</p>
              </div>
            </button>

            <button
              onClick={() => nav("/setup")}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-gray-750 text-gray-900 dark:text-gray-100 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 text-primary-600 dark:text-primary-400">
                <UserPlus size={18} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">Register</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Set up a new store on this device</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
