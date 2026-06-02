"use strict";

require("dotenv").config();

/**
 * AI Services Configuration for Music Discover
 * Centralized configuration for all AI/ML services used in the application.
 */
module.exports = {
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.1-8b-instant", // Switched to faster model for production stability
    maxTokens: 4096,
    temperature: 0.7,
    enabled: !!process.env.GROQ_API_KEY,
  },

  googleVision: {
    keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    enabled: !!process.env.GOOGLE_CLOUD_KEY_FILE,
  },

  models: {
    // How strictly should we flag inappropriate content? (0.8 = 80% confidence required)
    moderation: {
      enabled: true,
      threshold: 0.8,
    },

    // Music Recommendation weights
    recommendation: {
      enabled: true,
      historyWeight: 0.6,
      genreWeight: 0.2,
      moodWeight: 0.2,
    },
  },

  features: {
    aiRecommendations: true,
    contentModeration: true,
    captionGeneration: true,
    hashtagSuggestion: true,
    moodPlaylists: true,
    trendingInsights: true,
  },

  cache: {
    ttl: {
      recommendations: 3600,
      trends: 1800,
      moderation: 86400,
    },
    maxSize: 1000,
  },

  rateLimits: {
    aiGen: {
      windowMs: 60000, // 1 minute
      max: 10, // max 10 requests per minute
    },
  },

  costLimits: {
    dailyBudget: 5.0,
    warningThreshold: 0.8,
  },
};
