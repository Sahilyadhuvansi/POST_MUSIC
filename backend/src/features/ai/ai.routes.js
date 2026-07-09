"use strict";

const express = require("express");
const router = express.Router();
const aiController = require("./ai.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const { aiRateLimiter } = require("../../middlewares/ai.rate-limiter");
const {
  quotaCheckMiddleware,
  quotaDeductionMiddleware,
} = require("../../middlewares/quota.middleware");
const validation = require("../../middlewares/input-validation.middleware");

// Apply rate limiting and quotas to protected AI endpoints
const aiMiddleware = [
  authMiddleware,
  aiRateLimiter,
  quotaCheckMiddleware,
  quotaDeductionMiddleware,
];

// ═══════════════════════════════════════════════════════════════
// Music Recommendation Routes
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/ai/recommendations
 * @desc    Get personalized music recommendations
 * @access  Private
 */
router.get(
  "/recommendations",
  ...aiMiddleware,
  aiController.getRecommendations,
);

/**
 * @route   GET /api/ai/similar/:musicId
 * @desc    Find similar songs
 * @access  Public
 */
router.get("/similar/:musicId", aiRateLimiter, aiController.findSimilar);

/**
 * @route   POST /api/ai/mood-playlist
 * @desc    Generate mood-based playlist
 * @access  Public
 */
router.post("/mood-playlist", aiRateLimiter, aiController.moodPlaylist);

/**
 * @route   GET /api/ai/trending
 * @desc    Get trending music with AI insights
 * @access  Public
 */
router.get("/trending", aiRateLimiter, aiController.getTrending);


// Optional auth — attaches req.user if token present, but does NOT block guests
const optionalAuth = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (!token) return next();
  try {
    const jwt = require("jsonwebtoken");
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // invalid/expired token — treat as guest
  }
  next();
};

/**
 * @route   POST /api/ai/chat
 * @desc    General-purpose chat interface (Groq-powered, Floating Button)
 * @access  Public (guests allowed; auth-required tools return helpful message)
 */
router.post(
  "/chat",
  optionalAuth,
  aiRateLimiter,
  quotaCheckMiddleware,
  quotaDeductionMiddleware,
  validation.validateChatInput,
  aiController.chat,
);

/**
 * @route   GET /api/ai/tools
 * @desc    List available AI executable tools
 * @access  Public
 */
router.get("/tools", aiRateLimiter, aiController.getTools);



// ═══════════════════════════════════════════════════════════════
// Statistics
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/ai/stats
 * @desc    Get AI service statistics
 * @access  Private
 */
router.get("/stats", authMiddleware, aiController.getStats);

module.exports = router;
