export class ApiResponse {
  constructor(statusCode, message, data = null, meta = null) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    if (data !== null) this.data = data;
    if (meta !== null) this.meta = meta;
  }
  send(res) { return res.status(this.statusCode).json(this); }
  static ok(res, msg = "Success", data = null, meta = null) { return new ApiResponse(200, msg, data, meta).send(res); }
  static created(res, msg = "Created", data = null) { return new ApiResponse(201, msg, data).send(res); }
  static noContent(res) { return res.status(204).send(); }
  static paginated(res, msg, { docs, totalDocs, limit, page, totalPages }) {
    return new ApiResponse(200, msg, docs, { totalDocs, limit, currentPage: page, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 }).send(res);
  }
}
