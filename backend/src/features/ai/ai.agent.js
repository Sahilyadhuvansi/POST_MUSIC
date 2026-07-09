"use strict";

/**
 * AGENTIC AI AGENT — Music Discovery
 * ────────────────────────────────────
 * Implements the ReAct (Reason + Act) loop:
 *   1. PLAN   — LLM selects the best tool for the user's intent
 *   2. EXECUTE — The selected tool runs and returns structured data
 *   3. SYNTHESIZE — LLM formats the result into a natural reply
 *
 * Contextual references like "that one", "the first" are resolved
 * through per-session memory stored in ai.context-resolver.js.
 */

const aiService = require("../../services/ai.service");
const { TOOLS, extractYouTubeUrl, extractSpotifyUrl } = require("./ai.tool-handlers");
const {
  getSession,
  setSession,
  saveSearchResults,
  resolveOrdinal,
} = require("./ai.context-resolver");

const TOOL_NAMES = Object.keys(TOOLS);

// ─── Per-session tool usage metrics (resets on restart) ───────────────────────
const TOOL_METRICS = Object.fromEntries(
  TOOL_NAMES.map(name => [name, { success: 0, fail: 0 }]),
);

// ─── Regex guards ─────────────────────────────────────────────────────────────
const MUSIC_INTENT_RE =
  /\b(song|music|play|search|find|favorite|save|like|remove|delete|playlist|spotify|youtube|trending|recommend|suggest|listen)\b/i;
const LIKE_RE   = /\b(like|save|favorite|add)\b/i;
const DELETE_RE = /\b(delete|remove|unlike|discard|unfavorite)\b/i;
const DEICTIC_RE = /\b(that one|this song|that song|this one)\b/i;

// ─── STEP 0: Fast rule-based classifier (zero LLM calls) ─────────────────────
const fastClassify = (message) => {
  const lower = message.toLowerCase();
  const spotifyUrl = extractSpotifyUrl(message);
  const youtubeUrl = extractYouTubeUrl(message);

  if (spotifyUrl)
    return { tool: "import_playlist", args: { source: "spotify", url: spotifyUrl } };

  if (/\b(favorites?|saved songs?|my music|liked songs?|my library)\b/i.test(lower))
    return { tool: "fetch_favorites", args: {} };

  if (youtubeUrl && LIKE_RE.test(lower))
    return { tool: "like_song", args: { youtubeUrl } };

  const searchMatch = lower.match(/^(?:search|find|show me|look for)\s+(.+)/i);
  if (searchMatch)
    return { tool: "search_music", args: { query: searchMatch[1].trim() } };

  const playMatch = lower.match(/^(?:play|tune in to|listen to)\s+(.+)/i);
  if (playMatch)
    return { tool: "play_song", args: { query: playMatch[1].trim() } };

  return null;
};

// ─── STEP 0b: Resolve contextual references ("first", "that one") ─────────────
const resolveContextualIntent = (message, req) => {
  const session = getSession(req);
  if (!session.lastResults?.length) return null;

  const lower = message.toLowerCase();
  const ordinalIdx = resolveOrdinal(lower, session);
  const hasDeicticRef = DEICTIC_RE.test(lower);

  let idx = ordinalIdx;
  if (idx === null && hasDeicticRef) idx = session.lastResolvedIndex ?? 0;
  if (idx === null || !Number.isFinite(idx)) return null;

  if (idx >= session.lastResults.length) {
    return { error: `That selection doesn't exist. I only have ${session.lastResults.length} results.` };
  }

  const entity = session.lastResults[idx];
  setSession(req, { lastResolvedIndex: idx });

  if (LIKE_RE.test(lower))
    return { tool: "like_song", args: { songId: entity.songId }, entity };

  if (DELETE_RE.test(lower))
    return { tool: "delete_song", args: { songId: entity.songId }, entity };

  return null;
};

// ─── STEP 1: LLM Planner — called only when fast classify fails ───────────────
const PLANNER_SYSTEM = `You are an action router for a music discovery app.
Choose the most appropriate tool for the user's request.

Available tools: search_music, play_song, fetch_favorites, like_song, delete_song, batch_like, import_playlist, respond_normally

Selection rules:
- play_song       → "play X", "listen to X", "tune in to X"
- search_music    → "find X", "search X", "show me X"
- fetch_favorites → "my favorites", "my library", "saved songs", "liked songs"
- like_song       → "save X", "like X", "favorite X"   (one song only)
- delete_song     → "remove X", "delete X", "unlike X"
- batch_like      → multiple songs listed in a single request
- import_playlist → Spotify or YouTube playlist URL present
- respond_normally → greetings, questions, unclear intent, anything else

Recent search context (for resolving ordinals like "first" or "that one"):
{MEMORY}

Argument shapes:
- search_music  : { "query": "string" }
- play_song     : { "query": "string" }  OR  { "youtubeUrl": "string" }
- like_song     : { "query"?: "string", "youtubeUrl"?: "string", "songId"?: "string" }
- delete_song   : { "title"?: "string", "youtubeUrl"?: "string", "songId"?: "string" }
- batch_like    : { "tracks": [{ "title": "string", "artist": "string" }] }
- import_playlist: { "url": "string", "source": "spotify"|"youtube" }

Respond ONLY with valid JSON: { "tool": "...", "args": { ... } }`;

