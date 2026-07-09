"use strict";

const getAIHealth = () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  memory: process.memoryUsage(),
  service: { name: "AI Service", version: "2.0.0" },
  groq: { enabled: !!process.env.GROQ_API_KEY, model: "llama-3.1-8b-instant" },
});

const getQuickStatus = () => {
  const h = getAIHealth();
  return { status: h.status, service: h.service, groq: h.groq };
};

const getDetailedStatus = () => {
  const h = getAIHealth();
  return {
    ...h,
    configuration: { enabled: h.groq.enabled, model: h.groq.model },
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
