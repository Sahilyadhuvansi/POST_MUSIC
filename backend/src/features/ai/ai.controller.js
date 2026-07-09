"use strict";

/**
 * AI CONTROLLER - Music Discovery AI
 * Senior Feature: Consistent Error Delegation & Standardized Telemetry
 */

const musicRecommendation = require("../../services/music-recommendation.service");
const aiService = require("../../services/ai.service");
const aiConfig = require("../../config/ai.config");
const Music = require("../music/music.model");
const {
  getAiContext,
  saveLastSearchResults,
  resolveEntityFromContext,
  resolveContextualAction,
  attachInterpretationMessage,
} = require("./ai.context-resolver");

const {
  ACTIONS,
  TOOL_REGISTRY,
  TOOL_METRICS,
  preprocessUserIntent,
} = require("./ai.tool-handlers");

// Cache context (limit lookups)
let cachedContext = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30 * 1000;

const SYSTEM_PROMPTS = {
  moodPlaylist: `AI DJ. Describe a {mood} mood in 1-2 sentences. Text only.`,
  trendingAnalysis: `Trends analyst. Summarize current tracks in 1 sentence. Text only.`,
  recommendationReasons: `Music taste expert. Provide brief (5-10 words) specific reasons for matches. Return JSON array.`,
  chatStructured: `Music Discovery Data Controller. APP CONTEXT: {appContext}. Query: {userQuery}. Return ONLY valid JSON structured for songs/empty. No explanation.`,
  chatGeneral: `Friendly AI Assistant guide for the music platform. APP CONTEXT: {appContext}. Be encouraging and concise.`,
  actionSelector: `You are an AI action router for a music app.\nAllowed actions only: search_music, play_song, fetch_favorites, like_song, delete_song, import_playlist, batch_like, respond_normally.\nReturn ONLY valid JSON object with shape: {"action":"...","args":{},"reply":"short summary"}.\nRules:\n- If user asks to play a specific song, artist, or query -> play_song\n- If user asks to fetch/view favorites -> fetch_favorites\n- If user asks to save/like/favorite a song and provides youtube url or title -> like_song\n- If user asks to remove/unfavorite/delete song -> delete_song\n- If user asks to search/find music -> search_music\n- If spotify playlist link provided -> import_playlist\n- If user provides a list of multiple tracks or asks to like/save several songs at once -> batch_like\n- If intent is unclear -> respond_normally\n- play_song takes args {"query": "..."} or {"youtubeUrl": "..."}\n- like_song MUST apply to ONE song only\n- batch_like MUST handle an array of tracks in args {"tracks": [{"title": "...", "artist": "..."}]}\n- NEVER process multiple songs in one like/delete action; use batch_like instead\n- ALWAYS choose the most relevant/top result for single actions\n- If user says first/second/third/that one/this song and lastSearchResults exist, map reference to ONE item and call like_song, play_song OR delete_song with songId`,
};

const normalizeText = (value = "") => value.toString().trim();

const runTool = async (action, args, req) => {
  const tool = TOOL_REGISTRY[action];
  if (!tool) {
    return {
      success: false,
      action: ACTIONS.RESPOND_NORMALLY,
      message: "Unknown tool requested.",
      data: null,
    };
  }

  if (tool.requiresAuth && !req.user?.id) {
    TOOL_METRICS[action].fail += 1;
    return {
      success: false,
      action,
      requiresAuth: true,
      message: "Please log in first.",
      data: null,
    };
  }

  try {
    const result = await tool.handler(args || {}, req);

    if (action === ACTIONS.LIKE_SONG && Array.isArray(result?.data)) {
      result.data = result.data[0] || null;
    }

    TOOL_METRICS[action].success += result.success ? 1 : 0;
    TOOL_METRICS[action].fail += result.success ? 0 : 1;
    return result;
  } catch (error) {
    TOOL_METRICS[action].fail += 1;
    return {
      success: false,
      action,
      message: `Tool execution failed: ${error.message}`,
      data: null,
    };
  }
};

