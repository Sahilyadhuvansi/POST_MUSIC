"use strict";

const Groq = require("groq-sdk");
const crypto = require("crypto");
const config = require("../config/ai.config");
const logger = require("../utils/logger");
const redisCache = require("../utils/redis-cache");
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

    // In-memory cache is the fallback when Redis is unavailable
    this._cache = new Map();
    this._cacheTTL = config.agent.cacheTTL;
    this._cacheMax = 200;
    this._cost = 0;
    this._requests = 0;
    this._hits = 0;
    this._misses = 0;
    this._fallbacks = 0;
  }

  /**
   * Send messages to the LLM (Groq primary, Gemini fallback).
   * This is the single interface all agents use.
   * @param {Array<{role, content}>} messages  Conversation history (user/assistant turns).
   * @param {string|null}           systemPrompt  Optional system persona.
   * @param {object}                opts  temperature, maxTokens, expectJSON, tools, toolChoice.
   *   When `tools` (OpenAI-style function specs) is given, the result includes
   *   `toolCalls: [{ name, args }]` (empty array when the model answered in text).
   * @returns {{ content, raw, model, toolCalls? }}
   */
  async complete(messages, systemPrompt = null, opts = {}) {
    const {
      temperature = config.groq.temperature,
      maxTokens = config.groq.maxTokens,
      expectJSON = false,
      tools = null,
      toolChoice = "auto",
    } = opts;

    this._validateMessages(messages);

    const cacheKey = this._cacheKey({ messages, systemPrompt, temperature, tools, toolChoice, expectJSON });
    const cached = await this._fromCache(cacheKey);
    if (cached) return { ...cached, cached: true };

    const dailyReport = analytics.getComprehensiveReport();
    const budgetExhausted =
      parseFloat(dailyReport.summary.totalCost) >= config.agent.dailyCostLimit;

    let result;
    if (this._client && !budgetExhausted) {
      try {
        result = await this._completeGroq(messages, systemPrompt, { temperature, maxTokens, tools, toolChoice });
      } catch (err) {
        if (!config.gemini.enabled) throw err;
        logger.warn("Groq failed — falling back to Gemini", { error: err.message });
        this._fallbacks++;
        result = await this._completeGemini(messages, systemPrompt, { temperature, maxTokens, tools });
      }
    } else if (config.gemini.enabled) {
      this._fallbacks++;
      result = await this._completeGemini(messages, systemPrompt, { temperature, maxTokens, tools });
    } else if (budgetExhausted) {
      throw new Error("Daily AI budget exhausted. Please try again tomorrow.");
    } else {
      throw new Error("No AI provider configured. Set GROQ_API_KEY or GEMINI_API_KEY.");
    }

    if (expectJSON) result.content = this._extractJSON(result.raw);
    await this._toCache(cacheKey, result);
    return result;
  }

  // ─── Providers ──────────────────────────────────────────────────────────────

  async _completeGroq(messages, systemPrompt, { temperature, maxTokens, tools, toolChoice }) {
    const payload = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    const response = await this._client.chat.completions.create({
      model: config.groq.model,
      messages: payload,
      temperature,
      max_tokens: maxTokens,
      ...(tools ? { tools, tool_choice: toolChoice } : {}),
    });

    const choice = response.choices[0].message;
    const raw = choice.content ?? "";
    this._trackCost(response.usage);

    const result = { content: raw.trim(), raw, model: config.groq.model };
    if (tools) {
      result.toolCalls = (choice.tool_calls ?? []).map((tc) => ({
        name: tc.function.name,
        args: this._safeParse(tc.function.arguments),
      }));
    }
    return result;
  }

  async _completeGemini(messages, systemPrompt, { temperature, maxTokens, tools }) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;

    const body = {
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    };
    if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };
    if (tools) {
      body.tools = [{
        functionDeclarations: tools.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          parameters: this._geminiSchema(t.function.parameters),
        })),
      }];
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text().catch(() => "")}`);

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const raw = parts.map((p) => p.text ?? "").join("");
    this._trackCost(null, "gemini"); // free tier — flat nominal cost

    const result = { content: raw.trim(), raw, model: config.gemini.model };
    if (tools) {
      result.toolCalls = parts
        .filter((p) => p.functionCall)
        .map((p) => ({ name: p.functionCall.name, args: p.functionCall.args ?? {} }));
    }
    return result;
  }

  // Gemini's Schema proto only accepts a subset of JSON Schema — allowlist the
  // supported fields and drop everything else zod emits ($schema, default, …).
  _geminiSchema(schema) {
    if (!schema || typeof schema !== "object") return schema;
    if (Array.isArray(schema)) return schema.map((s) => this._geminiSchema(s));
    const ALLOWED = new Set([
      "type", "description", "enum", "format", "items",
      "properties", "required", "nullable",
    ]);
    const out = {};
    for (const [k, v] of Object.entries(schema)) {
      if (!ALLOWED.has(k)) continue;
      // `properties` maps arbitrary names → sub-schemas; recurse into values only
      out[k] = k === "properties"
        ? Object.fromEntries(Object.entries(v).map(([p, s]) => [p, this._geminiSchema(s)]))
        : this._geminiSchema(v);
    }
    return out;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  _safeParse(text) {
    try {
      return JSON.parse(text || "{}");
    } catch {
      return {};
    }
  }

  _validateMessages(messages) {
    if (!Array.isArray(messages) || !messages.length) {
      throw new Error("Messages must be a non-empty array.");
    }
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (!lastUser) return;
    if (typeof lastUser.content !== "string") {
      throw new Error("Message content must be a string.");
    }
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
    return "ai:resp:" + crypto.createHash("sha256").update(JSON.stringify(params)).digest("hex");
  }

  async _fromCache(key) {
    // Redis first (survives restarts, shared across instances), then local Map
    const remote = await redisCache.getJSON(key);
    if (remote) { this._hits++; return remote; }

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

  async _toCache(key, value) {
    const stored = await redisCache.setJSON(key, value, this._cacheTTL);
    if (stored) return;

    if (this._cache.size >= this._cacheMax) {
      this._cache.delete(this._cache.keys().next().value);
    }
    this._cache.set(key, { value, at: Date.now() });
  }

  _trackCost(usage, provider = "groq") {
    this._requests++;
    // Per-call delta — analytics sums these, so never pass a running total here
    const cost = usage
      ? usage.prompt_tokens * 0.00000005 + usage.completion_tokens * 0.00000015
      : 0.0001;
    this._cost += cost;
    analytics.recordCost(provider, cost, usage?.total_tokens ?? 0);
  }

  stats() {
    const total = this._hits + this._misses;
    return {
      requests: this._requests,
      cost: this._cost.toFixed(6),
      fallbacks: this._fallbacks,
      providers: {
        groq: this._client ? "operational" : "unconfigured",
        gemini: config.gemini.enabled ? "standby" : "unconfigured",
      },
      cache: {
        size: this._cache.size,
        hitRate: total > 0 ? `${((this._hits / total) * 100).toFixed(1)}%` : "0%",
      },
      status: this._client || config.gemini.enabled ? "operational" : "unconfigured",
    };
  }
}

module.exports = new AIService();
