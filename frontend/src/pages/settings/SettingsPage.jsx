import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "../../api/index.js";
import { Card, Button, Input } from "../../components/ui/index.jsx";
import { useAuthStore } from "../../stores/authStore.js";
import toast from "react-hot-toast";
import { Globe, Copy, ExternalLink } from "lucide-react";

const STORE_TYPE_LABELS = {
  general: "General", electronics: "Electronics", electrical: "Electrical",
  sanitary: "Sanitary", hardware: "Hardware", pharmacy: "Pharmacy",
  grocery: "Grocery", clothing: "Clothing", other: "Other",
};

const currencies = [{ code: "INR", sym: "₹" }, { code: "USD", sym: "$" }, { code: "EUR", sym: "€" }, { code: "GBP", sym: "£" }];
const TABS = ["General", "Storefront"];

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-gray-300 dark:hover:border-gray-500`}
      style={{ borderColor: checked ? "#4F46E5" : undefined, background: checked ? "#EEF2FF" : undefined }}>
      <div>
        <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="relative flex-shrink-0 ml-4" onClick={e => e.stopPropagation()}>
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} readOnly />
        <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-primary-600 transition-colors" onClick={() => onChange(!checked)} />
        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : ""}`} onClick={() => onChange(!checked)} />
      </div>
    </label>
  );
}

