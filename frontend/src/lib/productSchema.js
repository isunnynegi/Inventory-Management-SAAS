// Product field schemas per store type — ported verbatim from design reference.
// Persist schema-driven field values into products.attributes as [{key, value}] pairs.

export const COMMON_BASICS = [
  { id: "name", label: "Product name", type: "text", required: true, placeholder: "Full product name", span: 2 },
  { id: "brand", label: "Brand", type: "text", required: true, placeholder: "Manufacturer / brand" },
  { id: "category", label: "Category", type: "select", required: true, dynamic: "categories" },
  { id: "subcategory", label: "Subcategory", type: "text", placeholder: "e.g. Smartphones" },
  { id: "description", label: "Description", type: "textarea", placeholder: "Short description", span: 2 },
];

export const COMMON_ID = [
  { id: "sku", label: "SKU", type: "text", placeholder: "Auto-generated if blank", mono: true, hint: "Internal stock keeping unit" },
  { id: "barcode", label: "Barcode (EAN/UPC)", type: "text", placeholder: "Scan or enter", mono: true, withScan: true },
];

export const COMMON_PRICING = [
  { id: "cost", label: "Cost price", type: "currency", required: true },
  { id: "price", label: "Selling price", type: "currency", required: true },
  { id: "mrp", label: "MRP", type: "currency" },
  { id: "taxRate", label: "GST tax rate", type: "select", options: [
    { v: "0", l: "0% (Exempt)" }, { v: "5", l: "5%" }, { v: "12", l: "12%" },
    { v: "18", l: "18%" }, { v: "28", l: "28%" },
  ], default: "18" },
  { id: "hsn", label: "HSN / SAC code", type: "text", mono: true, placeholder: "e.g. 8517" },
];

export const COMMON_STOCK = [
  { id: "qty", label: "Opening quantity", type: "number", required: true, placeholder: "0" },
  { id: "lowStock", label: "Low-stock alert at", type: "number", placeholder: "e.g. 10" },
  { id: "unit", label: "Unit", type: "select", options: [
    { v: "pcs", l: "Pieces (pcs)" }, { v: "kg", l: "Kilograms (kg)" }, { v: "g", l: "Grams (g)" },
    { v: "L", l: "Litres (L)" }, { v: "ml", l: "Millilitres (ml)" }, { v: "m", l: "Metres (m)" },
    { v: "ft", l: "Feet (ft)" }, { v: "box", l: "Box" }, { v: "pack", l: "Pack" },
  ]},
];

