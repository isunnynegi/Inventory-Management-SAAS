import { useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Sparkles, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../stores/authStore.js";
import { productApi, categoryApi } from "../../api/index.js";
import {
  COMMON_BASICS, COMMON_ID, COMMON_PRICING, COMMON_STOCK,
  getSchemaForOrg, formToAttributes, attributesToForm,
} from "../../lib/productSchema.js";
import DynField from "./DynField.jsx";
import { useState } from "react";

// ─── helpers ───────────────────────────────────────────────────
function buildInitialState(schema) {
  const s = {};
  [...COMMON_BASICS, ...COMMON_ID, ...COMMON_PRICING, ...COMMON_STOCK].forEach(f => {
    s[f.id] = f.default ?? (f.type === "toggle" ? false : f.type === "chips" ? [] : "");
  });
  if (schema) {
    schema.sections.forEach(sec =>
      sec.fields.forEach(f => {
        s[f.id] = f.default ?? (f.type === "toggle" ? false : f.type === "chips" ? [] : "");
      })
    );
  }
  // sensible defaults
  s.taxRate = "18";
  s.unit = "pcs";
  return s;
}

function fmtINR(n) {
  const num = parseFloat(n);
  if (isNaN(num)) return "₹0";
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

// ─── Section wrapper ────────────────────────────────────────────
function FormSection({ title, accent, children }) {
  return (
    <div className={`rounded-xl p-4 border ${accent ? "border-primary-100 bg-gradient-to-b from-primary-50/60 to-transparent" : "border-gray-100 bg-white"}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider mb-3 ${accent ? "text-primary-600" : "text-gray-400"}`}>{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ─── 2-col / 3-col grid helpers ─────────────────────────────────
function Row2({ children }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
function Row3({ children }) {
  return <div className="grid grid-cols-3 gap-3">{children}</div>;
}

// ─── Main drawer ────────────────────────────────────────────────
export default function AddProductDrawer({ open, onClose, editProduct = null }) {
  const qc = useQueryClient();
  const { organization } = useAuthStore();
  const schema = getSchemaForOrg(organization?.storeType);
  const schemaLabel = schema?.label || "General";
  const schemaIcon = schema?.icon || "📦";

  const [form, setForm] = useState(() => buildInitialState(schema));
  const [saveAnother, setSaveAnother] = useState(false);

  const set = useCallback((k, v) => setForm(f => ({ ...f, [k]: v })), []);

  // Load parent categories
  const { data: catData } = useQuery({
    queryKey: ["categories-all"],
    queryFn: () => categoryApi.list({ limit: 100 }),
    enabled: open,
  });
  const categories = catData?.data || [];
  const categoryOptions = categories.map(c => ({ v: c.id, l: c.name }));

  // Load subcategories when a category is selected
  const { data: subData } = useQuery({
    queryKey: ["subcategories", form.category],
    queryFn: () => categoryApi.subcategories(form.category),
    enabled: !!form.category,
  });
  const subcategoryOptions = (subData?.data ?? []).map(s => ({ v: s.name, l: s.name }));

  // Populate form for edit mode
  useEffect(() => {
    if (!open) return;
    if (editProduct) {
      const attrMap = attributesToForm(editProduct.attributes || []);
      setForm({
        ...buildInitialState(schema),
        name: editProduct.name || "",
        sku: editProduct.sku || "",
        barcode: editProduct.barcode || "",
        description: editProduct.description || "",
        unit: editProduct.unit || "pcs",
        qty: String(editProduct.stock ?? ""),
        lowStock: String(editProduct.reorderLevel ?? ""),
        cost: String(editProduct.purchasePrice ?? ""),
        price: String(editProduct.sellingPrice ?? ""),
        taxRate: String(editProduct.taxPercent ?? "18"),
        category: editProduct.categoryId?.id || editProduct.categoryId || "",
        ...attrMap,
      });
    } else {
      setForm(buildInitialState(schema));
    }
  }, [open, editProduct]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Live margin
  const cost = parseFloat(form.cost);
  const price = parseFloat(form.price);
  const margin = (!isNaN(cost) && !isNaN(price) && price > 0)
    ? ((price - cost) / price) * 100
    : null;

  // Conditional section visibility
  const selectedCategoryName = categories.find(c => c.id === form.category)?.name || "";
  const visibleSections = schema
    ? schema.sections.filter(sec => {
      if (!sec.condition) return true;
      if (sec.condition.categoryIn) return sec.condition.categoryIn.includes(selectedCategoryName);
      return true;
    })
    : [];

  // Mutation
  const mutation = useMutation({
    mutationFn: (payload) =>
      editProduct ? productApi.update(editProduct.id, payload) : productApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(editProduct ? "Product updated!" : "Product added!");
      if (saveAnother && !editProduct) {
        setForm(buildInitialState(schema));
      } else {
        onClose();
      }
    },
    onError: (e) => toast.error(e.response?.data?.message || "Failed to save"),
  });

  const handleSubmit = (andAnother = false) => {
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    if (!form.cost || isNaN(parseFloat(form.cost))) { toast.error("Cost price is required"); return; }
    if (!form.price || isNaN(parseFloat(form.price))) { toast.error("Selling price is required"); return; }

    setSaveAnother(andAnother);
    const payload = {
      name: form.name.trim(),
      sku: form.sku || undefined,
      barcode: form.barcode || undefined,
      description: form.description || undefined,
      unit: form.unit || "pcs",
      stock: parseFloat(form.qty) || 0,
      reorderLevel: parseFloat(form.lowStock) || 10,
      purchasePrice: parseFloat(form.cost),
      sellingPrice: parseFloat(form.price),
      taxPercent: parseFloat(form.taxRate) || 0,
      categoryId: form.category || undefined,
      attributes: formToAttributes(form, schema),
    };
    mutation.mutate(payload);
  };

  if (!open) return null;

  const brandLabel = schema?.brandLabel || "Brand";
  const namePlaceholder = schema?.placeholders?.name || COMMON_BASICS[0].placeholder;

  return (
    <>
      {/* Scrim */}
      <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[1px]" onClick={onClose} />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[640px] bg-gray-50 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-xl flex-shrink-0">
              {schemaIcon}
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-gray-900 leading-tight">
                {editProduct ? "Edit product" : "Add new product"}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{schemaLabel} catalog · form adapts to category</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Product basics */}
          <FormSection title="Product basics">
            <DynField
              field={{ ...COMMON_BASICS[0], placeholder: namePlaceholder }}
              value={form.name}
              onChange={v => set("name", v)}
            />
            <Row2>
              <DynField
                field={{ ...COMMON_BASICS[1], label: brandLabel }}
                value={form.brand}
                onChange={v => set("brand", v)}
              />
              <DynField
                field={COMMON_BASICS[2]}
                value={form.category}
                onChange={v => { set("category", v); set("subcategory", ""); }}
                options={categoryOptions}
              />
            </Row2>
            <Row2>
              <DynField
                field={
                  subcategoryOptions.length > 0
                    ? { ...COMMON_BASICS[3], type: "select", options: subcategoryOptions }
                    : COMMON_BASICS[3]
                }
                value={form.subcategory}
                onChange={v => set("subcategory", v)}
              />
              <DynField field={COMMON_BASICS[4]} value={form.description} onChange={v => set("description", v)} />
            </Row2>
          </FormSection>

          {/* Identification */}
          <FormSection title="Identification">
            <Row2>
              {COMMON_ID.map(f => (
                <DynField key={f.id} field={f} value={form[f.id]} onChange={v => set(f.id, v)} />
              ))}
            </Row2>
            {/* Image upload placeholder */}
            <div>
              <p className="field-label">Product image</p>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center bg-white text-gray-400 hover:border-primary-300 hover:bg-primary-50/20 transition-colors cursor-pointer">
                <p className="text-2xl mb-1">📷</p>
                <p className="text-sm font-medium text-gray-600">Drop image here, or <span className="text-primary-600">browse</span></p>
                <p className="text-[11px] mt-0.5">PNG, JPG, WEBP up to 5 MB</p>
              </div>
            </div>
          </FormSection>

          {/* Pricing */}
          <FormSection title="Pricing">
            <Row3>
              {COMMON_PRICING.slice(0, 3).map(f => (
                <DynField key={f.id} field={f} value={form[f.id]} onChange={v => set(f.id, v)} />
              ))}
            </Row3>
            <Row2>
              {COMMON_PRICING.slice(3).map(f => (
                <DynField key={f.id} field={f} value={form[f.id]} onChange={v => set(f.id, v)} />
              ))}
            </Row2>
            {margin !== null && (
              <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${margin >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                <TrendingUp size={13} />
                Margin: {margin.toFixed(1)}% · Profit per unit: {fmtINR(price - cost)}
              </div>
            )}
          </FormSection>

          {/* Stock */}
          <FormSection title="Stock">
            <Row3>
              {COMMON_STOCK.map(f => (
                <DynField key={f.id} field={f} value={form[f.id]} onChange={v => set(f.id, v)} />
              ))}
            </Row3>
          </FormSection>

          {/* Store-type-specific dynamic sections */}
          {visibleSections.map(section => (
            <FormSection key={section.title} title={section.title} accent>
              {/* non-span-2 fields in a grid */}
              {section.fields.filter(f => f.span !== 2).length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {section.fields.filter(f => f.span !== 2).map(f => (
                    <DynField key={f.id} field={f} value={form[f.id]} onChange={v => set(f.id, v)} />
                  ))}
                </div>
              )}
              {/* span-2 fields full width */}
              {section.fields.filter(f => f.span === 2).map(f => (
                <DynField key={f.id} field={f} value={form[f.id]} onChange={v => set(f.id, v)} />
              ))}
            </FormSection>
          ))}

          {/* Smart form hint */}
          <div className="flex items-start gap-2.5 px-3.5 py-3 bg-sky-50 text-sky-700 rounded-xl text-xs border border-sky-100">
            <Sparkles size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <strong>Smart form:</strong> Fields adapt to the {schemaLabel} catalog and the category you select.
              {selectedCategoryName && <> Showing fields specific to <strong>{selectedCategoryName}</strong>.</>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-white border-t border-gray-100 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          {!editProduct && (
            <button type="button" onClick={() => handleSubmit(true)}
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60">
              Save & add another
            </button>
          )}
          <button type="button" onClick={() => handleSubmit(false)}
            disabled={mutation.isPending}
            className="px-5 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60 flex items-center gap-1.5">
            {mutation.isPending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {editProduct ? "Update product" : "Save product"}
          </button>
        </div>
      </div>
    </>
  );
}
