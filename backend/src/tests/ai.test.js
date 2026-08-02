"use strict";

/**
 * AI feature tests — planner validation, tool specs, providers, and fallbacks.
 * Conventions: mocha + chai, sinon sandbox per test, singletons stubbed directly.
 * No network calls — Groq/Gemini/DuckDuckGo are stubbed at service boundaries.
 */

const { expect } = require("chai");
const sinon = require("sinon");

const aiService = require("../services/ai.service");
const embeddingService = require("../services/embedding.service");
const { TOOLS, toLLMSpec } = require("../features/ai/ai.tool-handlers");
const { resolveOrdinal } = require("../features/ai/ai.context-resolver");
const { validatePlan } = require("../features/ai/ai.agent");
const { healthChecker } = require("../features/ai/ai.health");
const { analytics } = require("../services/ai.performance-analytics");

describe("AI service", () => {
  let sandbox;
  beforeEach(() => { sandbox = sinon.createSandbox(); });
  afterEach(() => sandbox.restore());

  describe("_extractJSON", () => {
    it("parses fenced JSON objects", () => {
      const out = aiService._extractJSON('```json\n{"tool":"search_music"}\n```');
      expect(out).to.deep.equal({ tool: "search_music" });
    });

    it("parses bare arrays", () => {
      expect(aiService._extractJSON('["a","b"]')).to.deep.equal(["a", "b"]);
    });

    it("returns null for garbage", () => {
      expect(aiService._extractJSON("not json at all")).to.equal(null);
    });
  });

  describe("_validateMessages", () => {
    it("rejects empty message arrays", () => {
      expect(() => aiService._validateMessages([])).to.throw("non-empty");
    });

    it("rejects over-length user messages", () => {
      const messages = [{ role: "user", content: "x".repeat(2001) }];
      expect(() => aiService._validateMessages(messages)).to.throw("character limit");
    });

    it("accepts normal messages", () => {
      expect(() => aiService._validateMessages([{ role: "user", content: "hi" }])).to.not.throw();
    });
  });

  describe("stats", () => {
    it("reports both providers", () => {
      const s = aiService.stats();
      expect(s.providers).to.have.keys(["groq", "gemini"]);
      expect(s).to.have.property("fallbacks");
    });
  });

  describe("provider fallback", () => {
    it("falls back to Gemini and counts it when Groq errors", async () => {
      const config = require("../config/ai.config");
      sandbox.replace(config.gemini, "enabled", true);
      sandbox.replace(aiService, "_client", {}); // pretend Groq is configured
      sandbox.stub(aiService, "_completeGroq").rejects(new Error("groq down"));
      sandbox.stub(aiService, "_completeGemini").resolves({
        content: "from gemini", raw: "from gemini", model: config.gemini.model,
      });

      const before = aiService._fallbacks;
      const result = await aiService.complete(
        [{ role: "user", content: `fallback test ${Math.random()}` }],
      );

      expect(result.model).to.equal(config.gemini.model);
      expect(aiService._fallbacks).to.equal(before + 1);
    });

    it("rethrows Groq errors when Gemini is not configured", async () => {
      const config = require("../config/ai.config");
      sandbox.replace(config.gemini, "enabled", false);
      sandbox.replace(aiService, "_client", {});
      sandbox.stub(aiService, "_completeGroq").rejects(new Error("groq down"));

      try {
        await aiService.complete([{ role: "user", content: `no-fallback ${Math.random()}` }]);
        throw new Error("should have thrown");
      } catch (err) {
        expect(err.message).to.equal("groq down");
      }
    });
  });

  describe("_geminiSchema", () => {
    it("allowlists only Gemini-supported schema fields", () => {
      const out = aiService._geminiSchema({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        additionalProperties: false,
        properties: {
          source: { type: "string", enum: ["spotify", "youtube"], default: "spotify" },
        },
        required: ["source"],
      });
      expect(out).to.not.have.any.keys(["$schema", "additionalProperties"]);
      expect(out.properties.source).to.have.keys(["type", "enum"]);
      expect(out.required).to.deep.equal(["source"]);
    });
  });

  describe("_trackCost", () => {
    it("records per-call deltas, not running totals", () => {
      const before = parseFloat(analytics.getComprehensiveReport().summary.totalCost);
      aiService._trackCost({ prompt_tokens: 1000, completion_tokens: 1000, total_tokens: 2000 });
      aiService._trackCost({ prompt_tokens: 1000, completion_tokens: 1000, total_tokens: 2000 });
      const after = parseFloat(analytics.getComprehensiveReport().summary.totalCost);
      // Two identical calls add exactly 2× the per-call cost (quadratic bug would add 3×)
      expect(after - before).to.be.closeTo(2 * (1000 * 0.00000005 + 1000 * 0.00000015), 1e-9);
    });
  });
});

