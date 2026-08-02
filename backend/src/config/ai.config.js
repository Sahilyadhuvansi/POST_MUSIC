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

  // Fallback provider when Groq is unconfigured, erroring, or budget-capped
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-2.0-flash",
    enabled: !!process.env.GEMINI_API_KEY,
  },

  // Local embeddings via transformers.js — no API key needed
  embeddings: {
    model: "Xenova/all-MiniLM-L6-v2",
    dimensions: 384,
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
    webSearch: true,
    semanticSearch: true,
  },

  // Kept for backwards-compatible imports in recommendation service
  cache: {
    ttl: { recommendations: 3600 },
  },
};
