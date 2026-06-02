"use strict";

/**
 * Quota Management Middleware
 * Stateful usage tracking for AI services
 */

class QuotaManager {
  constructor() {
    this.userQuotas = new Map(); // Track quotas per user
    this.cleanupInterval = setInterval(() => this.cleanup(), 3600 * 1000); // Hourly cleanup
  }

  /**
   * Get quota status for user
   */
  getUserQuota(userId) {
    if (!userId) return null;
    const today = new Date().toISOString().split("T")[0];
    const key = `${userId}_${today}`;

    if (!this.userQuotas.has(key)) {
      this.userQuotas.set(key, {
        requestsUsed: 0,
        costUsed: 0,
        requestsLimit: 1000,
        costLimit: 10.0,
      });
    }

    return this.userQuotas.get(key);
  }

  /**
   * Check if user has quota available
   */
  hasQuotaAvailable(userId) {
    const quota = this.getUserQuota(userId);
    if (!quota) return true;
    return (
      quota.requestsUsed < quota.requestsLimit &&
      quota.costUsed < quota.costLimit
    );
  }

  /**
   * Deduct quota
   */
  deductQuota(userId, cost = 0.0001) {
    const quota = this.getUserQuota(userId);
    if (!quota) return;
    quota.requestsUsed++;
    quota.costUsed += cost;
  }

  /**
   * Reset user quota
   */
  resetUserQuota(userId) {
    if (!userId) return;
    const today = new Date().toISOString().split("T")[0];
    this.userQuotas.delete(`${userId}_${today}`);
  }

  /**
   * Clean up old records
   */
  cleanup() {
    const today = new Date().toISOString().split("T")[0];
    for (const [key] of this.userQuotas) {
      if (!key.endsWith(today)) this.userQuotas.delete(key);
    }
  }
}

const quotaManager = new QuotaManager();

/**
 * Middleware for quota checking
 */
const quotaCheckMiddleware = (req, res, next) => {
  if (!req.user) return next();
  if (!quotaManager.hasQuotaAvailable(req.user.id)) {
    return res.status(429).json({
      success: false,
      error: "Daily quota exceeded",
    });
  }
  next();
};

/**
 * Middleware for quota deduction (after successful request)
 */
const quotaDeductionMiddleware = (req, res, next) => {
  if (!req.user) return next();
  const originalSend = res.send;
  res.send = function (data) {
    if (res.statusCode === 200) {
      quotaManager.deductQuota(req.user.id);
    }
    originalSend.call(this, data);
  };
  next();
};

module.exports = {
  quotaManager,
  quotaCheckMiddleware,
  quotaDeductionMiddleware,
};
