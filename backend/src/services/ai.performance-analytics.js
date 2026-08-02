"use strict";

class Analytics {
  constructor() {
    this._costs = [];
    this._times = [];
    this._errors = [];
    this._MAX = 5000;
  }

  recordCost(endpoint, cost, tokensUsed) {
    this._push(this._costs, { at: Date.now(), endpoint, cost: cost || 0, tokensUsed: tokensUsed || 0 });
  }

  recordResponseTime(endpoint, ms, success) {
    this._push(this._times, { at: Date.now(), endpoint, ms, success });
  }

  recordError(endpoint, type, message) {
    this._push(this._errors, { at: Date.now(), endpoint, type, message });
  }

  _push(arr, entry) {
    arr.push(entry);
    if (arr.length > this._MAX) arr.shift();
  }

  getComprehensiveReport() {
    const total = this._times.length;
    // "Daily" budget window — only count costs from the last 24h
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const totalCost = this._costs.reduce(
      (sum, c) => (c.at >= dayAgo ? sum + c.cost : sum),
      0,
    );
    return {
      summary: {
        totalRequests: total,
        totalErrors: this._errors.length,
        totalCost: totalCost.toFixed(6),
        errorRate: total > 0 ? ((this._errors.length / total) * 100).toFixed(2) : "0",
      },
      performance: {
        avgResponseTime:
          total > 0
            ? (this._times.reduce((sum, t) => sum + t.ms, 0) / total).toFixed(2)
            : "0",
      },
    };
  }
}

const analytics = new Analytics();

// Hooked into app.use() in index.js — tracks latency and errors for every /api/ai/* request
const analyticsMiddleware = (req, res, next) => {
  if (!req.path.startsWith("/api/ai")) return next();

  const start = Date.now();
  const endpoint = req.path.replace("/api/ai/", "");
  const orig = res.send.bind(res);

  res.send = function (body) {
    analytics.recordResponseTime(endpoint, Date.now() - start, res.statusCode === 200);
    try {
      const parsed = typeof body === "string" ? JSON.parse(body) : body;
      if (parsed?.success === false) analytics.recordError(endpoint, "API_ERROR", parsed.error);
    } catch { /* non-JSON response — skip */ }
    return orig(body);
  };

  next();
};

module.exports = { analytics, analyticsMiddleware };
