import { ScanLine } from "lucide-react";
import ChipsField from "./ChipsField.jsx";

// Renders a single schema field. options prop overrides field.options (used for dynamic categories).
export default function DynField({ field, value, onChange, options: overrideOptions }) {
  const f = field;
  const opts = overrideOptions
    ? overrideOptions.map(o => (typeof o === "string" ? { v: o, l: o } : o))
    : (f.options || []);

  const label = (
    <label className="field-label">
      {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const hint = f.hint && (
    <p className="mt-1 text-[11px] text-gray-400">{f.hint}</p>
  );

  if (f.type === "chips") {
    return <ChipsField field={f} value={value || []} onChange={onChange} />;
  }

  if (f.type === "toggle") {
    return (
      <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800">{f.label}</p>
          {f.hint && <p className="text-[11px] text-gray-400 mt-0.5">{f.hint}</p>}
        </div>
        <button type="button" onClick={() => onChange(!value)}
          className={`relative w-9 h-5 rounded-full border-0 transition-colors flex-shrink-0 ml-3 ${value ? "bg-primary-600" : "bg-gray-300"}`}>
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${value ? "left-[18px]" : "left-0.5"}`} />
        </button>
      </div>
    );
  }

  if (f.type === "textarea") {
    return (
      <div className="field-group">
        {label}
        <textarea
          rows={3}
          placeholder={f.placeholder}
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition resize-none"
        />
        {hint}
      </div>
    );
  }

  if (f.type === "select") {
    return (
      <div className="field-group">
        {label}
        <select
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition bg-white appearance-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: "30px" }}
        >
          <option value="">Select…</option>
          {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        {hint}
      </div>
    );
  }

  if (f.type === "currency") {
    return (
      <div className="field-group">
        {label}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium select-none">₹</span>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition"
          />
        </div>
        {hint}
      </div>
    );
  }

  if (f.type === "number") {
    return (
      <div className="field-group">
        {label}
        <input
          type="number"
          step="any"
          min="0"
          placeholder={f.placeholder || "0"}
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition"
        />
        {hint}
      </div>
    );
  }

  if (f.type === "date") {
    return (
      <div className="field-group">
        {label}
        <input
          type="date"
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition"
        />
        {hint}
      </div>
    );
  }

  // default: text
  return (
    <div className="field-group">
      {label}
      {f.withScan ? (
        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder={f.placeholder}
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            className={`flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition ${f.mono ? "font-mono" : ""}`}
          />
          <button type="button" title="Scan barcode"
            className="px-3 py-2 border border-gray-200 rounded-lg text-gray-500 hover:text-primary-600 hover:border-primary-300 transition-colors bg-white">
            <ScanLine size={15} />
          </button>
        </div>
      ) : (
        <input
          type="text"
          placeholder={f.placeholder}
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition ${f.mono ? "font-mono text-xs tracking-wider" : ""}`}
        />
      )}
      {hint}
    </div>
  );
}
