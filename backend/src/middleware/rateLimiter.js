import rateLimit from "express-rate-limit";

const handler = (_req, _res, next, opts) => { const e = new Error(opts.message); e.statusCode = 429; next(e); };
const skip = () => process.env.NODE_ENV === "test";

export const generalLimiter = rateLimit({ windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS)||900000, max: parseInt(process.env.RATE_LIMIT_MAX)||200, standardHeaders: true, legacyHeaders: false, message: "Too many requests.", handler, skip });
export const authLimiter = rateLimit({ windowMs: 15*60*1000, max: parseInt(process.env.AUTH_RATE_LIMIT_MAX)||20, standardHeaders: true, legacyHeaders: false, message: "Too many auth attempts.", handler, skip });
export const strictLimiter = rateLimit({ windowMs: 60*60*1000, max: 5, standardHeaders: true, legacyHeaders: false, message: "Too many requests for this action.", handler, skip });
