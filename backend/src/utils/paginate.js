export const paginate = async (Model, query = {}, options = {}) => {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const sort = options.sort || { createdAt: -1 };

  let q = Model.find(query).sort(sort).skip(skip).limit(limit);
  if (options.select) q = q.select(options.select);
  if (options.populate) q = q.populate(options.populate);
  if (options.lean === true) q = q.lean();

  const [docs, totalDocs] = await Promise.all([q, Model.countDocuments(query)]);
  return { docs, totalDocs, limit, page, totalPages: Math.ceil(totalDocs / limit) };
};
