"use strict";

const config = require("../../config/ai.config");
const redisCache = require("../../utils/redis-cache");

// In-process session store — fallback when Redis is unavailable, and a
// hot read-through cache in front of it when it is.
const SESSIONS = new Map();

const _key = (req) => (req.user?.id ? `u:${req.user.id}` : `ip:${req.ip ?? "anon"}`);
const _redisKey = (key) => `ai:sess:${key}`;

const EMPTY = () => ({ lastResults: [], lastResolvedIndex: 0 });

const getSession = async (req) => {
  const key = _key(req);

  const local = SESSIONS.get(key);
  if (local && Date.now() - local.at <= config.agent.sessionTTL) {
    return local.data;
  }

  // Survives restarts / shared across instances
  const remote = await redisCache.getJSON(_redisKey(key));
  if (remote) {
    SESSIONS.set(key, { data: remote, at: Date.now() });
    return remote;
  }

  return EMPTY();
};

const setSession = async (req, patch) => {
  const key = _key(req);
  const local = SESSIONS.get(key);
  const currentData =
    local && Date.now() - local.at <= config.agent.sessionTTL
      ? local.data
      : await getSession(req);

  const data = { ...currentData, ...patch };

  SESSIONS.set(key, { data, at: Date.now() });
  await redisCache.setJSON(_redisKey(key), data, config.agent.sessionTTL);
};

const saveSearchResults = async (req, musics = []) => {
  const compact = musics.slice(0, 30).map(m => ({
    songId: String(m._id || m.songId || ""),
    title: m.title || "Untitled",
    youtubeUrl: m.youtubeUrl || "",
  }));
  await setSession(req, { lastResults: compact, lastResolvedIndex: 0 });
};

const ORDINALS = { first: 0, second: 1, third: 2, fourth: 3, fifth: 4 };

// Words that can surround a numeric selection without changing its meaning
const FILLER_RE =
  /\b(play|listen|to|save|like|favorite|add|delete|remove|unlike|discard|unfavorite|the|song|track|one|number|no|please)\b/g;

const resolveOrdinal = (message, session) => {
  if (!session?.lastResults?.length) return null;
  const lower = message.toLowerCase();

  const stripped = lower.replace(FILLER_RE, " ").replace(/[.!?,]/g, " ").trim();

  const wordMatch = lower.match(/\b(first|second|third|fourth|fifth|last)\b/);
  if (wordMatch) {
    const nonOrdinalRemaining = stripped
      .replace(/\b(first|second|third|fourth|fifth|last)\b/g, "")
      .trim();
    if (nonOrdinalRemaining.length === 0) {
      return wordMatch[1] === "last"
        ? Math.max(0, session.lastResults.length - 1)
        : ORDINALS[wordMatch[1]];
    }
  }

  // Bare numbers are only selections when clearly referential — "3rd",
  // "number 3", "#3", or verb+number alone ("save 3"). Titles containing
  // numbers ("play 7 rings", "blink 182") must NOT resolve.
  const explicit =
    lower.match(/\b(\d+)(?:st|nd|rd|th)\b/) || lower.match(/(?:\bnumber\s+|#)(\d+)\b/);
  let token = explicit?.[1];

  if (!token) {
    if (/^\d+$/.test(stripped)) token = stripped;
  }

  if (!token) return null;
  const n = parseInt(token, 10);
  return Number.isFinite(n) && n >= 1 && n <= session.lastResults.length ? n - 1 : null;
};

// Evict stale local entries every 30 minutes (Redis keys expire on their own)
setInterval(() => {
  const cutoff = Date.now() - config.agent.sessionTTL;
  for (const [k, v] of SESSIONS) {
    if (v.at < cutoff) SESSIONS.delete(k);
  }
}, config.agent.sessionTTL).unref();

module.exports = { getSession, setSession, saveSearchResults, resolveOrdinal };
