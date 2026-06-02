"use strict";

// ============================================================================
// AI SERVICE - Music Discover API
// ============================================================================
// Status: Production-hardened with zero-log observability
// ============================================================================

const Groq = require("groq-sdk");
const crypto = require("crypto");
const aiConfig = require("../config/ai.config");
const { getRedisClient } = require("../utils/redis");

const { analytics } = require("./ai.performance-analytics");

const DAILY_COST_LIMIT = 5.0;
const MAX_CACHE_SIZE = 100;
const MAX_PAYLOAD_SIZE = 50000;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const SUSPICIOUS_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /system\s+prompt/i,
  /act\s+as\s+/i,
  /dan\s+mode/i,
  /jailbreak/i,
];

const ResponseSchema = {
  JSON_ARRAY: "json_array",
  JSON_OBJECT: "json_object",
  PLAIN_TEXT: "plain_text",
  STRUCTURED_JSON: "structured",
};

class AIService {
  constructor() {
    if (aiConfig.groq.enabled) {
      this.groq = new Groq({
        apiKey: aiConfig.groq.apiKey,
      });
    }

    this.requestCount = 0;
    this.totalCost = 0;
    this.failureLog = [];
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
    this._initRedis();
  }

  async _initRedis() {
    this.redis = await getRedisClient();
  }

  async chat(messages, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 4096,
      systemPrompt = null,
      responseSchema = ResponseSchema.PLAIN_TEXT,
      strict = false,
    } = options;

    const cacheKey = this._generateCacheKey({
      messages,
      systemPrompt,
      temperature,
      responseSchema,
    });