describe("Tool registry", () => {
  it("every tool has description, requiresAuth, zod parameters, and handler", () => {
    for (const [name, def] of Object.entries(TOOLS)) {
      expect(def.description, name).to.be.a("string");
      expect(def.requiresAuth, name).to.be.a("boolean");
      expect(def.parameters?.safeParse, `${name}.parameters is zod`).to.be.a("function");
      expect(def.handler, name).to.be.a("function");
    }
  });

  it("includes the new web_search and semantic_search_music tools", () => {
    expect(TOOLS).to.include.keys(["web_search", "semantic_search_music"]);
    expect(TOOLS.web_search.requiresAuth).to.equal(false);
  });

  it("toLLMSpec produces OpenAI-style function specs", () => {
    const spec = toLLMSpec();
    expect(spec).to.have.length(Object.keys(TOOLS).length);
    for (const t of spec) {
      expect(t.type).to.equal("function");
      expect(t.function.name).to.be.a("string");
      expect(t.function.parameters).to.have.property("type", "object");
    }
  });

  it("validates and coerces tool args via zod", () => {
    const good = TOOLS.search_music.parameters.safeParse({ query: "lofi" });
    expect(good.success).to.equal(true);

    const bad = TOOLS.batch_like.parameters.safeParse({ tracks: "not-an-array" });
    expect(bad.success).to.equal(false);

    const defaulted = TOOLS.import_playlist.parameters.safeParse({ url: "https://x" });
    expect(defaulted.success).to.equal(true);
    expect(defaulted.data.source).to.equal("spotify");
  });
});

describe("Context resolver", () => {
  it("resolves ordinal words and numbers", () => {
    const session = { lastResults: [{}, {}, {}] };
    expect(resolveOrdinal("play the first one", session)).to.equal(0);
    expect(resolveOrdinal("save 3", session)).to.equal(2);
    expect(resolveOrdinal("the last one", session)).to.equal(2);
    expect(resolveOrdinal("no reference here", session)).to.equal(null);
  });

  it("does not treat numbers inside titles as selections", () => {
    const session = { lastResults: Array(10).fill({}) };
    expect(resolveOrdinal("play 7 rings", session)).to.equal(null);
    expect(resolveOrdinal("play blink 182", session)).to.equal(null);
    expect(resolveOrdinal("play top 10 hits of 2024", session)).to.equal(null);
  });

  it("resolves explicit numeric references", () => {
    const session = { lastResults: Array(10).fill({}) };
    expect(resolveOrdinal("play the 3rd song", session)).to.equal(2);
    expect(resolveOrdinal("number 2", session)).to.equal(1);
    expect(resolveOrdinal("play #4", session)).to.equal(3);
  });
});

describe("Planner validation", () => {
  it("returns validated args for a known tool", () => {
    const plan = validatePlan({ name: "search_music", args: { query: "lofi" } });
    expect(plan).to.deep.equal({ tool: "search_music", args: { query: "lofi" } });
  });

  it("rejects unknown tools", () => {
    expect(validatePlan({ name: "drop_database", args: {} })).to.equal(null);
  });

  it("never forwards raw args when zod validation fails", () => {
    // Mongo operator smuggling attempt — must not reach the handler
    const plan = validatePlan({ name: "delete_song", args: { songId: { $gt: "" } } });
    expect(plan).to.equal(null);
  });
});

describe("Embedding service", () => {
  it("cosine of identical normalized vectors is ~1", () => {
    const v = [0.6, 0.8];
    expect(embeddingService.cosine(v, v)).to.be.closeTo(1, 1e-9);
  });

  it("cosine handles mismatched or empty vectors", () => {
    expect(embeddingService.cosine([1], [1, 2])).to.equal(0);
    expect(embeddingService.cosine(null, [1])).to.equal(0);
  });
});

describe("AI health", () => {
  it("quick status reports groq and gemini", () => {
    const s = healthChecker.getQuickStatus();
    expect(s).to.have.keys(["status", "service", "groq", "gemini"]);
    expect(s.gemini.role).to.equal("fallback");
  });

  it("detailed status includes performance metrics", () => {
    const s = healthChecker.getDetailedStatus();
    expect(s.performance.uptimeSeconds).to.be.a("number");
    expect(s.performance.memoryMB).to.be.a("number");
  });
});