const getActionDecision = async (
  userMessage,
  appContext,
  contextualMemory = {},
) => {
  const recentResults = Array.isArray(contextualMemory.lastSearchResults)
    ? contextualMemory.lastSearchResults.slice(0, 10)
    : [];
  const memorySnippet = recentResults.length
    ? recentResults
        .map(
          (song, index) =>
            `${index + 1}. ${song.title} [songId:${song.songId}]`,
        )
        .join(" | ")
    : "none";

  const aiRes = await aiService.chat([{ role: "user", content: userMessage }], {
    systemPrompt: `${SYSTEM_PROMPTS.actionSelector}\nContext: ${appContext}\nlastSearchResults: ${memorySnippet}`,
    temperature: 0,
    responseSchema: "json_object",
    strict: true,
  });

  let parsed = {};
  try {
    parsed =
      typeof aiRes?.content === "string"
        ? JSON.parse(aiRes.content)
        : aiRes?.content || {};
  } catch {
    return { action: ACTIONS.RESPOND_NORMALLY, args: {}, reply: "" };
  }
  const action = normalizeText(parsed.action).toLowerCase();

  if (!Object.values(ACTIONS).includes(action)) {
    return { action: ACTIONS.RESPOND_NORMALLY, args: {}, reply: "" };
  }

  return {
    action,
    args: parsed.args && typeof parsed.args === "object" ? parsed.args : {},
    reply: normalizeText(parsed.reply || ""),
  };
};

const talkToolResult = async (toolResult, userMessage, appContext) => {
  const safeContext = {
    action: toolResult.action,
    success: toolResult.success,
    message: toolResult.message,
    hasData: !!toolResult.data,
  };

  const aiRes = await aiService.chat(
    [
      {
        role: "user",
        content: `User query: ${userMessage}\nTool result: ${JSON.stringify(safeContext)}`,
      },
    ],
    {
      systemPrompt: `You are a response formatter for tool results. Context: ${appContext}. Keep output short, actionable, and user-friendly.`,
      temperature: 0.2,
      responseSchema: "plain_text",
      strict: false,
      maxTokens: 120,
    },
  );

  return normalizeText(
    aiRes?.content || toolResult.message || "Action completed.",
  );
};

exports.getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const recommendations =
      await musicRecommendation.getRecommendations(userId);
    res
      .status(200)
      .json({ success: true, data: recommendations, requestId: req.id });
  } catch (error) {
    next(error);
  }
};

exports.findSimilar = async (req, res, next) => {
  try {
    const { musicId } = req.params;
    const similar = await musicRecommendation.findSimilar(musicId);
    res.status(200).json({ success: true, data: similar, requestId: req.id });
  } catch (error) {
    next(error);
  }
};

