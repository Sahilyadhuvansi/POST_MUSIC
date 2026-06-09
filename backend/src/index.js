"use strict";

require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const morgan = require("morgan");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const authRoutes = require("./features/auth/auth.routes");
const userRoutes = require("./features/users/users.routes");
const musicRoutes = require("./features/music/music.routes");
const playlistRoutes = require("./features/playlists/playlists.routes");
const aiRoutes = require("./features/ai/ai.routes");
const requestId = require("./middlewares/request-id.middleware");
const performanceMiddleware = require("./middlewares/performance.middleware");
const errorHandler = require("./middlewares/error-handler.middleware");
const { analyticsMiddleware } = require("./services/ai.performance-analytics");
const logger = require("./utils/logger");

// ─── Env Status (Informational) ────────────────────────────────────────────────
const isConfigured = !!process.env.JWT_SECRET && !!process.env.MONGO_URI;
// Failure-resistant startup: Allow process to load for diagnostic /health endpoint

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "https://music-discover.vercel.app", // Definitive Production Origin
  /\.vercel\.app$/, // Any Vercel subdomain (Production/Preview)
  ...(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
];
if (process.env.frontend_URL) allowedOrigins.push(process.env.frontend_URL);

/**
 * CORS policy for Music Discover API.
 * Failure-resistant origin matching with wildcard support.
 */
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) {
      // In development, we allow API testing tools/Curl. In production, we restrict it.
      if (process.env.NODE_ENV === "development") return cb(null, true);
      return cb(null, false);
    }

    const isAllowed = allowedOrigins.some((allowed) => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      if (typeof allowed === "string") {
        return (
          origin === allowed ||
          (allowed.includes("*") &&
            new RegExp(allowed.replace(/\*/g, ".*")).test(origin))
        );
      }
      return false;
    });

    if (isAllowed) return cb(null, true);

    // Development fallback for local loopback
    if (
      process.env.NODE_ENV !== "production" &&
      (origin.startsWith("http://localhost") ||
        origin.startsWith("http://127.0.0.1"))
    ) {
      return cb(null, true);
    }

    return cb(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "X-Request-Id", // Ensure our new production tracing header is allowed
  ],
  exposedHeaders: ["X-Request-Id"], // Expose tracing header to the frontend
  maxAge: 86400, // Senior: Cache preflight results for 24 hours to reduce latency and console noise
};

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();

app.set("trust proxy", true); // Fully trust Vercel's proxy chain for IPv4/IPv6 client identification

// Connect DB (non-blocking for serverless)
let dbError = null;
connectDB().catch((err) => {
  dbError = err.message;
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors(corsOptions)); // CORS must be absolute first for preflight success
app.use(requestId); // FIRST: Assign unique ID to every request
app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        fontSrc: ["'self'", "'unsafe-inline'", "https:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts:
      process.env.NODE_ENV === "production"
        ? { maxAge: 31536000, includeSubDomains: true }
        : false,
  }),
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(performanceMiddleware); // Track latency for EVERY request
app.use(analyticsMiddleware); // Track AI performance after parsing

// ─── Rate Limiting ────────────────────────────────────────────────────────────
/**
 * Safe client identifier for distributed environments (Vercel/Cloudflare)
 */
const keyGenerator = (req) => {
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "anonymous";
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator, // v6: Robust IPv6 support for Vercel
  message: {
    success: false,
    error: "Too many requests. Please try again later.",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Stricter for login/register
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator, // v6: Robust IPv6 support for Vercel
  message: {
    success: false,
    error: "Too many auth attempts. Please try again later.",
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res
    .status(200)
    .json({ message: "Music Discover API is running", version: "1.0.0" });
});

app.get("/api/health", (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  const envValid = !!process.env.JWT_SECRET && !!process.env.MONGO_URI;
  const healthy = dbConnected && envValid;

  return res.status(healthy ? 200 : 503).json({
    status: healthy ? "healthy" : "unhealthy",
    database: dbConnected ? "connected" : "disconnected",
    environment: envValid ? "configured" : "missing_env_vars",
    ...(dbError && { dbError }),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", apiLimiter, userRoutes);
app.use("/api/music", apiLimiter, musicRoutes);
app.use("/api/playlists", apiLimiter, playlistRoutes);
app.use("/api/ai", apiLimiter, aiRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Startup Logic (Optimized for Render/Production) ───────────────────────────
const PORT = process.env.PORT || 10000;

async function startServer() {
  try {
    // 1. Database Connection
    await connectDB();
    logger.info("✅ Database connected successfully");

    // 2. Redis Connection (Optional layer — don't block server boot)
    const redisUrl = (process.env.REDIS_URL || "").trim();
    if (redisUrl) {
      const { getRedisClient } = require("./utils/redis");
      getRedisClient()
        .then(() => logger.info("✅ Redis connected (or fallback active)"))
        .catch((err) => logger.warn(`⚠️ Redis failed: ${err.message}`));
    } else {
      logger.info("ℹ️ Redis disabled (REDIS_URL not set)");
    }
  } catch (err) {
    logger.error(`❌ Startup critical failure: ${err.message}`);
  }

  // ─── FINAL LISTEN (Outside failure blocks — Render REQUIREMENT) ──────────────
  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`🚀 Music Discover backend active on 0.0.0.0:${PORT}`);
    if (!isConfigured) {
      logger.warn("⚠️ JWT_SECRET or MONGO_URI missing from environment!");
    }
  });
}

startServer();

module.exports = app;