const planWithLLM = async (userMessage, session) => {
  const memory = session.lastResults?.slice(0, 10)
    .map((s, i) => `${i + 1}. ${s.title} [id:${s.songId}]`)
    .join(" | ") || "none";

  const systemPrompt = PLANNER_SYSTEM.replace("{MEMORY}", memory);

  try {
    const result = await aiService.complete(
      [{ role: "user", content: userMessage }],
      systemPrompt,
      { temperature: 0, maxTokens: 200, expectJSON: true },
    );

    const parsed = result.content;
    if (!parsed || typeof parsed !== "object") return { tool: "respond_normally", args: {} };

    const tool = String(parsed.tool ?? "respond_normally").toLowerCase();
    return {
      tool: TOOL_NAMES.includes(tool) ? tool : "respond_normally",
      args: parsed.args && typeof parsed.args === "object" ? parsed.args : {},
    };
  } catch {
    return { tool: "respond_normally", args: {} };
  }
};

// ─── STEP 2: Tool executor ────────────────────────────────────────────────────
const executeTool = async (tool, args, req) => {
  const def = TOOLS[tool];
  if (!def) {
    return { success: false, action: tool, data: null, message: "Unknown tool requested." };
  }

  if (def.requiresAuth && !req.user?.id) {
    TOOL_METRICS[tool].fail++;
    return {
      success: false,
      action: tool,
      data: null,
      message: "Please log in to use this feature.",
      requiresAuth: true,
    };
  }

  try {
    const result = await def.handler(args, req);
    TOOL_METRICS[tool][result.success ? "success" : "fail"]++;
    return result;
  } catch (err) {
    TOOL_METRICS[tool].fail++;
    return { success: false, action: tool, data: null, message: err.message };
  }
};

// ─── STEP 3: Synthesize a natural-language reply from the tool result ─────────
const synthesize = async (userMessage, toolResult) => {
  const ctx = {
    action: toolResult.action,
    success: toolResult.success,
    message: toolResult.message,
    hasData: !!toolResult.data,
  };

  try {
    const result = await aiService.complete(
      [{ role: "user", content: `User: "${userMessage}"\nTool result: ${JSON.stringify(ctx)}` }],
      "You are a concise, friendly assistant for a music app. Write a 1-2 sentence natural reply based on the tool result. No extra explanation.",
      { temperature: 0.3, maxTokens: 120 },
    );
    return result.content || toolResult.message || "Done.";
  } catch {
    return toolResult.message || "Done.";
  }
};

// ─── Main agent entry point ───────────────────────────────────────────────────
const run = async (userMessage, conversationHistory, req) => {
  const session = getSession(req);

  // 0a. Resolve contextual references ("that one", "first song")
  const contextual = resolveContextualIntent(userMessage, req);
  if (contextual?.error) {
    return { type: "tool_result", action: "selection_error", content: contextual.error, payload: null, success: false };
  }

  // 0b. Fast rule-based classifier (no LLM cost)
  let plan = contextual ?? fastClassify(userMessage);

  // 1. LLM planner — only when message has music intent and fast classify missed
  if (!plan && MUSIC_INTENT_RE.test(userMessage)) {
    plan = await planWithLLM(userMessage, session);
  }

  const tool = plan?.tool ?? "respond_normally";

  // Direct conversational response (no tool)
  if (tool === "respond_normally") {
    const appCtx = session.lastResults?.length ? "User has recent search context." : "No prior context.";
    try {
      const result = await aiService.complete(
        conversationHistory,
        `You are a friendly AI assistant for a music discovery app. ${appCtx} Be helpful and concise.`,
        { temperature: 0.7, maxTokens: 512 },
      );
      return { type: "text", content: result.content, model: result.model };
    } catch {
      return { type: "text", content: "I'm having trouble right now — please try again in a moment.", model: "error" };
    }
  }

  // 2. Execute selected tool
  const toolResult = await executeTool(tool, plan.args, req);

  // Persist search results to session memory for follow-up references
  if (tool === "search_music" && toolResult.success && Array.isArray(toolResult.data?.musics)) {
    saveSearchResults(req, toolResult.data.musics);
  }

  // 3. Synthesize natural-language reply
  let content = await synthesize(userMessage, toolResult);

  // Append interpretation note when we resolved a contextual reference
  if (contextual?.entity?.title) {
    content = `${content}\n(Interpreted as: "${contextual.entity.title}")`;
  }

  return {
    type: "tool_result",
    action: tool,
    content,
    payload: toolResult.data,
    success: toolResult.success,
  };
};

module.exports = { run, TOOLS, TOOL_METRICS };
