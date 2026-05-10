import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { planApi, subscriptionApi } from "../../api/index.js";
import { useSubscription } from "../../hooks/useSubscription.js";
import { useAuthStore } from "../../stores/authStore.js";
import { Check, Zap, Lock, Crown, Star, AlertCircle, CreditCard, RefreshCw } from "lucide-react";
import { PLAN_META } from "../../utils/featureKeys.js";
import toast from "react-hot-toast";

const PLAN_ICONS = { free: Star, starter: Zap, pro: Crown };
const CYCLE_LABELS = { monthly: "Monthly", yearly: "Yearly", grace: "Trial" };

function StatusBadge({ status }) {
  const styles = {
    active:    "bg-emerald-50 text-emerald-700",
    expired:   "bg-red-50 text-red-700",
    cancelled: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${styles[status] || styles.active}`}>
      {status}
    </span>
  );
}

function PlanCard({ plan, currentPlan, effectivePlan, isSuperAdmin, orgId, onAssign }) {
  const isActive = plan.slug === effectivePlan;
  const Icon = PLAN_ICONS[plan.slug] || Zap;

  return (
    <div className={`relative rounded-2xl border-2 p-6 transition-all ${
      isActive ? "border-primary-500 bg-primary-50/40" : "border-gray-200 bg-white hover:border-gray-300"
    }`}>
      {isActive && (
        <span className="absolute -top-3 left-6 px-3 py-0.5 bg-primary-600 text-white text-xs font-bold rounded-full">
          Current Plan
        </span>
      )}
      {plan.slug === "pro" && !isActive && (
        <span className="absolute -top-3 right-6 px-3 py-0.5 bg-amber-500 text-white text-xs font-bold rounded-full">
          Most Popular
        </span>
      )}

      <div className="flex items-start gap-4 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isActive ? "bg-primary-100" : "bg-gray-100"
        }`}>
          <Icon size={20} className={isActive ? "text-primary-600" : "text-gray-500"} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{plan.name}</h3>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-bold text-gray-900">
              {plan.priceMonthly === 0 ? "Free" : `₹${plan.priceMonthly.toLocaleString("en-IN")}`}
            </span>
            {plan.priceMonthly > 0 && <span className="text-sm text-gray-500">/month</span>}
          </div>
          {plan.priceYearly > 0 && (
            <p className="text-xs text-emerald-600 mt-0.5">
              ₹{plan.priceYearly.toLocaleString("en-IN")}/year · Save {Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100)}%
            </p>
          )}
        </div>
      </div>

      <ul className="space-y-2 mb-5">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <Check size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            {f}
          </li>
        ))}
        {plan.limitations.map((l, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
            <Lock size={12} className="mt-0.5 flex-shrink-0" />
            {l}
          </li>
        ))}
      </ul>

      {isSuperAdmin ? (
        <button
          onClick={() => onAssign(plan.slug)}
          className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors ${
            isActive
              ? "bg-gray-100 text-gray-400 cursor-default"
              : "bg-primary-600 text-white hover:bg-primary-700"
          }`}
          disabled={isActive}
        >
          {isActive ? "Active" : `Assign ${plan.name}`}
        </button>
      ) : (
        <a
          href={`https://wa.me/918979842966?text=${encodeURIComponent(`Hi, I'd like to upgrade to the ${plan.name} plan for StockKart.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`block w-full py-2 rounded-xl text-sm font-semibold text-center transition-colors ${
            isActive
              ? "bg-gray-100 text-gray-400 cursor-default pointer-events-none"
              : "bg-primary-600 text-white hover:bg-primary-700"
          }`}
        >
          {isActive ? "Current Plan" : `Upgrade to ${plan.name}`}
        </a>
      )}
    </div>
  );
}

// ── SuperAdmin manage subscription panel ──────────────────────────────────────
function AdminPanel({ orgId }) {
  const qc = useQueryClient();
  const { data: subData } = useQuery({ queryKey: ["sub-admin", orgId], queryFn: () => subscriptionApi.adminGet(orgId) });
  const sub = subData?.data;

  const [payForm, setPayForm] = useState({ amount: "", method: "upi", reference: "", notes: "" });
  const [waiverForm, setWaiverForm] = useState({ effectivePlanOverride: "", reason: "" });

  const payMut = useMutation({
    mutationFn: d => subscriptionApi.adminPayment(orgId, d),
    onSuccess: () => { toast.success("Payment recorded"); qc.invalidateQueries(["sub-admin", orgId]); setPayForm({ amount: "", method: "upi", reference: "", notes: "" }); },
    onError: e => toast.error(e.response?.data?.message || "Error"),
  });

  const waiverMut = useMutation({
    mutationFn: d => subscriptionApi.adminSetWaiver(orgId, d),
    onSuccess: () => { toast.success("Waiver updated"); qc.invalidateQueries(["sub-admin", orgId]); qc.invalidateQueries(["subscription-my"]); },
    onError: e => toast.error(e.response?.data?.message || "Error"),
  });

  if (!sub) return null;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Current Subscription</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Plan:</span> <span className="font-medium">{sub.planSlug}</span></div>
          <div><span className="text-gray-500">Status:</span> <StatusBadge status={sub.status} /></div>
          <div><span className="text-gray-500">Effective Plan:</span> <span className="font-semibold text-primary-600">{sub.effectivePlan}</span></div>
          <div><span className="text-gray-500">Cycle:</span> <span className="font-medium">{CYCLE_LABELS[sub.billingCycle] || sub.billingCycle}</span></div>
          {sub.endDate && <div><span className="text-gray-500">Expires:</span> <span className="font-medium">{new Date(sub.endDate).toLocaleDateString("en-IN")}</span></div>}
          {sub.overrideReason && <div className="col-span-2"><span className="text-gray-500">Waiver note:</span> <span className="italic text-gray-600">{sub.overrideReason}</span></div>}
        </div>
      </div>

      {/* Waiver control */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Crown size={16} className="text-amber-600" /> Plan Override (Waiver)</h3>
        <div className="flex gap-3 flex-wrap">
          <select className="flex-1 min-w-[150px] px-3 py-2 text-sm border border-amber-200 rounded-lg bg-white outline-none focus:border-primary-400"
            value={waiverForm.effectivePlanOverride}
            onChange={e => setWaiverForm(s => ({ ...s, effectivePlanOverride: e.target.value }))}>
            <option value="">Remove waiver (use actual plan)</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
          </select>
          <input className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-amber-200 rounded-lg bg-white outline-none focus:border-primary-400"
            placeholder="Reason for waiver (optional)"
            value={waiverForm.reason}
            onChange={e => setWaiverForm(s => ({ ...s, reason: e.target.value }))} />
          <button onClick={() => waiverMut.mutate(waiverForm)} disabled={waiverMut.isPending}
            className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50">
            {waiverMut.isPending ? "Saving…" : "Apply"}
          </button>
        </div>
      </div>

      {/* Record payment */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><CreditCard size={16} /> Record Payment</h3>
        <div className="grid grid-cols-2 gap-3">
          <input className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-400" type="number" placeholder="Amount (₹)" value={payForm.amount} onChange={e => setPayForm(s => ({ ...s, amount: e.target.value }))} />
          <select className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-400 bg-white" value={payForm.method} onChange={e => setPayForm(s => ({ ...s, method: e.target.value }))}>
            <option value="upi">UPI</option>
            <option value="bank">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
          <input className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-400" placeholder="UTR / Reference" value={payForm.reference} onChange={e => setPayForm(s => ({ ...s, reference: e.target.value }))} />
          <input className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-400" placeholder="Notes (optional)" value={payForm.notes} onChange={e => setPayForm(s => ({ ...s, notes: e.target.value }))} />
        </div>
        <button className="mt-3 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          disabled={!payForm.amount || payMut.isPending}
          onClick={() => payMut.mutate({ ...payForm, amount: +payForm.amount, cycle: sub.billingCycle })}>
          {payMut.isPending ? "Saving…" : "Record Payment"}
        </button>
      </div>

      {/* Payment history */}
      {sub.payments?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Payment History</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-500 border-b"><th className="pb-2 text-left">Date</th><th className="pb-2 text-left">Amount</th><th className="pb-2 text-left">Method</th><th className="pb-2 text-left">Reference</th></tr></thead>
            <tbody>{sub.payments.map((p, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 text-gray-600">{new Date(p.paidAt).toLocaleDateString("en-IN")}</td>
                <td className="py-2 font-medium">₹{p.amount?.toLocaleString("en-IN")}</td>
                <td className="py-2 text-gray-600">{p.method}</td>
                <td className="py-2 text-gray-500 font-mono text-xs">{p.reference || "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const { user, organization } = useAuthStore();
  const isSuperAdmin = user?.role === "superAdmin";
  const { subscription, effectivePlan, status, limits, isLoading } = useSubscription();
  const qc = useQueryClient();

  const { data: plansData } = useQuery({ queryKey: ["plans"], queryFn: planApi.list });
  const plans = plansData?.data || [];

  const assignMut = useMutation({
    mutationFn: (slug) => subscriptionApi.adminSetPlan(organization?._id, {
      planSlug: slug, billingCycle: "monthly",
      startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }),
    onSuccess: () => { toast.success("Plan assigned"); qc.invalidateQueries(["subscription-my"]); qc.invalidateQueries(["sub-admin"]); },
    onError: e => toast.error(e.response?.data?.message || "Error"),
  });

  const daysLeft = subscription?.endDate
    ? Math.max(0, Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your StockKart plan and billing</p>
      </div>

      {/* Current status banner */}
      {subscription && (
        <div className={`rounded-xl p-4 flex items-start gap-3 ${
          status === "expired"
            ? "bg-red-50 border border-red-200"
            : daysLeft !== null && daysLeft <= 7
              ? "bg-amber-50 border border-amber-200"
              : "bg-emerald-50 border border-emerald-100"
        }`}>
          <AlertCircle size={18} className={status === "expired" ? "text-red-500" : daysLeft <= 7 ? "text-amber-500" : "text-emerald-500"} />
          <div className="text-sm">
            <p className="font-semibold text-gray-800">
              {status === "expired"
                ? "Your subscription has expired"
                : `You are on the ${PLAN_META[effectivePlan]?.label || effectivePlan} plan`}
              {subscription.effectivePlanOverride && (
                <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Waiver active</span>
              )}
            </p>
            {daysLeft !== null && status !== "expired" && (
              <p className="text-gray-500 mt-0.5">
                {daysLeft === 0 ? "Expires today" : `${daysLeft} days remaining`}
                {subscription.billingCycle === "grace" && " · Pro trial"}
              </p>
            )}
            {isLoading && <RefreshCw size={12} className="animate-spin inline ml-1" />}
          </div>
        </div>
      )}

      {/* Limits bar */}
      {limits && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">Products</p>
            <p className="text-lg font-bold text-gray-900">
              {limits.products === -1 ? "Unlimited" : `Up to ${limits.products}`}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">Team Members</p>
            <p className="text-lg font-bold text-gray-900">
              {limits.users === -1 ? "Unlimited" : `Up to ${limits.users}`}
            </p>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {plans.map(plan => (
            <PlanCard
              key={plan.slug}
              plan={plan}
              currentPlan={subscription?.planSlug}
              effectivePlan={effectivePlan}
              isSuperAdmin={isSuperAdmin}
              orgId={organization?._id}
              onAssign={(slug) => assignMut.mutate(slug)}
            />
          ))}
        </div>
      </div>

      {/* How to upgrade info for non-superadmin */}
      {!isSuperAdmin && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm text-gray-600">
          <p className="font-semibold text-gray-800 mb-1">How to upgrade?</p>
          <p>Pay via UPI / bank transfer and share the screenshot with us on WhatsApp or email. We'll activate your plan within 1 hour.</p>
          <div className="flex gap-4 mt-3">
            <a href="https://wa.me/918979842966" target="_blank" rel="noopener noreferrer"
              className="text-primary-600 font-medium hover:underline">WhatsApp us →</a>
            <a href="mailto:support@stockkart.in"
              className="text-primary-600 font-medium hover:underline">Email support →</a>
          </div>
        </div>
      )}

      {/* SuperAdmin panel */}
      {isSuperAdmin && organization?._id && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Admin Controls</h2>
          <AdminPanel orgId={organization._id} />
        </div>
      )}
    </div>
  );
}
