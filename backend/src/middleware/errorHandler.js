import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import logger from "../utils/logger.js";

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  if (err instanceof mongoose.Error.CastError)
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  else if (err instanceof mongoose.Error.ValidationError)
    error = new ApiError(422, "Validation failed", Object.values(err.errors).map(e => ({ field: e.path, message: e.message })));
  else if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] ?? "field";
    error = ApiError.conflict(`Duplicate value for '${field}'`);
  } else if (err.name === "TokenExpiredError") error = ApiError.unauthorized("Token expired");
  else if (err.name === "JsonWebTokenError") error = ApiError.unauthorized("Invalid token");

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = process.env.NODE_ENV === "production" && statusCode === 500 ? "Internal Server Error" : error.message;
    error = new ApiError(statusCode, message);
  }

  if (error.statusCode >= 500) logger.error({ message: error.message, path: req.path, stack: error.stack });
  else logger.warn({ message: error.message, statusCode: error.statusCode, path: req.path });

  return res.status(error.statusCode).json({
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors?.length ? error.errors : undefined,
    ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
  });
};
export default errorHandler;
