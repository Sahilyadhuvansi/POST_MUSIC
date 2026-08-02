"use strict";

const mongoose = require("mongoose");

const musicSchema = new mongoose.Schema(
  {
    youtubeUrl: {
      type: String,
      required: [true, "YouTube URL is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [180, "Title cannot exceed 180 characters"],
    },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Artist reference is required"],
      index: true,
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    playCount: {
      type: Number,
      default: 0,
      index: true,
    },
    lastPlayedAt: {
      type: Date,
    },
    // Title embedding for semantic search (transformers.js, 384-dim).
    // Excluded from queries by default — fetched only by the embedding service.
    embedding: {
      type: [Number],
      default: undefined,
      select: false,
    },
  },
  { timestamps: true },
);

// Index for list sorting
musicSchema.index({ createdAt: -1 });

// Best-effort: embed the title after save so semantic search covers new songs.
// Lazy-required to avoid a circular dependency (embedding.service requires this model).
musicSchema.post("save", function (doc) {
  setImmediate(() => {
    try {
      require("../../services/embedding.service").ensureMusicEmbedding(doc);
    } catch { /* non-critical */ }
  });
});

module.exports = mongoose.model("Music", musicSchema); // Corrected case
