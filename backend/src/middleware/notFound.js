import { ApiError } from "../utils/ApiError.js";
export default (req, _res, next) => next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
