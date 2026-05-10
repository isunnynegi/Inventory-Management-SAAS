import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate } from "../../utils/paginate.js";
import Supplier from "./supplier.model.js";
import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";

// LIST
export const list = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query;
  const filter = { organizationId: req.organizationId };
  if (search) filter.name = { $regex: search, $options: "i" };
  const result = await paginate(Supplier, filter, { page, limit });
  return ApiResponse.paginated(res, "Suppliers", result);
});

// CREATE
export const create = asyncHandler(async (req, res) => {
  const doc = await Supplier.create({ ...req.body, organizationId: req.organizationId, createdBy: req.user._id });
  return ApiResponse.created(res, "Supplier created", doc);
});

// GET ONE
export const getOne = asyncHandler(async (req, res) => {
  const doc = await Supplier.findOne({ _id: req.params.id, organizationId: req.organizationId });
  if (!doc) throw ApiError.notFound("Supplier not found");
  return ApiResponse.ok(res, "Supplier", doc);
});

// UPDATE
export const update = asyncHandler(async (req, res) => {
  const doc = await Supplier.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.organizationId },
    { ...req.body, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!doc) throw ApiError.notFound("Supplier not found");
  return ApiResponse.ok(res, "Supplier updated", doc);
});

// DELETE
export const remove = asyncHandler(async (req, res) => {
  const doc = await Supplier.findOne({ _id: req.params.id, organizationId: req.organizationId });
  if (!doc) throw ApiError.notFound("Supplier not found");
  await doc.softDelete(req.user._id);
  return ApiResponse.ok(res, "Supplier deleted");
});

import { requireFeature } from "../../middleware/featureGate.js";

// ROUTER
const router = Router();
router.use(authenticate);
router.use(requireFeature("suppliers"));
router.get("/",     list);
router.post("/",    authorize("admin","superAdmin"), create);
router.get("/:id",  getOne);
router.put("/:id",  authorize("admin","superAdmin"), update);
router.delete("/:id", authorize("admin","superAdmin"), remove);
export default router;
