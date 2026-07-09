"use strict";

class QuotaManager {
  constructor() {
    this._quotas = new Map();
    // Daily cleanup — remove yesterday's entries every hour
    setInterval(() => {
      const today = new Date().toISOString().slice(0, 10);
      for (const key of this._quotas.keys()) {
        if (!key.endsWith(today)) this._quotas.delete(key);
      }
    }, 3_600_000);
  }

  _key(userId) {
    return `${userId}:${new Date().toISOString().slice(0, 10)}`;
  }

  _get(userId) {
    const key = this._key(userId);
    if (!this._quotas.has(key)) {
      this._quotas.set(key, { requests: 0, requestsLimit: 1000 });
    }
    return this._quotas.get(key);
  }

  hasQuota(userId) {
    const q = this._get(userId);
    return q.requests < q.requestsLimit;
  }

  deduct(userId) {
    this._get(userId).requests++;
  }
}

const quotaManager = new QuotaManager();

const quotaCheckMiddleware = (req, res, next) => {
  if (!req.user) return next();
  if (!quotaManager.hasQuota(req.user.id)) {
    return res.status(429).json({ success: false, error: "Daily AI quota exceeded. Resets at midnight." });
  }
  next();
};

const quotaDeductionMiddleware = (req, res, next) => {
  if (!req.user) return next();
  const orig = res.send.bind(res);
  res.send = function (body) {
    if (res.statusCode === 200) quotaManager.deduct(req.user.id);
    return orig(body);
  };
  next();
};

module.exports = { quotaManager, quotaCheckMiddleware, quotaDeductionMiddleware };
