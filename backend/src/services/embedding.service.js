"use strict";

/**
 * Local text embeddings via transformers.js (no API key, runs in-process).
 * Powers semantic music search: vectors are stored on Music documents in
 * MongoDB and ranked with in-memory cosine similarity — the corpus is small
 * (per-user favorites), so a vector database is unnecessary.
 *
 * The model (~25 MB) downloads on first use and is cached on disk after.
 * If it can't load (e.g. offline), the service disables itself and callers
 * fall back to keyword search.
 */

const config = require("../config/ai.config");
const logger = require("../utils/logger");
const Music = require("../features/music/music.model");

class EmbeddingService {
  constructor() {
    this._pipePromise = null;
    this._disabled = false;
    this._backfilling = false;
  }

  _pipe() {
    if (this._disabled) return Promise.resolve(null);
    if (!this._pipePromise) {
      // @xenova/transformers is ESM-only — dynamic import from CommonJS
      this._pipePromise = import("@xenova/transformers")
        .then(({ pipeline }) => pipeline("feature-extraction", config.embeddings.model))
        .then((pipe) => {
          logger.info("Embedding model ready", { model: config.embeddings.model });
          return pipe;
        })
        .catch((err) => {
          this._disabled = true;
          logger.warn("Embedding model unavailable — semantic search disabled", { error: err.message });
          return null;
        });
    }
    return this._pipePromise;
  }

  /** Embed text into a normalized vector, or null when embeddings are unavailable. */
  async embed(text) {
    const pipe = await this._pipe();
    if (!pipe) return null;
    const out = await pipe(String(text).slice(0, 512), { pooling: "mean", normalize: true });
    return Array.from(out.data);
  }

  /** Cosine similarity — vectors are L2-normalized, so this is a dot product. */
  cosine(a, b) {
    if (!a?.length || !b?.length || a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  }

  /** Best-effort: attach an embedding to a Music doc (fire-and-forget from save hook). */
  async ensureMusicEmbedding(doc) {
    try {
      if (!doc?._id || doc.embedding?.length) return;
      const vec = await this.embed(doc.title);
      if (vec) await Music.updateOne({ _id: doc._id }, { $set: { embedding: vec } });
    } catch { /* non-critical */ }
  }

  /**
   * Semantic search over the music library.
   * Returns ranked matches, or null when embeddings are unavailable
   * (callers should fall back to keyword search).
   */
  async searchMusicByMeaning(query, { limit = 10, minScore = 0.3 } = {}) {
    const qVec = await this.embed(query);
    if (!qVec) return null;

    const docs = await Music.find()
      .select("_id youtubeUrl title thumbnailUrl artist createdAt embedding")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    // Backfill missing embeddings in the background (guarded so concurrent
    // searches don't duplicate work) — this request ranks only docs that
    // already have vectors, so it stays fast.
    const missing = docs.filter((d) => !d.embedding?.length);
    if (missing.length && !this._backfilling) {
      this._backfilling = true;
      setImmediate(async () => {
        try {
          for (const d of missing.slice(0, 100)) {
            const vec = await this.embed(d.title);
            if (!vec) break;
            await Music.updateOne({ _id: d._id }, { $set: { embedding: vec } }).catch(() => {});
          }
        } finally {
          this._backfilling = false;
        }
      });
    }

    // Rank, then dedupe by youtubeUrl (same song saved by N users = N docs)
    const seen = new Set();
    return docs
      .filter((d) => d.embedding?.length)
      .map((d) => ({ ...d, similarity: this.cosine(qVec, d.embedding) }))
      .filter((d) => d.similarity >= minScore)
      .sort((a, b) => b.similarity - a.similarity)
      .filter((d) => (seen.has(d.youtubeUrl) ? false : seen.add(d.youtubeUrl)))
      .slice(0, limit)
      .map(({ embedding, ...rest }) => rest);
  }
}

module.exports = new EmbeddingService();
