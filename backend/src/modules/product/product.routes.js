import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate } from "../../utils/paginate.js";
import Product from "./product.model.js";
import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";

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
  // subcategory is stored in attributes array as {key:"subcategory", value:"..."}
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
  }).populate("categoryId", "name").lean();
  return ApiResponse.ok(res, "Low stock products", products);
});

const router = Router();
router.use(authenticate);
router.get("/low-stock", getLowStock);
router.get("/",          list);
router.post("/",         authorize("admin","superAdmin"), create);
router.get("/:id",       getOne);
router.put("/:id",       authorize("admin","superAdmin"), update);
router.delete("/:id",    authorize("admin","superAdmin"), remove);
export default router;