export const STORE_TYPE_SCHEMAS = {
  electronics: {
    label: "Electronics",
    icon: "📱",
    brandLabel: "Brand",
    placeholders: { name: "e.g. iPhone 15 Pro 256GB Natural Titanium" },
    sections: [
      {
        title: "Specifications",
        fields: [
          { id: "model", label: "Model number", type: "text", placeholder: "e.g. A2848" },
          { id: "color", label: "Color", type: "text", placeholder: "e.g. Natural Titanium" },
          { id: "warranty_months", label: "Warranty period", type: "select", options: [
            { v: "0", l: "No warranty" }, { v: "6", l: "6 months" }, { v: "12", l: "1 year" },
            { v: "24", l: "2 years" }, { v: "36", l: "3 years" },
          ]},
          { id: "warranty_type", label: "Warranty type", type: "select", options: [
            { v: "manufacturer", l: "Manufacturer" }, { v: "seller", l: "Seller" }, { v: "extended", l: "Extended" },
          ]},
        ],
      },
      {
        title: "Serial tracking",
        condition: { categoryIn: ["Mobiles", "Laptops", "Wearables"] },
        fields: [
          { id: "track_serial", label: "Track IMEI/Serial per unit", type: "toggle", default: true, hint: "Required for mobiles & laptops" },
          { id: "imei", label: "IMEI / Serial number", type: "text", mono: true, placeholder: "Will be entered per unit" },
        ],
      },
      {
        title: "Technical details",
        fields: [
          { id: "specs", label: "Key specs", type: "chips", placeholder: "Add spec & press Enter", suggestions: ["6.1\" OLED", "256 GB", "8 GB RAM", "5G", "Triple camera", "USB-C"] },
        ],
      },
    ],
  },

  electrical: {
    label: "Electrical",
    icon: "⚡",
    brandLabel: "Brand",
    placeholders: { name: "e.g. Havells 16A Modular Switch" },
    sections: [
      {
        title: "Electrical ratings",
        fields: [
          { id: "voltage", label: "Voltage rating", type: "select", options: [
            { v: "230V", l: "230V (single phase)" }, { v: "415V", l: "415V (three phase)" },
            { v: "12V", l: "12V DC" }, { v: "24V", l: "24V DC" }, { v: "custom", l: "Other" },
          ]},
          { id: "current", label: "Current rating", type: "select", options: [
            { v: "5A", l: "5A" }, { v: "6A", l: "6A" }, { v: "10A", l: "10A" }, { v: "16A", l: "16A" },
            { v: "20A", l: "20A" }, { v: "25A", l: "25A" }, { v: "32A", l: "32A" }, { v: "40A", l: "40A" }, { v: "63A", l: "63A" },
          ]},
          { id: "wattage", label: "Wattage / Power", type: "text", placeholder: "e.g. 9W, 1200W", hint: "For bulbs, fans, appliances" },
          { id: "phase", label: "Phase", type: "select", options: [
            { v: "single", l: "Single phase" }, { v: "three", l: "Three phase" }, { v: "na", l: "N/A" },
          ]},
        ],
      },
      {
        title: "Wires & cables",
        condition: { categoryIn: ["Wires & Cables"] },
        fields: [
          { id: "core_size", label: "Core size", type: "select", options: [
            { v: "0.75", l: "0.75 sqmm" }, { v: "1.0", l: "1.0 sqmm" }, { v: "1.5", l: "1.5 sqmm" },
            { v: "2.5", l: "2.5 sqmm" }, { v: "4.0", l: "4.0 sqmm" }, { v: "6.0", l: "6.0 sqmm" }, { v: "10", l: "10 sqmm" },
          ]},
          { id: "wire_length", label: "Length per coil", type: "text", placeholder: "e.g. 90m" },
          { id: "conductor", label: "Conductor", type: "select", options: [
            { v: "copper", l: "Copper" }, { v: "aluminium", l: "Aluminium" },
          ]},
          { id: "insulation", label: "Insulation", type: "select", options: [
            { v: "pvc", l: "PVC" }, { v: "xlpe", l: "XLPE" }, { v: "rubber", l: "Rubber" },
          ]},
        ],
      },
      {
        title: "Lighting details",
        condition: { categoryIn: ["Lighting"] },
        fields: [
          { id: "color_temp", label: "Color temperature", type: "select", options: [
            { v: "warm", l: "Warm white (2700K)" }, { v: "neutral", l: "Neutral (4000K)" }, { v: "cool", l: "Cool white (6500K)" },
          ]},
          { id: "lumens", label: "Lumens", type: "number", placeholder: "e.g. 900" },
          { id: "base", label: "Base / Holder", type: "select", options: [
            { v: "b22", l: "B22 (Bayonet)" }, { v: "e27", l: "E27 (Screw)" }, { v: "gu10", l: "GU10" }, { v: "tube", l: "Tube fitting" },
          ]},
        ],
      },
      {
        title: "Compliance & warranty",
        fields: [
          { id: "isi_mark", label: "ISI mark / Certification", type: "toggle", default: true },
          { id: "ip_rating", label: "IP rating", type: "select", options: [
            { v: "ip20", l: "IP20" }, { v: "ip44", l: "IP44" }, { v: "ip54", l: "IP54" }, { v: "ip65", l: "IP65" }, { v: "na", l: "N/A" },
          ]},
          { id: "warranty_months", label: "Warranty", type: "select", options: [
            { v: "0", l: "No warranty" }, { v: "12", l: "1 year" }, { v: "24", l: "2 years" }, { v: "36", l: "3 years" }, { v: "60", l: "5 years" },
          ]},
        ],
      },
    ],
  },

  grocery: {
    label: "Grocery",
    icon: "🛒",
    brandLabel: "Brand",
    placeholders: { name: "e.g. Aashirvaad Atta 10kg" },
    sections: [
      {
        title: "Batch & expiry",
        fields: [
          { id: "batch", label: "Batch number", type: "text", mono: true, placeholder: "e.g. B2026-04-A12" },
          { id: "mfg_date", label: "Manufacture date", type: "date" },
          { id: "expiry_date", label: "Expiry / Best before", type: "date", required: true },
          { id: "shelf_life_days", label: "Shelf life (days)", type: "number", placeholder: "Auto-calculated", hint: "Calculated from MFG → expiry" },
        ],
      },
      {
        title: "Packaging",
        fields: [
          { id: "pack_size", label: "Pack size", type: "text", placeholder: "e.g. 1 kg, 500 ml" },
          { id: "pack_qty", label: "Items per pack", type: "number", placeholder: "1" },
          { id: "veg_nonveg", label: "Diet type", type: "select", options: [
            { v: "veg", l: "🟢 Vegetarian" }, { v: "nonveg", l: "🔴 Non-vegetarian" }, { v: "egg", l: "🟡 Contains egg" }, { v: "vegan", l: "🌱 Vegan" }, { v: "na", l: "N/A" },
          ]},
          { id: "storage", label: "Storage", type: "select", options: [
            { v: "ambient", l: "Ambient (room temp)" }, { v: "cool_dry", l: "Cool & dry" }, { v: "refrigerate", l: "Refrigerate (2-8°C)" }, { v: "frozen", l: "Frozen (-18°C)" },
          ]},
        ],
      },
      {
        title: "Nutrition (optional)",
        fields: [
          { id: "calories", label: "Calories per 100g/ml", type: "number" },
          { id: "ingredients", label: "Ingredients", type: "textarea", placeholder: "Comma-separated", span: 2 },
          { id: "allergens", label: "Allergen warnings", type: "chips", suggestions: ["Wheat", "Gluten", "Milk", "Soy", "Peanuts", "Tree nuts", "Eggs"] },
        ],
      },
    ],
  },

  pharmacy: {
    label: "Pharmacy",
    icon: "💊",
    brandLabel: "Manufacturer",
    placeholders: { name: "e.g. Crocin Advance 500mg Strip of 15" },
    sections: [
      {
        title: "Drug information",
        fields: [
          { id: "composition", label: "Composition / Salt", type: "text", required: true, placeholder: "e.g. Paracetamol 500mg" },
          { id: "form", label: "Dosage form", type: "select", options: [
            { v: "tablet", l: "Tablet" }, { v: "capsule", l: "Capsule" }, { v: "syrup", l: "Syrup" }, { v: "injection", l: "Injection" },
            { v: "ointment", l: "Ointment / Cream" }, { v: "drops", l: "Drops" }, { v: "inhaler", l: "Inhaler" }, { v: "powder", l: "Powder" },
          ]},
          { id: "strength", label: "Strength", type: "text", placeholder: "e.g. 500 mg, 10 mg/ml" },
          { id: "pack_form", label: "Pack form", type: "text", placeholder: "e.g. Strip of 15 tabs" },
        ],
      },
      {
        title: "Regulatory",
        fields: [
          { id: "schedule", label: "Drug schedule", type: "select", required: true, options: [
            { v: "otc", l: "OTC (Over-the-counter)" }, { v: "g", l: "Schedule G" }, { v: "h", l: "Schedule H (Rx required)" },
            { v: "h1", l: "Schedule H1 (Antibiotic Rx)" }, { v: "x", l: "Schedule X (Narcotic)" },
          ], hint: "Determines if a prescription is required" },
          { id: "prescription_required", label: "Prescription required", type: "toggle" },
          { id: "manufacturer_address", label: "Manufacturer address", type: "text" },
          { id: "license_no", label: "Mfg license number", type: "text", mono: true, placeholder: "e.g. KA/12345" },
        ],
      },
      {
        title: "Batch & expiry",
        fields: [
          { id: "batch", label: "Batch number", type: "text", mono: true, required: true },
          { id: "mfg_date", label: "Manufacture date", type: "date", required: true },
          { id: "expiry_date", label: "Expiry date", type: "date", required: true },
          { id: "storage", label: "Storage condition", type: "select", options: [
            { v: "room", l: "Below 25°C, dry place" }, { v: "cool", l: "Cool (8-15°C)" }, { v: "refrigerate", l: "Refrigerate (2-8°C)" },
          ]},
        ],
      },
      {
        title: "Clinical",
        fields: [
          { id: "indications", label: "Indications", type: "textarea", placeholder: "What it's used for", span: 2 },
          { id: "side_effects", label: "Side effects", type: "chips", suggestions: ["Drowsiness", "Nausea", "Headache", "Allergic reaction"] },
        ],
      },
    ],
  },

  apparel: {
    label: "Apparel",
    icon: "👕",
    brandLabel: "Brand",
    placeholders: { name: "e.g. Men's Cotton Slim Fit Shirt — Blue" },
    sections: [
      {
        title: "Variants",
        fields: [
          { id: "sizes", label: "Available sizes", type: "chips", required: true, suggestions: ["XS", "S", "M", "L", "XL", "XXL", "28", "30", "32", "34", "36", "38", "40", "Free Size"] },
          { id: "colors", label: "Available colors", type: "chips", required: true, suggestions: ["Black", "White", "Navy", "Grey", "Red", "Blue", "Green", "Beige"] },
          { id: "gender", label: "Gender", type: "select", options: [
            { v: "men", l: "Men" }, { v: "women", l: "Women" }, { v: "unisex", l: "Unisex" }, { v: "boys", l: "Boys" }, { v: "girls", l: "Girls" }, { v: "infants", l: "Infants" },
          ]},
          { id: "age_group", label: "Age group", type: "select", options: [
            { v: "adult", l: "Adult" }, { v: "teen", l: "Teen (13-19)" }, { v: "kid", l: "Kid (4-12)" }, { v: "infant", l: "Infant (0-3)" },
          ]},
        ],
      },
      {
        title: "Material & care",
        fields: [
          { id: "material", label: "Primary material", type: "select", options: [
            { v: "cotton", l: "Cotton" }, { v: "polyester", l: "Polyester" }, { v: "blend", l: "Cotton blend" },
            { v: "linen", l: "Linen" }, { v: "denim", l: "Denim" }, { v: "wool", l: "Wool" }, { v: "silk", l: "Silk" }, { v: "leather", l: "Leather" }, { v: "synthetic", l: "Synthetic" },
          ]},
          { id: "fit", label: "Fit", type: "select", options: [
            { v: "slim", l: "Slim fit" }, { v: "regular", l: "Regular fit" }, { v: "loose", l: "Loose / Relaxed" }, { v: "skinny", l: "Skinny" }, { v: "oversized", l: "Oversized" },
          ]},
          { id: "pattern", label: "Pattern", type: "select", options: [
            { v: "solid", l: "Solid" }, { v: "striped", l: "Striped" }, { v: "checked", l: "Checked" }, { v: "printed", l: "Printed" }, { v: "embroidered", l: "Embroidered" },
          ]},
          { id: "care", label: "Care instructions", type: "chips", suggestions: ["Machine wash", "Hand wash only", "Dry clean only", "Do not bleach", "Iron low", "Cold wash"] },
        ],
      },
      {
        title: "Style",
        fields: [
          { id: "occasion", label: "Occasion", type: "chips", suggestions: ["Casual", "Formal", "Party", "Wedding", "Sports", "Ethnic"] },
          { id: "season", label: "Season", type: "select", options: [
            { v: "all", l: "All seasons" }, { v: "summer", l: "Summer" }, { v: "winter", l: "Winter" }, { v: "monsoon", l: "Monsoon" },
          ]},
        ],
      },
    ],
  },
};

