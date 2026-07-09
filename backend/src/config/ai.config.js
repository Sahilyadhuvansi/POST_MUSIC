"use strict";

require("dotenv").config();

module.exports = {
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: "llama-3.1-8b-instant",
    maxTokens: 1024,
    temperature: 0.7,
    enabled: !!process.env.GROQ_API_KEY,
  },

  agent: {
    sessionTTL: 30 * 60 * 1000,  // 30-min session memory window
    cacheTTL: 10 * 60 * 1000,    // 10-min response cache
    dailyCostLimit: 5.0,          // USD hard ceiling per day
  },

  features: {
    recommendations: true,
    moodPlaylists: true,
    trending: true,
  },

  // Kept for backwards-compatible imports in recommendation service
  cache: {
    ttl: { recommendations: 3600 },
  },
};
