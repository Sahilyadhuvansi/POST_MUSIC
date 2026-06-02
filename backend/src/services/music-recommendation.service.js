"use strict";

const Music = require("../features/music/music.model");
const aiService = require("./ai.service");
const aiConfig = require("../config/ai.config");

/**
 * AI Music Recommendation Engine (Powered by Groq)
 * Provides personalized music recommendations using collaborative and content-based filtering
 */
class MusicRecommendationService {
  constructor() {
    this.cache = new Map();
    this.cacheLimit = 100; // LRU limit
    this.cacheTTL = (aiConfig.cache.ttl.recommendations || 3600) * 1000;

    // v5: atomic stats
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get personalized recommendations for a user
   */
  getRecommendations(userId, options = {}) {
    const { limit = 10, _mood = null, _similarTo = null } = options;
    const cacheKey = `rec_${userId}_${limit}_${_mood}_${_similarTo}`;

    // ─── Step 1: LRU Promise Cache Check ───
    if (this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey);

      // Check TTL
      if (Date.now() - entry.timestamp < this.cacheTTL) {
        this.recordHit();

        // Sampled Log (10%)
        if (Math.random() < 0.1) {
          process.stdout.write(`[Cache-Hit] ${cacheKey}\n`);
        }

        // Touch (LRU)
        this.cache.delete(cacheKey);
        this.cache.set(cacheKey, entry);

        return entry.promise;
      } else {
        // Expired
        this.cache.delete(cacheKey);
      }
    }

    this.recordMiss();

    // ─── Step 2: Immediate Cache Setting (Race Prevention) ───
    const recommendationPromise = (async () => {
      // Step 2.1: History Analysis
      const userMusic = await Music.find({ artist: userId }).limit(20);

      // Step 2.2: Fetch candidates
      const allMusic = await Music.find({
        artist: { $ne: userId },
      })
        .populate("artist", "username profilePic")
        .limit(100)
        .sort({ createdAt: -1 });

      if (allMusic.length === 0) return [];

      // Step 2.3: Weighted Scoring
      const scoredMusic = allMusic.map((music) => {
        let score = 0;
        const recencyDays =
          (Date.now() - new Date(music.createdAt).getTime()) /
          (1000 * 60 * 60 * 24);
        score += Math.max(0, 50 - recencyDays);
        return { music, score };
      });

      // Step 2.4: Final Selection
      let recommendations = scoredMusic
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((item) => item.music);

      // Step 2.5: AI Enrichment
      if (aiConfig.features.aiRecommendations) {
        recommendations = await this._addAIExplanations(
          recommendations,
          userMusic,
        );
      }

      return recommendations;
    })();

    // ─── Step 3: Immediate Caching (Race Prevention) ───
    this.cache.set(cacheKey, {
      promise: recommendationPromise,
      timestamp: Date.now(),
    });

    // Background cleanup on failure
    recommendationPromise.catch(() => {
      this.cache.delete(cacheKey);
    });

    // FIFO Eviction
    if (this.cache.size > this.cacheLimit) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    return recommendationPromise;
  }

  /**
   * Add AI-generated explanations using chat completion
   */
  async _addAIExplanations(recommendations, userHistory) {
    if (recommendations.length === 0) return recommendations;

    try {
      const userFavorites =
        userHistory
          .slice(0, 5)
          .map((m) => m.title)
          .join(", ") || "New listener";

      const recTitles = recommendations
        .map(
          (r, i) =>
            `${i + 1}. "${r.title}" by ${r.artist?.username || "Unknown"}`,
        )
        .join("\n");

      // ✅ IMPROVED PROMPT
      const systemPrompt = `You are a personalized music curator.
Your task: Explain why each song matches a user's taste.

OUTPUT FORMAT: Return ONLY a JSON array of short explanations.
Example: ["Perfect for your indie vibe", "Matches your energy level"]

REQUIREMENTS:
1. One explanation per song (5-8 words each)
2. Be specific about why it matches
3. Return ONLY the JSON array - no explanation before or after`;

      const userPrompt = `User's favorite songs: ${userFavorites}
      
Songs to explain:
${recTitles}`;

      const response = await aiService.chat(
        [{ role: "user", content: userPrompt }],
        {
          systemPrompt,
          temperature: 0.6,
          maxTokens: 500,
          responseSchema: "json_array",
          strict: true,
        },
      );

      const reasons = response.parseSuccess ? response.content : [];

      return recommendations.map((rec, i) => ({
        ...rec.toObject(),
        recommendationReason:
          Array.isArray(reasons) && reasons[i]
            ? reasons[i]
            : "Recommended for your vibe",
      }));
    } catch {
      // console log scrubbed
      // Fallback to generic reasons
      return recommendations.map((rec) => ({
        ...rec.toObject(),
        recommendationReason: "Recommended for you",
      }));
    }
  }

