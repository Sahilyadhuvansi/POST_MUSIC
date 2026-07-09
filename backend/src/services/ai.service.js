"use strict";

const Groq = require("groq-sdk");
const crypto = require("crypto");
const config = require("../config/ai.config");
const { analytics } = require("./ai.performance-analytics");

const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /system\s+prompt/i,
  /act\s+as\s+/i,
  /dan\s+mode/i,
  /jailbreak/i,
];

const MAX_INPUT_LEN = 2000;

class AIService {
  constructor() {
    this._client = config.groq.enabled
      ? new Groq({ apiKey: config.groq.apiKey })
      : null;

    this._cache = new Map();
    this._cacheTTL = config.agent.cacheTTL;
    this._cacheMax = 200;
    this._cost = 0;
    this._requests = 0;
    this._hits = 0;
    this._misses = 0;
  }

  /**
   * Send messages to Groq. This is the single interface all agents use.
   * @param {Array<{role, content}>} messages  Conversation history (user/assistant turns).
   * @param {string|null}           systemPrompt  Optional system persona.
   * @param {object}                opts  temperature, maxTokens, expectJSON.
   */
  async complete(messages, systemPrompt = null, opts = {}) {
    const {
      temperature = config.groq.temperature,
      maxTokens = config.groq.maxTokens,
      expectJSON = false,
    } = opts;

    this._validateMessages(messages);

    const cacheKey = this._cacheKey({ messages, systemPrompt, temperature });
    const cached = this._fromCache(cacheKey);
    if (cached) return { ...cached, cached: true };

    const dailyReport = analytics.getComprehensiveReport();
    if (parseFloat(dailyReport.summary.totalCost) >= config.agent.dailyCostLimit) {
      throw new Error("Daily AI budget exhausted. Please try again tomorrow.");
    }

    if (!this._client) throw new Error("Groq is not configured. Check GROQ_API_KEY.");

    const payload = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    const response = await this._client.chat.completions.create({
      model: config.groq.model,
      messages: payload,
      temperature,
      max_tokens: maxTokens,
    });

    const raw = response.choices[0].message.content ?? "";
    const content = expectJSON ? this._extractJSON(raw) : raw.trim();

    this._trackCost(response.usage);
    const result = { content, raw, model: config.groq.model };
    this._toCache(cacheKey, result);
    return result;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  _validateMessages(messages) {
    if (!Array.isArray(messages) || !messages.length) {
      throw new Error("Messages must be a non-empty array.");
    }
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser) return;
    if (lastUser.content.length > MAX_INPUT_LEN) {
      throw new Error(`Message exceeds ${MAX_INPUT_LEN} character limit.`);
    }
    const riskHits = INJECTION_PATTERNS.filter(p => p.test(lastUser.content)).length;
    if (riskHits >= 2) throw new Error("Message contains disallowed content.");
  }

  _extractJSON(text) {
    const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const obj = clean.match(/\{[\s\S]*\}/);
    const arr = clean.match(/\[[\s\S]*\]/);
    try {
      if (obj) return JSON.parse(obj[0]);
      if (arr) return JSON.parse(arr[0]);
      return JSON.parse(clean);
    } catch {
      return null;
    }
  }

  _cacheKey(params) {
    return crypto.createHash("sha256").update(JSON.stringify(params)).digest("hex");
  }

  _fromCache(key) {
    const entry = this._cache.get(key);
    if (!entry) { this._misses++; return null; }
    if (Date.now() - entry.at > this._cacheTTL) {
      this._cache.delete(key);
      this._misses++;
      return null;
    }
    this._hits++;
    return entry.value;
  }

  _toCache(key, value) {
    if (this._cache.size >= this._cacheMax) {
      this._cache.delete(this._cache.keys().next().value);
    }
    this._cache.set(key, { value, at: Date.now() });
  }

  _trackCost(usage) {
    this._requests++;
    const cost = usage
      ? usage.prompt_tokens * 0.00000005 + usage.completion_tokens * 0.00000015
      : 0.0001;
    this._cost += cost;
    analytics.recordCost("groq", this._cost, usage?.total_tokens ?? 0);
  }

  stats() {
    const total = this._hits + this._misses;
    return {
      requests: this._requests,
      cost: this._cost.toFixed(6),
      cache: {
        size: this._cache.size,
        hitRate: total > 0 ? `${((this._hits / total) * 100).toFixed(1)}%` : "0%",
      },
      status: this._client ? "operational" : "unconfigured",
    };
  }
}

module.exports = new AIService();
