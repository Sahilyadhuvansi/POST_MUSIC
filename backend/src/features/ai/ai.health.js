"use strict";

const config = require("../../config/ai.config");

const getAIHealth = () => ({
  status: config.groq.enabled || config.gemini.enabled ? "ok" : "unconfigured",
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  memory: process.memoryUsage(),
  service: { name: "AI Service", version: "3.0.0" },
  groq: { enabled: config.groq.enabled, model: config.groq.model },
  gemini: { enabled: config.gemini.enabled, model: config.gemini.model, role: "fallback" },
});

const getQuickStatus = () => {
  const h = getAIHealth();
  return { status: h.status, service: h.service, groq: h.groq, gemini: h.gemini };
};

const getDetailedStatus = () => {
  const h = getAIHealth();
  return {
    ...h,
    configuration: { enabled: h.groq.enabled || h.gemini.enabled, model: h.groq.model },
    performance: {
      uptimeSeconds: Math.floor(h.uptime),
      memoryMB: Math.floor(h.memory.heapUsed / 1024 / 1024),
    },
    health: h.status,
    issues: [],
  };
};

module.exports = {
  getAIHealth,
  getQuickStatus,
  getDetailedStatus,
  healthChecker: { getAIHealth, getQuickStatus, getDetailedStatus },
};
