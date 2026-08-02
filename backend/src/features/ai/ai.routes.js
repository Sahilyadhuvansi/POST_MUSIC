"use strict";

const router = require("express").Router();
const controller = require("./ai.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const { aiRateLimiter } = require("../../middlewares/ai.rate-limiter");
const { quotaCheckMiddleware, quotaDeductionMiddleware } = require("../../middlewares/quota.middleware");
const { validateChatInput } = require("../../middlewares/input-validation.middleware");

// Middleware stacks
const publicAI = [aiRateLimiter];
const privateAI = [authMiddleware, aiRateLimiter, quotaCheckMiddleware, quotaDeductionMiddleware];

// Attach req.user when a valid JWT is present, but never block guests
const optionalAuth = (req, _res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (!token) return next();
  try {
    req.user = require("jsonwebtoken").verify(token, process.env.JWT_SECRET);
  } catch { /* expired or invalid — treat as guest */ }
  next();
};

// ─── Music AI endpoints ────────────────────────────────────────────────────────
router.get("/health", (_req, res) => res.status(200).json(require("./ai.health").getQuickStatus()));
router.get("/recommendations", ...privateAI, controller.getRecommendations);
router.get("/similar/:musicId", ...publicAI, controller.findSimilar);
router.post("/mood-playlist", ...publicAI, controller.moodPlaylist);
router.get("/trending", ...publicAI, controller.getTrending);
router.get("/tools", controller.getTools);
router.get("/stats", authMiddleware, controller.getStats);

// Agentic chat — guests allowed; auth-required tools surface a helpful login prompt
router.post(
  "/chat",
  optionalAuth,
  aiRateLimiter,
  quotaCheckMiddleware,
  quotaDeductionMiddleware,
  validateChatInput,
  controller.chat,
);

module.exports = router;
