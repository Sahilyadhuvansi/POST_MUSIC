"use strict";

/**
 * AI Performance Metrics & Analytics
 * Tracks and analyzes AI service performance in detail with pluggable storage
 */

/**
 * Analytics Storage Adapter
 * Designed for easy migration from Memory to DB
 */
class AnalyticsStore {
  constructor(storage = "memory") {
    this.storage = storage;
    this.data = {
      requests: [],
      responseTimes: [],
      parseResults: [],
      costs: [],
      errors: [],
    };
    this.aggregates = {
      hourly: {},
      daily: {},
    };
    this.maxRecords = 5000;
  }

  async save(type, entry) {
    if (this.storage === "db") {
      // Future: Implement DB persistence
      // return await AnalyticsModel.create({ type, ...entry });
    }

    // In-memory fallback
    if (this.data[type]) {
      this.data[type].push(entry);
      if (this.data[type].length > this.maxRecords) {
        this.data[type].shift();
      }
    }
    return entry;
  }

  get(type) {
    return this.data[type] || [];
  }
}

class PerformanceAnalytics {
  constructor() {
    this.store = new AnalyticsStore("memory");
  }

  /**
   * Record API request
   */
  async recordRequest(request) {
    return await this.store.save("requests", {
      timestamp: new Date().toISOString(),
      id: request.id,
      endpoint: request.endpoint,
      userId: request.userId,
      model: request.model,
      tokensIn: request.tokensIn,
      tokensOut: request.tokensOut,
    });
  }

  /**
   * Record response time
   */
  async recordResponseTime(endpoint, timeMs, success) {
    const hour = new Date().toISOString().substring(0, 13);
    return await this.store.save("responseTimes", {
      timestamp: new Date().toISOString(),
      endpoint,
      timeMs,
      success,
      hour,
    });
  }

  /**
   * Record parse result
   */
  async recordParseResult(endpoint, success, attempts = 1) {
    return await this.store.save("parseResults", {
      timestamp: new Date().toISOString(),
      endpoint,
      success,
      attempts,
    });
  }

  /**
   * Record cost
   */
  async recordCost(endpoint, cost, tokensUsed) {
    const day = new Date().toISOString().substring(0, 10);
    return await this.store.save("costs", {
      timestamp: new Date().toISOString(),
      endpoint,
      cost,
      tokensUsed,
      day,
    });
  }

  /**
   * Record error
   */
  async recordError(endpoint, errorType, message) {
    return await this.store.save("errors", {
      timestamp: new Date().toISOString(),
      endpoint,
      errorType,
      message,
    });
  }

  /**
   * Get comprehensive report
   */
  getComprehensiveReport() {
    const responseTimes = this.store.get("responseTimes");
    const costs = this.store.get("costs");
    const errors = this.store.get("errors");

    const totalRequests = responseTimes.length;
    const totalErrors = errors.length;
    const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalRequests,
        totalErrors,
        totalCost: totalCost.toFixed(4),
        errorRate:
          totalRequests > 0
            ? ((totalErrors / totalRequests) * 100).toFixed(2)
            : "0",
      },
      performance: {
        avgResponseTime:
          totalRequests > 0
            ? (
                responseTimes.reduce((sum, t) => sum + t.timeMs, 0) /
                totalRequests
              ).toFixed(2)
            : "0",
      },
    };
  }

  /**
   * Export all data
   */
  export() {
    return {
      timestamp: new Date().toISOString(),
      data: this.store.data,
      summary: this.getComprehensiveReport(),
    };
  }
}

const analytics = new PerformanceAnalytics();

/**
 * Middleware for tracking metrics automatically
 */
const analyticsMiddleware = (req, res, next) => {
  if (!req.path.startsWith("/api/ai/")) return next();

  const startTime = Date.now();
  const endpoint = req.path.replace("/api/ai/", "");

  const originalSend = res.send;
  res.send = function (data) {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode === 200;

    analytics.recordResponseTime(endpoint, responseTime, success);

    try {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (parsed?.success === false) {
        analytics.recordError(endpoint, "API_ERROR", parsed?.error);
      }
    } catch {
      // Ignore parse errors from non-JSON responses
    }

    originalSend.call(this, data);
  };

  next();
};

module.exports = {
  analytics,
  analyticsMiddleware,
  PerformanceAnalytics,
};
