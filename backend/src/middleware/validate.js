import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";

export const validate = (schema, source = "body") => (req, _res, next) => {
  try {
    req[source] = schema.parse(req[source]);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.errors.map(e => ({ field: e.path.join("."), message: e.message }));
      return next(new ApiError(422, "Validation failed", errors));
    }
    next(err);
  }
};