    try {
      // --- CACHE LAYER (Redis -> Map -> Fetch) ---
      let cachedEntry = null;

      if (this.redis) {
        const redisData = await this.redis.get(`ai_cache:${cacheKey}`);
        if (redisData) {
          this.recordHit();
          return JSON.parse(redisData);
        }
      } else {
        cachedEntry = this.cache.get(cacheKey);
        if (cachedEntry) {
          if (Date.now() - cachedEntry.timestamp < CACHE_TTL) {
            this.recordHit();
            return cachedEntry.value;
          }
          this.cache.delete(cacheKey);
        }
      }
      this.recordMiss();

      const validation = this._validateInput(messages);
      if (!validation.valid) {
        return this._createErrorResponse(
          "Invalid input format",
          validation.error,
        );
      }

      const dailyReport = analytics.getComprehensiveReport();
      const currentDailyCost = parseFloat(dailyReport.summary.totalCost);
      if (currentDailyCost >= DAILY_COST_LIMIT) {
        return this._createErrorResponse(
          "Service quota exceeded",
          "Daily AI usage limit reached. Circuit breaker active.",
        );
      }

      if (!this.groq) {
        return this._createErrorResponse(
          "Service unavailable",
          "Groq API not configured",
        );
      }

      const rawResponse = await this._groqChat(
        messages,
        systemPrompt,
        temperature,
        maxTokens,
      );

      if (!rawResponse.success) {
        return rawResponse;
      }

      const parsed = this._parseResponse(
        rawResponse.content,
        responseSchema,
        strict,
      );

      const finalResponse = {
        content: parsed.content,
        model: "groq",
        usage: rawResponse.usage,
        status: "success",
        parseSuccess: parsed.success,
      };

      this._setCache(cacheKey, finalResponse);
      return finalResponse;
    } catch (error) {
      this._logFailure("chat", error);
      return this._createErrorResponse("AI service error", error.message);
    }
  }

  _validateInput(messages) {
    if (!Array.isArray(messages))
      return { valid: false, error: "Messages must be an array" };
    if (messages.length === 0)
      return { valid: false, error: "Messages array cannot be empty" };

    for (let msg of messages) {
      if (!msg.role || !msg.content)
        return {
          valid: false,
          error: "Each message must have role and content",
        };
      if (!["user", "assistant", "system"].includes(msg.role))
        return { valid: false, error: `Invalid role: ${msg.role}` };
      if (typeof msg.content !== "string")
        return { valid: false, error: "Message content must be a string" };

      let riskScore = 0;
      for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(msg.content)) riskScore += 1;
      }
      if (riskScore >= 2)
        return {
          valid: false,
          error: "High-confidence prompt injection detected",
        };
      if (msg.content.length > 1000)
        return {
          valid: false,
          error: "Message too long (max 1000 chars for AI safety)",
        };
    }

    return { valid: true };
  }

  _parseResponse(text, schema = ResponseSchema.PLAIN_TEXT, strict = false) {
    const raw = text;
    try {
      if (schema === ResponseSchema.JSON_OBJECT) {
        const json = this._extractJSON(text, "object");
        if (json === null && strict)
          throw new Error("Could not extract JSON object from response");
        return { content: json || {}, success: json !== null, raw };
      }

      if (schema === ResponseSchema.JSON_ARRAY) {
        const json = this._extractJSON(text, "array");
        if (json === null && strict)
          throw new Error("Could not extract JSON array from response");
        return { content: json || [], success: json !== null, raw };
      }

      if (schema === ResponseSchema.STRUCTURED_JSON) {
        const json = this._extractJSON(text, "object");
        if (json === null && strict)
          throw new Error("Could not extract structured JSON from response");
        return { content: json || {}, success: json !== null, raw };
      }

      return { content: text.trim(), success: true, raw };
    } catch (error) {
      return {
        content: strict ? null : text.trim(),
        success: false,
        error: error.message,
        raw,
      };
    }
  }

  _extractJSON(text, type = "object") {
    if (!text || typeof text !== "string") return null;

    let cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/^```/gm, "")
      .trim();

    try {
      if (type === "array") {
        const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          const parsed = JSON.parse(arrayMatch[0]);
          if (Array.isArray(parsed)) return parsed;
        }
      }

      if (type === "object") {
        const objectMatch = cleaned.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          const parsed = JSON.parse(objectMatch[0]);
          if (typeof parsed === "object" && !Array.isArray(parsed))
            return parsed;
        }
      }

      const parsed = JSON.parse(cleaned);
      if (type === "array" && Array.isArray(parsed)) return parsed;
      if (type === "object" && typeof parsed === "object") return parsed;
    } catch {
      // Quietly fail extraction
    }
    return null;
  }

  async _groqChat(messages, systemPrompt, temperature, maxTokens) {
    try {
      const formattedMessages = systemPrompt
        ? [{ role: "system", content: systemPrompt }, ...messages]
        : messages;

      const response = await this.groq.chat.completions.create({
        model: aiConfig.groq.model,
        messages: formattedMessages,
        temperature,
        max_tokens: maxTokens,
      });

      this._trackUsage("groq", response.usage);

      return {
        success: true,
        content: response.choices[0].message.content,
        usage: response.usage,
      };
    } catch (error) {
      this._logFailure("groq_api", error);
      return { success: false, error: error.message, usage: null };
    }
  }

  _createErrorResponse(title, detail) {
    return {
      content: `Error: ${title}. ${detail}`,
      model: "error-fallback",
      usage: null,
      status: "error",
      error: { title, detail },
    };
  }

  _trackUsage(_provider, usage) {
    this.requestCount++;
    if (usage && usage.total_tokens) {
      const estimatedCost =
        usage.prompt_tokens * 0.00000005 + usage.completion_tokens * 0.00000015;
      this.totalCost += estimatedCost;
    } else {
      this.totalCost += 0.0001;
    }
  }

  _logFailure(component, error) {
    this.failureLog.push({
      component,
      error: error.message,
      timestamp: new Date(),
      stack: error.stack,
    });

    if (this.failureLog.length > 100) this.failureLog.shift();
  }

  clearFailureLog() {
    this.failureLog = [];
  }
  recordHit() {
    this.hits++;
  }
  recordMiss() {
    this.misses++;
  }

  _generateCacheKey(params) {
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(params))
      .digest("hex");
  }

  async _setCache(key, value) {
    if (JSON.stringify(value).length > MAX_PAYLOAD_SIZE) return;

    if (this.redis) {
      try {
        await this.redis.set(`ai_cache:${key}`, JSON.stringify(value), {
          EX: Math.floor(CACHE_TTL / 1000),
        });
      } catch {
        // Silently fail Redis set and use Map fallback
      }
    }

    if (this.cache.size >= MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      totalCost: this.totalCost.toFixed(4),
      avgCostPerRequest:
        this.requestCount > 0
          ? (this.totalCost / this.requestCount).toFixed(6)
          : 0,
      cache: {
        size: this.cache.size,
        hits: this.hits,
        misses: this.misses,
        hitRate:
          this.hits + this.misses > 0
            ? ((this.hits / (this.hits + this.misses)) * 100).toFixed(2) + "%"
            : "0%",
      },
      recentFailures: this.failureLog.slice(-5),
      status: this.groq ? "operational" : "unconfigured",
    };
  }
}

const aiService = new AIService();
module.exports = aiService;
