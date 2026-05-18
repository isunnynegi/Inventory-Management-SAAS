import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate } from "../../utils/paginate.js";
import Product from "./product.model.js";
import Category from "../category/category.model.js";
import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function csvEscape(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const parseRow = (line) => {
    const fields = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        i++;
        let val = "";
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { val += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else { val += line[i++]; }
        }
        fields.push(val);
        if (line[i] === ",") i++;
      } else {
        const end = line.indexOf(",", i);
        if (end === -1) { fields.push(line.slice(i)); break; }
        fields.push(line.slice(i, end)); i = end + 1;
      }
    }
    return fields;
  };
  const headers = parseRow(lines[0]).map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = parseRow(line);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx]?.trim() ?? ""; });
    return obj;
  });
}

export const list = asyncHandler(async (req, res) => {
  const { page, limit, search, categoryId, lowStock, subcategory } = req.query;
  const filter = { organizationId: req.organizationId };
  if (search) filter.$or = [
    { name: { $regex: search, $options: "i" } },
    { sku: { $regex: search, $options: "i" } },
    { barcode: { $regex: search, $options: "i" } },
  ];
  if (categoryId) filter.categoryId = categoryId;
  if (lowStock === "true") filter.$expr = { $lte: ["$stock", "$reorderLevel"] };
  if (subcategory) filter.attributes = { $elemMatch: { key: "subcategory", value: subcategory } };
  const result = await paginate(Product, filter, {
    page, limit,
    populate: { path: "categoryId", select: "name" },
  });
  return ApiResponse.paginated(res, "Products", result);
});

export const create = asyncHandler(async (req, res) => {
  const doc = await Product.create({ ...req.body, organizationId: req.organizationId, createdBy: req.user._id });
  return ApiResponse.created(res, "Product created", doc);
});

export const getOne = asyncHandler(async (req, res) => {
  const doc = await Product.findOne({ _id: req.params.id, organizationId: req.organizationId })
    .populate("categoryId", "name");
  if (!doc) throw ApiError.notFound("Product not found");
  return ApiResponse.ok(res, "Product", doc);
});

export const update = asyncHandler(async (req, res) => {
  const doc = await Product.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.organizationId },
    { ...req.body, updatedBy: req.user._id },
    { new: true, runValidators: true }
  ).populate("categoryId", "name");
  if (!doc) throw ApiError.notFound("Product not found");
  return ApiResponse.ok(res, "Product updated", doc);
});

export const remove = asyncHandler(async (req, res) => {
  const doc = await Product.findOne({ _id: req.params.id, organizationId: req.organizationId });
  if (!doc) throw ApiError.notFound("Product not found");
  await doc.softDelete(req.user._id);
  return ApiResponse.ok(res, "Product deleted");
});

export const getLowStock = asyncHandler(async (req, res) => {
  const products = await Product.find({
    organizationId: req.organizationId,
    $expr: { $lte: ["$stock", "$reorderLevel"] },
  }).populate("categoryId", "name");
  return ApiResponse.ok(res, "Low stock products", products);
});

export const exportProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ organizationId: req.organizationId })
    .populate("categoryId", "name")
    .lean();

  const getAttr = (p, key) => p.attributes?.find(a => a.key === key)?.value || "";

  const CSV_HEADERS = ["Name","SKU","Barcode","Category","Brand","Description","Unit","Stock","Reorder Level","Purchase Price","Selling Price","Tax %","Active"];

  const rows = products.map(p => [
    p.name,
    p.sku || "",
    p.barcode || "",
    p.categoryId?.name || "",
    getAttr(p, "brand"),
    p.description || "",
    p.unit || "pcs",
    p.stock ?? 0,
    p.reorderLevel ?? 10,
    p.purchasePrice ?? 0,
    p.sellingPrice ?? 0,
    p.taxPercent ?? 0,
    p.isActive !== false ? "Yes" : "No",
  ].map(csvEscape).join(","));

  const csv = [CSV_HEADERS.join(","), ...rows].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="products-${Date.now()}.csv"`);
  res.send(csv);
});

export const importProducts = [
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest("No file uploaded");

    const text = req.file.buffer.toString("utf-8");
    const rows = parseCSV(text);
    if (!rows.length) throw ApiError.badRequest("Empty or invalid CSV file");

    const categories = await Category.find({ organizationId: req.organizationId }).lean();
    const catMap = {};
    categories.forEach(c => { catMap[c.name.toLowerCase().trim()] = c._id; });

    const result = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      const name = row["name"];
      if (!name) { result.skipped++; continue; }

      try {
        const categoryName = row["category"] || "";
        const categoryId = categoryName ? catMap[categoryName.toLowerCase().trim()] : undefined;

        const attributes = [];
        const brand = row["brand"];
        if (brand) attributes.push({ key: "brand", value: brand });

        await Product.create({
          name,
          sku: row["sku"] || undefined,
          barcode: row["barcode"] || undefined,
          categoryId: categoryId || undefined,
          description: row["description"] || undefined,
          unit: row["unit"] || "pcs",
          stock: parseFloat(row["stock"]) || 0,
          reorderLevel: parseFloat(row["reorder level"]) || 10,
          purchasePrice: parseFloat(row["purchase price"]) || 0,
          sellingPrice: parseFloat(row["selling price"]) || 0,
          taxPercent: parseFloat(row["tax %"]) || 0,
          isActive: (row["active"] || "yes").toLowerCase() !== "no",
          attributes,
          organizationId: req.organizationId,
          createdBy: req.user._id,
        });
        result.created++;
      } catch (err) {
        result.errors.push({ name: name || "?", error: err.message });
      }
    }

    return ApiResponse.ok(res, `Import complete: ${result.created} created, ${result.skipped} skipped`, result);
  }),
];

import { requireProductLimit } from "../../middleware/featureGate.js";

const router = Router();
router.use(authenticate);
router.get("/low-stock", getLowStock);
router.get("/export",    exportProducts);
router.get("/",          list);
router.post("/import",   authorize("admin","superAdmin"), importProducts);
router.post("/",         authorize("admin","superAdmin"), requireProductLimit, create);
router.get("/:id",       getOne);
router.put("/:id",       authorize("admin","superAdmin"), update);
router.delete("/:id",    authorize("admin","superAdmin"), remove);
export default router;