// Maps organization.storeType (backend enum) → STORE_TYPE_SCHEMAS key
export const ORG_TO_SCHEMA_TYPE = {
  electronics: "electronics",
  electrical:  "electrical",
  sanitary:    "electrical",
  hardware:    "electrical",
  pharmacy:    "pharmacy",
  grocery:     "grocery",
  clothing:    "apparel",
};

export function getSchemaForOrg(orgStoreType) {
  const key = ORG_TO_SCHEMA_TYPE[orgStoreType];
  return key ? STORE_TYPE_SCHEMAS[key] : null;
}

// Convert flat form state → [{key, value}] for products.attributes
export function formToAttributes(form, schema) {
  const attrs = [];

  // Common fields that don't map to model columns go into attributes
  const attrKeys = ["brand", "subcategory", "mrp", "hsn"];
  attrKeys.forEach(k => {
    const v = form[k];
    if (v !== undefined && v !== "") attrs.push({ key: k, value: String(v) });
  });

  // Store-type-specific section fields
  if (schema) {
    schema.sections.forEach(sec => {
      sec.fields.forEach(f => {
        const v = form[f.id];
        if (v === undefined || v === "") return;
        if (Array.isArray(v) && v.length === 0) return;
        if (f.type === "toggle" && v === false) return;
        attrs.push({
          key: f.id,
          value: Array.isArray(v) ? JSON.stringify(v) : String(v),
        });
      });
    });
  }

  return attrs;
}

// Rebuild flat form state from [{key, value}] attributes (for edit mode)
export function attributesToForm(attributes = []) {
  return Object.fromEntries(
    attributes.map(a => {
      let v = a.value;
      try { v = JSON.parse(a.value); } catch (_) { /* keep as string */ }
      return [a.key, v];
    })
  );
}