exports.moodPlaylist = async (req, res, next) => {
  try {
    const { mood } = req.body;
    const prompt = SYSTEM_PROMPTS.moodPlaylist.replace("{mood}", mood);
    const aiRes = await aiService.chat([{ role: "user", content: prompt }], {
      temperature: 0.8,
    });
    res.status(200).json({
      success: true,
      data: { description: aiRes.content },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTrending = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const trending = await Music.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("artist", "username")
      .lean();

    const prompt = SYSTEM_PROMPTS.trendingAnalysis;
    const aiRes = await aiService.chat(
      [
        {
          role: "user",
          content: "Analyze: " + trending.map((m) => m.title).join(", "),
        },
      ],
      { systemPrompt: prompt },
    );
    res.status(200).json({
      success: true,
      data: { tracks: trending, insight: aiRes.content },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

exports.chat = async (req, res, next) => {
  try {
    const { messages = [] } = req.body;
    const userMessageRaw = messages[messages.length - 1]?.content || "";
    const userMessage = userMessageRaw.toLowerCase();
    const isStructured =
      /song|music|latest|favorite|save|remove|playlist|spotify/i.test(
        userMessage,
      );

    const preprocessed = preprocessUserIntent(userMessage);
    const contextualAction = resolveContextualAction(userMessageRaw, req);
    const appContext = await getAppContext();
    const { value: aiContext } = getAiContext(req);

    let selectedAction = preprocessed;
    let interpretationEntity = null;
    if (contextualAction) {
      if (contextualAction.errorMessage) {
        return res.status(200).json({
          success: false,
          type: "tool_result",
          action: "selection_error",
          message: contextualAction.errorMessage,
          payload: null,
          requestId: req.id,
        });
      }

      selectedAction = contextualAction;
      const resolved = resolveEntityFromContext(userMessageRaw, aiContext);
      interpretationEntity = resolved?.entity || null;
    } else if (!preprocessed.forced) {
      const decision = await getActionDecision(
        userMessage,
        appContext,
        aiContext,
      );
      selectedAction = {
        action: decision.action,
        args: decision.args,
        forced: decision.action !== ACTIONS.RESPOND_NORMALLY,
      };
    }

    if (selectedAction.action !== ACTIONS.RESPOND_NORMALLY) {
      const toolResult = await runTool(
        selectedAction.action,
        selectedAction.args,
        req,
      );

      if (
        selectedAction.action === ACTIONS.SEARCH_MUSIC &&
        toolResult.success &&
        Array.isArray(toolResult.data?.musics)
      ) {
        saveLastSearchResults(req, toolResult.data.musics);
      }

      const formattedMessage = await talkToolResult(
        toolResult,
        userMessageRaw,
        appContext,
      ).catch(() => toolResult.message);

      const interpretationMessage = attachInterpretationMessage(
        interpretationEntity,
        userMessageRaw,
      );
      const finalMessage = interpretationMessage
        ? `${formattedMessage}\n(${interpretationMessage})`
        : formattedMessage;

      return res.status(200).json({
        success: toolResult.success,
        type: "tool_result",
        action: selectedAction.action,
        content: finalMessage,
        payload: toolResult.data,
        requestId: req.id,
      });
    }

    let systemPrompt = isStructured
      ? SYSTEM_PROMPTS.chatStructured
          .replace("{appContext}", appContext)
          .replace("{userQuery}", userMessage)
      : SYSTEM_PROMPTS.chatGeneral.replace("{appContext}", appContext);

    const aiRes = await aiService.chat(messages, {
      systemPrompt,
      temperature: isStructured ? 0.1 : 0.7,
      responseSchema: isStructured ? "json_object" : "plain_text",
      strict: isStructured,
    });

    res.status(200).json({
      success: true,
      type: "text",
      content: typeof aiRes.content === "string"
        ? aiRes.content
        : JSON.stringify(aiRes.content),
      model: aiRes.model,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const aiStats = aiService.getStats();
    const recStats = musicRecommendation.getStats();
    const globalHits = (aiStats.cache?.hits || 0) + (recStats.hits || 0);
    const globalMisses = (aiStats.cache?.misses || 0) + (recStats.misses || 0);

    res.status(200).json({
      success: true,
      data: {
        global: {
          hitRate:
            globalHits + globalMisses > 0
              ? ((globalHits / (globalHits + globalMisses)) * 100).toFixed(2) +
                "%"
              : "0%",
          totalCost: aiStats.totalCost,
          avgCost: aiStats.avgCostPerRequest,
        },
        services: { ai: aiStats, recommendations: recStats },
        tools: TOOL_METRICS,
        features: aiConfig.features,
      },
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTools = async (_req, res) => {
  return res.status(200).json({
    success: true,
    data: Object.entries(TOOL_REGISTRY).map(([name, config]) => ({
      name,
      auth: config.requiresAuth,
      description: config.description,
    })),
  });
};

const getAppContext = async () => {
  const now = Date.now();
  if (cachedContext && now - lastFetchTime < CACHE_DURATION)
    return cachedContext;
  try {
    const music = await Music.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("artist", "username")
      .lean();
    cachedContext = `Trending: ${music.map((m) => `"${m.title}"`).join(", ")}`;
    lastFetchTime = now;
    return cachedContext;
  } catch {
    return "[Context unavailable]";
  }
};