function StorefrontSettings({ organization, updateOrg }) {
  const sf = organization?.storefront || {};
  const storeUrl = `${window.location.origin}/store/${organization?.slug}`;

  const [form, setForm] = useState({
    enabled: sf.enabled ?? false,
    paymentMethods: sf.paymentMethods ?? ["cash"],
    deliveryEnabled: sf.deliveryEnabled ?? true,
    pickupEnabled: sf.pickupEnabled ?? true,
    deliveryCharge: sf.deliveryCharge ?? 0,
    freeDeliveryAbove: sf.freeDeliveryAbove ?? 0,
    upiId: sf.upiId ?? "",
    upiName: sf.upiName ?? "",
    branding: {
      primaryColor: sf.branding?.primaryColor ?? "",
      tagline: sf.branding?.tagline ?? "",
      bannerTitle: sf.branding?.bannerTitle ?? "",
      bannerSubtitle: sf.branding?.bannerSubtitle ?? "",
      bannerImage: sf.branding?.bannerImage ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: () => orgApi.updateStorefront(form),
    onSuccess: ({ data }) => {
      toast.success("Storefront settings saved!");
      updateOrg({ ...organization, storefront: data });
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed to save"),
  });

  const togglePayment = (method) => {
    setForm(f => {
      const methods = f.paymentMethods.includes(method)
        ? f.paymentMethods.filter(m => m !== method)
        : [...f.paymentMethods, method];
      return { ...f, paymentMethods: methods };
    });
  };

  const PAYMENT_METHODS = [
    { key: "cash", label: "Cash on Delivery", desc: "Customer pays cash at delivery or pickup" },
    { key: "upi", label: "Manual UPI", desc: "Customer pays to your UPI ID and enters UTR" },
    { key: "card", label: "Card / Netbanking (Juspay)", desc: "Online payment via Juspay gateway" },
  ];

  return (
    <div className="space-y-5">
      {/* Enable / URL */}
      <Card className="p-6">
        <Toggle
          checked={form.enabled}
          onChange={v => setForm(f => ({ ...f, enabled: v }))}
          label="Enable Online Store"
          description="Allow customers to browse and purchase from your public store URL"
        />
        {form.enabled && (
          <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center gap-3">
            <Globe size={16} className="text-primary-600 dark:text-primary-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-primary-700 dark:text-primary-300 mb-0.5">Your store URL</p>
              <p className="font-mono text-sm text-primary-800 dark:text-primary-200 truncate">{storeUrl}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => { navigator.clipboard.writeText(storeUrl); toast.success("URL copied!"); }}
                className="p-1.5 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-800/30 rounded-lg transition-colors" title="Copy URL">
                <Copy size={14} />
              </button>
              <a href={storeUrl} target="_blank" rel="noopener noreferrer"
                className="p-1.5 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-800/30 rounded-lg transition-colors" title="Open store">
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        )}
      </Card>

      {/* Fulfillment */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Fulfillment Options</h3>
        <div className="space-y-3">
          <Toggle
            checked={form.deliveryEnabled}
            onChange={v => setForm(f => ({ ...f, deliveryEnabled: v }))}
            label="Home Delivery"
            description="Offer delivery to customer's address"
          />
          <Toggle
            checked={form.pickupEnabled}
            onChange={v => setForm(f => ({ ...f, pickupEnabled: v }))}
            label="Store Pickup"
            description="Allow customers to pick up from your store"
          />
        </div>
        {form.deliveryEnabled && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Charge (₹)</label>
              <input type="number" min="0" value={form.deliveryCharge}
                onChange={e => setForm(f => ({ ...f, deliveryCharge: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-primary-500 bg-white dark:bg-gray-800 dark:text-gray-100 transition" />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Set 0 for free delivery</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Free Delivery Above (₹)</label>
              <input type="number" min="0" value={form.freeDeliveryAbove}
                onChange={e => setForm(f => ({ ...f, freeDeliveryAbove: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-primary-500 bg-white dark:bg-gray-800 dark:text-gray-100 transition" />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Set 0 to always charge delivery</p>
            </div>
          </div>
        )}
      </Card>

      {/* Payment methods */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Payment Methods</h3>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Choose which payment options to show customers at checkout</p>
        <div className="space-y-3">
          {PAYMENT_METHODS.map(({ key, label, desc }) => (
            <Toggle
              key={key}
              checked={form.paymentMethods.includes(key)}
              onChange={() => togglePayment(key)}
              label={label}
              description={desc}
            />
          ))}
        </div>

        {/* UPI settings */}
        {form.paymentMethods.includes("upi") && (
          <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl">
            <div className="col-span-2">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3">UPI Settings</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Your UPI ID</label>
              <input type="text" placeholder="yourstore@upi" value={form.upiId}
                onChange={e => setForm(f => ({ ...f, upiId: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-primary-500 bg-white dark:bg-gray-800 dark:text-gray-100 transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Merchant / Display Name</label>
              <input type="text" placeholder="Your Store Name" value={form.upiName}
                onChange={e => setForm(f => ({ ...f, upiName: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-primary-500 bg-white dark:bg-gray-800 dark:text-gray-100 transition" />
            </div>
            <p className="col-span-2 text-xs text-amber-700 dark:text-amber-400">
              Customers will see your UPI ID on the order page. They pay manually and enter the UTR number. You confirm payment from the Storefront Orders page.
            </p>
          </div>
        )}
      </Card>

      {/* Branding */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Store Branding</h3>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Customize your storefront appearance</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.branding.primaryColor || "#4F46E5"}
                onChange={e => setForm(f => ({ ...f, branding: { ...f.branding, primaryColor: e.target.value } }))}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
              <input type="text" value={form.branding.primaryColor}
                onChange={e => setForm(f => ({ ...f, branding: { ...f.branding, primaryColor: e.target.value } }))}
                placeholder="#4F46E5"
                className="w-32 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-primary-500 bg-white dark:bg-gray-800 dark:text-gray-100 font-mono transition" />
              <p className="text-xs text-gray-400 dark:text-gray-500">Used as primary color on your store</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tagline</label>
            <input type="text" value={form.branding.tagline} maxLength={150}
              onChange={e => setForm(f => ({ ...f, branding: { ...f.branding, tagline: e.target.value } }))}
              placeholder="Fresh groceries delivered to your door"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-primary-500 bg-white dark:bg-gray-800 dark:text-gray-100 transition" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Banner Title</label>
              <input type="text" value={form.branding.bannerTitle} maxLength={100}
                onChange={e => setForm(f => ({ ...f, branding: { ...f.branding, bannerTitle: e.target.value } }))}
                placeholder="Welcome to Our Store"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-primary-500 bg-white dark:bg-gray-800 dark:text-gray-100 transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Banner Subtitle</label>
              <input type="text" value={form.branding.bannerSubtitle} maxLength={200}
                onChange={e => setForm(f => ({ ...f, branding: { ...f.branding, bannerSubtitle: e.target.value } }))}
                placeholder="Shop the best products at great prices"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-primary-500 bg-white dark:bg-gray-800 dark:text-gray-100 transition" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Banner Image URL</label>
            <input type="url" value={form.branding.bannerImage}
              onChange={e => setForm(f => ({ ...f, branding: { ...f.branding, bannerImage: e.target.value } }))}
              placeholder="https://example.com/banner.jpg"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:border-primary-500 bg-white dark:bg-gray-800 dark:text-gray-100 transition" />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Leave empty to use a color gradient banner</p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>Save Storefront Settings</Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { organization, updateOrg } = useAuthStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("General");

  const { register, handleSubmit, watch, formState: { errors } } = useForm({ mode: "onChange",
    defaultValues: {
      name: organization?.name ?? "",
      currency: organization?.currency ?? "INR",
      currencySymbol: organization?.currencySymbol ?? "₹",
      phone: organization?.phone ?? "",
      email: organization?.email ?? "",
      gstin: organization?.gstin ?? "",
      invoicePrefix: organization?.invoicePrefix ?? "INV",
      address: {
        street: organization?.address?.street ?? "",
        city: organization?.address?.city ?? "",
        state: organization?.address?.state ?? "",
        zip: organization?.address?.zip ?? "",
      },
      settings: {
        taxEnabled: organization?.settings?.taxEnabled ?? false,
        defaultTaxRate: organization?.settings?.defaultTaxRate ?? 0,
        lowStockAlert: organization?.settings?.lowStockAlert ?? true,
      },
    },
  });

  const taxEnabled = watch("settings.taxEnabled");

  const mutation = useMutation({
    mutationFn: (d) => orgApi.update(d),
    onSuccess: ({ data }) => {
      updateOrg(data);
      qc.invalidateQueries(["organization"]);
      toast.success("Settings saved!");
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed to save"),
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your store profile and preferences</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === tab ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "General" && (
        <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Store Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Input label="Store Name *" error={errors.name?.message} {...register("name", { required: "Required" })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store Type</label>
                  <div className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {STORE_TYPE_LABELS[organization?.storeType] ?? organization?.storeType ?? "—"}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Contact platform admin to change store type</p>
                </div>
                <Input label="GST/Tax ID" {...register("gstin")} />
                <Input label="Phone" {...register("phone")} />
                <Input label="Email" type="email" {...register("email")} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm outline-none bg-white dark:bg-gray-800 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-100" {...register("currency")}>
                    {currencies.map(c => <option key={c.code} value={c.code}>{c.code} ({c.sym})</option>)}
                  </select>
                </div>
                <Input label="Currency Symbol" {...register("currencySymbol")} />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Address</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><Input label="Street" {...register("address.street")} /></div>
                <Input label="City" {...register("address.city")} />
                <Input label="State" {...register("address.state")} />
                <Input label="ZIP Code" {...register("address.zip")} />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Tax Settings</h2>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">Choose how tax is applied across your store</p>
              <div className="space-y-4">
                <label className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-gray-300 dark:hover:border-gray-500`}
                  style={{ borderColor: taxEnabled ? "#4F46E5" : undefined, background: taxEnabled ? "#EEF2FF" : undefined }}>
                  <div>
                    <p className="font-medium text-sm text-gray-800 dark:text-gray-200">Enable store-wide tax rate</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {taxEnabled ? "All products use the default rate below (can override per product)" : "Tax rate is set individually on each product"}
                    </p>
                  </div>
                  <div className="relative flex-shrink-0 ml-4">
                    <input type="checkbox" className="sr-only peer" {...register("settings.taxEnabled")} />
                    <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-primary-600 transition-colors" />
                    <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                  </div>
                </label>
                {taxEnabled && (
                  <div className="max-w-xs pl-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Tax Rate</label>
                    <div className="relative">
                      <input type="number" min="0" max="100" step="0.01"
                        className="w-full px-3 py-2 pr-8 rounded-lg border border-gray-200 dark:border-gray-600 text-sm outline-none focus:border-primary-500 bg-white dark:bg-gray-800 dark:text-gray-100"
                        {...register("settings.defaultTaxRate", { valueAsNumber: true })} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">%</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Invoice Settings</h2>
              <Input label="Invoice Prefix" placeholder="INV" {...register("invoicePrefix")} />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Example: INV-202506-0001</p>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" loading={mutation.isPending}>Save Settings</Button>
            </div>
          </div>
        </form>
      )}

      {activeTab === "Storefront" && (
        <StorefrontSettings organization={organization} updateOrg={updateOrg} />
      )}
    </div>
  );
}
