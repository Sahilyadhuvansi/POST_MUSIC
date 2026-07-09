"use strict";

const rateLimit = require("express-rate-limit");

const createRateLimiter = ({ windowMs = 60_000, max = 20 } = {}) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id ?? req.ip ?? "anon",
    skip: (req) => req.path.includes("/health"),
    message: { success: false, error: "Too many requests. Please slow down.", retryAfter: windowMs },
  });

module.exports = {
  createRateLimiter,
  aiRateLimiter: createRateLimiter({ windowMs: 60_000, max: 20 }),
};
