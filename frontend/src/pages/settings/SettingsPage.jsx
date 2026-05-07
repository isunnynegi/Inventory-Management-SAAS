import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "../../api/index.js";
import { Card, Button, Input, Select } from "../../components/ui/index.jsx";
import { useAuthStore } from "../../stores/authStore.js";
import toast from "react-hot-toast";

const storeTypes = ["general","electronics","sanitary","hardware","pharmacy","grocery","clothing","other"];
const currencies = [{ code: "INR", sym: "₹" }, { code: "USD", sym: "$" }, { code: "EUR", sym: "€" }, { code: "GBP", sym: "£" }];

export default function SettingsPage() {
  const { organization, updateOrg } = useAuthStore();
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: {
    name: organization?.name, storeType: organization?.storeType,
    currency: organization?.currency, currencySymbol: organization?.currencySymbol,
    phone: organization?.phone, email: organization?.email, gstin: organization?.gstin,
    invoicePrefix: organization?.invoicePrefix,
    "address.street": organization?.address?.street, "address.city": organization?.address?.city,
    "address.state": organization?.address?.state, "address.zip": organization?.address?.zip,
  }});

  const mutation = useMutation({
    mutationFn: (d) => orgApi.update(d),
    onSuccess: ({ data }) => { updateOrg(data); qc.invalidateQueries(["organization"]); toast.success("Settings saved!"); },
    onError: (e) => toast.error(e.response?.data?.message || "Error"),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div><h1 className="text-xl font-bold text-gray-900">Settings</h1><p className="text-sm text-gray-500">Manage your store settings</p></div>
      <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Store Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Input label="Store Name *" error={errors.name?.message} {...register("name", { required: "Required" })} /></div>
              <Select label="Store Type" {...register("storeType")}>
                {storeTypes.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </Select>
              <Input label="GST/Tax ID" {...register("gstin")} />
              <Input label="Phone" {...register("phone")} />
              <Input label="Email" type="email" {...register("email")} />
              <Select label="Currency" {...register("currency")} onChange={e => {}}>
                {currencies.map(c => <option key={c.code} value={c.code}>{c.code} ({c.sym})</option>)}
              </Select>
              <Input label="Currency Symbol" {...register("currencySymbol")} />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Address</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Input label="Street" {...register("address.street")} /></div>
              <Input label="City" {...register("address.city")} />
              <Input label="State" {...register("address.state")} />
              <Input label="ZIP Code" {...register("address.zip")} />
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
