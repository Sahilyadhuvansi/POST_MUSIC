"use strict";

const agent = require("./ai.agent");
const aiService = require("../../services/ai.service");
const musicRec = require("../../services/music-recommendation.service");
const Music = require("../music/music.model");

// POST /api/ai/chat — main agentic chat endpoint
exports.chat = async (req, res, next) => {
  try {
    const { messages = [] } = req.body;
    const userMessage = messages[messages.length - 1]?.content || "";
    const result = await agent.run(userMessage, messages, req);
    res.status(200).json({ success: true, ...result, requestId: req.id });
  } catch (err) {
    next(err);
  }
};

// GET /api/ai/recommendations — personalized picks for logged-in user
exports.getRecommendations = async (req, res, next) => {
  try {
    const data = await musicRec.getRecommendations(req.user.id);
    res.status(200).json({ success: true, data, requestId: req.id });
  } catch (err) {
    next(err);
  }
};

// GET /api/ai/similar/:musicId — songs similar to a given track
exports.findSimilar = async (req, res, next) => {
  try {
    const data = await musicRec.findSimilar(req.params.musicId);
    res.status(200).json({ success: true, data, requestId: req.id });
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/mood-playlist — AI-generated mood description
exports.moodPlaylist = async (req, res, next) => {
  try {
    const { mood = "chill" } = req.body;
    const result = await aiService.complete(
      [{ role: "user", content: `Describe a "${mood}" mood playlist in 1-2 sentences.` }],
      "You are an AI DJ. Describe music moods poetically and briefly.",
      { temperature: 0.8, maxTokens: 150 },
    );
    res.status(200).json({ success: true, data: { description: result.content }, requestId: req.id });
  } catch (err) {
    next(err);
  }
};

// GET /api/ai/trending — recent music with AI insight
exports.getTrending = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const tracks = await Music.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("artist", "username")
      .lean();

    let insight = "A diverse and fresh selection.";
    if (tracks.length) {
      const titles = tracks.map(m => m.title).join(", ");
      const result = await aiService.complete(
        [{ role: "user", content: `Summarize the current trend in one sentence: ${titles}` }],
        "You are a music trend analyst. Be concise.",
        { temperature: 0.5, maxTokens: 100 },
      ).catch(() => ({ content: insight }));
      insight = result.content || insight;
    }

    res.status(200).json({ success: true, data: { tracks, insight }, requestId: req.id });
  } catch (err) {
    next(err);
  }
};

// GET /api/ai/stats — service usage and cache metrics
exports.getStats = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        ai: aiService.stats(),
        recommendations: musicRec.getStats(),
        tools: agent.TOOL_METRICS,
      },
      requestId: req.id,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/ai/tools — list all registered agentic tools
exports.getTools = (_req, res) => {
  const tools = Object.entries(agent.TOOLS).map(([name, def]) => ({
    name,
    requiresAuth: def.requiresAuth,
    description: def.description,
  }));
  res.status(200).json({ success: true, data: tools });
};