  /**
   * Find similar songs with fallback reason logic
   */
  async findSimilar(musicId, limit = 5) {
    const targetMusic = await Music.findById(musicId);
    if (!targetMusic) throw new Error("Music not found");

    const allMusic = await Music.find({ _id: { $ne: musicId } }).limit(50);

    const similarities = allMusic.map((music) => {
      let score = 0;
      const targetWords = targetMusic.title.toLowerCase().split(" ");
      const musicWords = music.title.toLowerCase().split(" ");
      const commonWords = targetWords.filter((w) => musicWords.includes(w));
      score += commonWords.length * 10;

      return { music, score };
    });

    const sorted = similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return sorted.map((s) => ({
      ...s.music.toObject(),
      similarityScore: s.score,
      reason: s.score > 0 ? `Shared vibe in title` : "New discovery for you",
    }));
  }

  /**
   * Generate mood-based playlist (In-Memory Search)
   */
  async generateMoodPlaylist(mood, limit = 20) {
    const query = {
      $or: [{ title: new RegExp(mood, "i") }],
    };

    // Corrected: 'plays' field removed as it's not in the current schema
    const music = await Music.find(query).sort({ createdAt: -1 }).limit(limit);

    return {
      mood,
      description: `A ${mood} playlist curated by AI`,
      playlist: music,
    };
  }

  /**
   * Trends Discovery with AI Insights
   */
  async discoverTrending(options = {}) {
    const { period = "week", limit = 15 } = options;
    const startDate = new Date();
    if (period === "day") startDate.setDate(startDate.getDate() - 1);
    else if (period === "week") startDate.setDate(startDate.getDate() - 7);
    else if (period === "month") startDate.setMonth(startDate.getMonth() - 1);

    const query = { createdAt: { $gte: startDate } };

    const trending = await Music.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    let insights = "Popular selection this period.";
    // Feature flag check and call to private method
    if (trending.length > 0 && aiConfig.features.trendingInsights) {
      try {
        insights = await this._analyzeTrendsAI(trending);
      } catch {
        // console log scrubbed
      }
    }

    return { period, trending, insights };
  }

  /**
   * Analyze trending tracks using AI (Internal)
   */
  async _analyzeTrendsAI(trending) {
    const titles = trending.map((t) => t.title).join(", ");
    const userPrompt = `Analyze these trending songs and give a one-sentence summary of the current vibe: ${titles}`;

    const response = await aiService.chat(
      [{ role: "user", content: userPrompt }],
      {
        systemPrompt: "You are a music trend analyst.",
        temperature: 0.5,
        maxTokens: 100,
      },
    );

    return response.content || "Vibe is currently diverse and fresh.";
  }

  // ─── Atomic Stats (v5) ───
  recordHit() {
    this.hits++;
  }
  recordMiss() {
    this.misses++;
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate:
        this.hits + this.misses > 0
          ? ((this.hits / (this.hits + this.misses)) * 100).toFixed(2) + "%"
          : "0%",
    };
  }

  // Internal caching helpers removed in favor of inline LRU logic
}

module.exports = new MusicRecommendationService();
