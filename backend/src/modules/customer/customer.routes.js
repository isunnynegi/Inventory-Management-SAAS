import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate } from "../../utils/paginate.js";
import Customer from "./customer.model.js";
import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";

// LIST
export const list = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query;
  const filter = { organizationId: req.organizationId };
  if (search) filter.name = { $regex: search, $options: "i" };
  const result = await paginate(Customer, filter, { page, limit });
  return ApiResponse.paginated(res, "Customers", result);
});

// CREATE
export const create = asyncHandler(async (req, res) => {
  const doc = await Customer.create({ ...req.body, organizationId: req.organizationId, createdBy: req.user._id });
  return ApiResponse.created(res, "Customer created", doc);
});

// GET ONE
export const getOne = asyncHandler(async (req, res) => {
  const doc = await Customer.findOne({ _id: req.params.id, organizationId: req.organizationId });
  if (!doc) throw ApiError.notFound("Customer not found");
  return ApiResponse.ok(res, "Customer", doc);
});

// UPDATE
export const update = asyncHandler(async (req, res) => {
  const doc = await Customer.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.organizationId },
    { ...req.body, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!doc) throw ApiError.notFound("Customer not found");
  return ApiResponse.ok(res, "Customer updated", doc);
});

// DELETE
export const remove = asyncHandler(async (req, res) => {
  const doc = await Customer.findOne({ _id: req.params.id, organizationId: req.organizationId });
  if (!doc) throw ApiError.notFound("Customer not found");
  await doc.softDelete(req.user._id);
  return ApiResponse.ok(res, "Customer deleted");
});

// ROUTER
const router = Router();
router.use(authenticate);
router.get("/",     list);
router.post("/",    authorize("admin","superAdmin"), create);
router.get("/:id",  getOne);
router.put("/:id",  authorize("admin","superAdmin"), update);
router.delete("/:id", authorize("admin","superAdmin"), remove);
export default router;
