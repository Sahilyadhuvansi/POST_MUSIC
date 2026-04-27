"use strict";

/**
 * backend Constants
 * Centralized values for configuration and business logic constraints
 */

module.exports = {
  // Pagination Defaults
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,

  // File Upload Constraints
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
  ALLOWED_AUDIO_TYPES: ["audio/mpeg", "audio/wav", "audio/ogg"],

  // AI Quota Defaults
  DAILY_FREE_QUOTA: 50,
  PREMIUM_DAILY_QUOTA: 500,

  // Cache Durations (in seconds)
  CACHE_SHORT: 60, // 1 minute
  CACHE_MEDIUM: 300, // 5 minutes
  CACHE_LONG: 3600, // 1 hour

  // Security
  JWT_EXPIRE: "30d",
  COOKIE_EXPIRE: 30, // days

  // YouTube Content Constraints
  MIN_TRACK_DURATION_SECONDS: 90,
  MAX_TRACK_DURATION_SECONDS: 360,
};
