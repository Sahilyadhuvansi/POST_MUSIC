"use strict";

const Music = require("../features/music/music.model");
const aiService = require("./ai.service");
const embeddingService = require("./embedding.service");
const config = require("../config/ai.config");

class MusicRecommendationService {
  constructor() {
    this._cache = new Map();
    this._cacheTTL = (config.cache?.ttl?.recommendations ?? 3600) * 1000;
    this._cacheLimit = 100;
    this._hits = 0;
    this._misses = 0;
  }

  getRecommendations(userId, limit = 10) {
    const key = `rec:${userId}:${limit}`;
    const entry = this._cache.get(key);

    if (entry && Date.now() - entry.at < this._cacheTTL) {
      this._hits++;
      // LRU touch
      this._cache.delete(key);
      this._cache.set(key, entry);
      return entry.promise;
    }

    this._misses++;
    const promise = this._build(userId, limit);
    this._cache.set(key, { promise, at: Date.now() });

    // FIFO eviction
    if (this._cache.size > this._cacheLimit) {
      this._cache.delete(this._cache.keys().next().value);
    }

    promise.catch(() => this._cache.delete(key));
    return promise;
  }

  async _build(userId, limit) {
    const [history, candidates] = await Promise.all([
      Music.find({ artist: userId }).limit(20).lean(),
      Music.find({ artist: { $ne: userId } })
        .populate("artist", "username profilePic")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
    ]);

    if (!candidates.length) return [];

    const now = Date.now();
    const top = candidates
      .map(m => ({
        music: m,
        // Recency score: a song added today scores 50, each day older loses 1 point
        score: Math.max(0, 50 - (now - new Date(m.createdAt).getTime()) / 86_400_000),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.music);

    if (!config.features.recommendations) return top;
    return this._addExplanations(top, history);
  }

  async _addExplanations(tracks, history) {
    if (!tracks.length) return tracks;

    const favorites = history.slice(0, 5).map(m => m.title).join(", ") || "New listener";
    const list = tracks.map((m, i) => `${i + 1}. "${m.title}"`).join("\n");

    try {
      const result = await aiService.complete(
        [{ role: "user", content: `User likes: ${favorites}\n\nFor each song below, write a 5-8 word reason why it matches:\n${list}` }],
        `Return ONLY a JSON array, one explanation per song.
Example: ["Great energy match", "Similar vibe to favorites"]`,
        { temperature: 0.6, maxTokens: 400, expectJSON: true },
      );

      const reasons = Array.isArray(result.content) ? result.content : [];
      return tracks.map((m, i) => ({
        ...m,
        recommendationReason: reasons[i] || "Recommended for your vibe",
      }));
    } catch {
      return tracks.map(m => ({ ...m, recommendationReason: "Recommended for you" }));
    }
  }

  async findSimilar(musicId, limit = 5) {
    const target = await Music.findById(musicId).select("+embedding").lean();
    if (!target) throw new Error("Music not found");

    const all = await Music.find({ _id: { $ne: musicId } })
      .select("+embedding")
      .limit(50)
      .lean();

    // Prefer embedding cosine similarity; fall back to title word-overlap
    // for docs without vectors (or when the embedding model is offline).
    let targetVec = target.embedding?.length ? target.embedding : null;
    if (!targetVec) {
      targetVec = await embeddingService.embed(target.title).catch(() => null);
    }

    const targetWords = new Set(target.title.toLowerCase().split(/\s+/));

    return all
      .map(({ embedding, ...m }) => {
        if (targetVec && embedding?.length) {
          const sim = embeddingService.cosine(targetVec, embedding);
          return {
            ...m,
            similarityScore: Math.round(sim * 100),
            reason: sim > 0.5 ? "Similar vibe" : "New discovery",
          };
        }
        const words = m.title.toLowerCase().split(/\s+/);
        const overlap = words.filter(w => targetWords.has(w)).length;
        return { ...m, similarityScore: overlap * 10, reason: overlap > 0 ? "Shared sound" : "New discovery" };
      })
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  }

  getStats() {
    const total = this._hits + this._misses;
    return {
      cacheSize: this._cache.size,
      hits: this._hits,
      misses: this._misses,
      hitRate: total > 0 ? `${((this._hits / total) * 100).toFixed(1)}%` : "0%",
    };
  }
}

module.exports = new MusicRecommendationService();
