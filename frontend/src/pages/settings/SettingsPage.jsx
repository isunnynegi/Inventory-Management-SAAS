import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "../../api/index.js";
import { Card, Button, Input } from "../../components/ui/index.jsx";
import { useAuthStore } from "../../stores/authStore.js";
import toast from "react-hot-toast";

const STORE_TYPE_LABELS = {
  general: "General", electronics: "Electronics", electrical: "Electrical",
  sanitary: "Sanitary", hardware: "Hardware", pharmacy: "Pharmacy",
  grocery: "Grocery", clothing: "Clothing", other: "Other",
};

const currencies = [{ code: "INR", sym: "₹" }, { code: "USD", sym: "$" }, { code: "EUR", sym: "€" }, { code: "GBP", sym: "£" }];

export default function SettingsPage() {
  const { organization, updateOrg } = useAuthStore();
  const qc = useQueryClient();

  const { register, handleSubmit, watch, formState: { errors } } = useForm({ mode: "onChange",
    defaultValues: {
      name: organization?.name ?? "",
      currency: organization?.currency ?? "INR",
      currencySymbol: organization?.currencySymbol ?? "₹",
      phone: organization?.phone ?? "",
      email: organization?.email ?? "",
      gstin: organization?.gstin ?? "",
      invoicePrefix: organization?.invoicePrefix ?? "INV",
      // Nested address object (not dot-notation keys)
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your store profile and preferences</p>
      </div>

      <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
        <div className="space-y-6">

          <Card className="p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Store Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input label="Store Name *" error={errors.name?.message} {...register("name", { required: "Required" })} />
              </div>
              {/* Store type is read-only — contact platform admin to change */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store Type</label>
                <div className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600 capitalize">
                  {STORE_TYPE_LABELS[organization?.storeType] ?? organization?.storeType ?? "—"}
                </div>
                <p className="text-xs text-gray-400 mt-1">Contact platform admin to change store type</p>
              </div>
              <Input label="GST/Tax ID" {...register("gstin")} />
              <Input label="Phone" {...register("phone")} />
              <Input label="Email" type="email" {...register("email")} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100" {...register("currency")}>
                  {currencies.map(c => <option key={c.code} value={c.code}>{c.code} ({c.sym})</option>)}
                </select>
              </div>
              <Input label="Currency Symbol" {...register("currencySymbol")} />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Address</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input label="Street" {...register("address.street")} />
              </div>
              <Input label="City" {...register("address.city")} />
              <Input label="State" {...register("address.state")} />
              <Input label="ZIP Code" {...register("address.zip")} />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold text-gray-800 mb-1">Tax Settings</h2>
            <p className="text-sm text-gray-400 mb-5">Choose how tax is applied across your store</p>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-gray-300"
                style={{ borderColor: taxEnabled ? "#4F46E5" : undefined, background: taxEnabled ? "#EEF2FF" : undefined }}>
                <div>
                  <p className="font-medium text-sm text-gray-800">Enable store-wide tax rate</p>
                  <p className="text-xs text-gray-500 mt-0.5">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Tax Rate</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full px-3 py-2 pr-8 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      {...register("settings.defaultTaxRate", { valueAsNumber: true })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Applied to all products unless overridden on the product itself</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Invoice Settings</h2>
            <Input label="Invoice Prefix" placeholder="INV" {...register("invoicePrefix")} />
            <p className="text-xs text-gray-400 mt-1">Example: INV-202506-0001</p>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" loading={mutation.isPending}>Save Settings</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
