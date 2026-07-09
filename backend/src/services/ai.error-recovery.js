"use strict";

const FALLBACKS = {
  chat: "I'm having a moment. Please try again shortly.",
  recommendations: "Recommendations are temporarily unavailable.",
  trending: "Trending data is temporarily unavailable.",
  moodPlaylist: "Mood playlist description is unavailable right now.",
};

const getFallback = (type) => FALLBACKS[type] ?? FALLBACKS.chat;

module.exports = { getFallback };
