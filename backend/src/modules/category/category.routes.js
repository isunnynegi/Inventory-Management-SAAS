import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate } from "../../utils/paginate.js";
import Category from "./category.model.js";
import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";

// LIST — only top-level (parent: null) by default
export const list = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query;
  const filter = { organizationId: req.organizationId, parent: null };
  if (search) filter.name = { $regex: search, $options: "i" };
  const result = await paginate(Category, filter, { page, limit });
  return ApiResponse.paginated(res, "Categorys", result);
});

// SUBCATEGORIES of a parent
export const listSubs = asyncHandler(async (req, res) => {
  const parent = await Category.findOne({ _id: req.params.id, organizationId: req.organizationId });
  if (!parent) throw ApiError.notFound("Category not found");
  const subs = await Category.find({ organizationId: req.organizationId, parent: req.params.id })
    .sort({ name: 1 }).lean();
  return ApiResponse.ok(res, "Subcategories", subs);
});

// CREATE
export const create = asyncHandler(async (req, res) => {
  const { parentId, ...rest } = req.body;
  const doc = await Category.create({
    ...rest,
    parent: parentId || null,
    organizationId: req.organizationId,
    createdBy: req.user._id,
  });
  return ApiResponse.created(res, "Category created", doc);
});

// GET ONE
export const getOne = asyncHandler(async (req, res) => {
  const doc = await Category.findOne({ _id: req.params.id, organizationId: req.organizationId });
  if (!doc) throw ApiError.notFound("Category not found");
  return ApiResponse.ok(res, "Category", doc);
});

// UPDATE
export const update = asyncHandler(async (req, res) => {
  const { parentId, ...rest } = req.body;
  const doc = await Category.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.organizationId },
    { ...rest, ...(parentId !== undefined && { parent: parentId || null }), updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!doc) throw ApiError.notFound("Category not found");
  return ApiResponse.ok(res, "Category updated", doc);
});

// DELETE — also removes subcategories
export const remove = asyncHandler(async (req, res) => {
  const doc = await Category.findOne({ _id: req.params.id, organizationId: req.organizationId });
  if (!doc) throw ApiError.notFound("Category not found");
  // Soft-delete all children first
  await Category.updateMany(
    { parent: req.params.id, organizationId: req.organizationId },
    { $set: { isDeleted: true, deletedAt: new Date() } }
  );
  await doc.softDelete(req.user._id);
  return ApiResponse.ok(res, "Category deleted");
});

// ROUTER
const router = Router();
router.use(authenticate);
router.get("/",                 list);
router.post("/",                authorize("admin","superAdmin"), create);
router.get("/:id/subcategories", listSubs);
router.get("/:id",              getOne);
router.put("/:id",              authorize("admin","superAdmin"), update);
router.delete("/:id",           authorize("admin","superAdmin"), remove);
export default router;
