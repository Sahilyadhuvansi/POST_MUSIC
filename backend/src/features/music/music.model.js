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
  },
  { timestamps: true },
);

// Index for list sorting
musicSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Music", musicSchema); // Corrected case
