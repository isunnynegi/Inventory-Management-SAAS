import { useState } from "react";
import { X } from "lucide-react";

export default function ChipsField({ field, value = [], onChange }) {
  const [draft, setDraft] = useState("");

  const add = (v) => {
    const t = v.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setDraft("");
  };

  const remove = (v) => onChange(value.filter(x => x !== v));

  const unusedSuggestions = (field.suggestions || []).filter(s => !value.includes(s));

  return (
    <div className="field-group">
      <label className="field-label">
        {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="flex flex-wrap gap-1.5 min-h-[36px] px-2 py-1.5 bg-white border border-gray-200 rounded-lg focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition">
        {value.map(v => (
          <span key={v} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-medium">
            {v}
            <button type="button" onClick={() => remove(v)} className="text-primary-400 hover:text-primary-700 transition-colors">
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          placeholder={value.length ? "" : (field.placeholder || "Add & press Enter")}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); add(draft); }
            if (e.key === "Backspace" && !draft && value.length) remove(value[value.length - 1]);
          }}
          className="flex-1 min-w-[80px] border-0 outline-none text-xs bg-transparent py-0.5 px-1 text-gray-800 placeholder-gray-400"
        />
      </div>
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5 items-center">
          <span className="text-[11px] text-gray-400">Suggested:</span>
          {unusedSuggestions.slice(0, 8).map(s => (
            <button key={s} type="button" onClick={() => add(s)}
              className="text-[11px] px-1.5 py-0.5 rounded-full border border-gray-200 bg-white text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-colors">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
