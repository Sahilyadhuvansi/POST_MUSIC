"use strict";

const config = require("../../config/ai.config");

// In-process session store keyed by user-id or IP
const SESSIONS = new Map();

const _key = (req) => (req.user?.id ? `u:${req.user.id}` : `ip:${req.ip ?? "anon"}`);

const getSession = (req) => {
  const entry = SESSIONS.get(_key(req));
  if (!entry || Date.now() - entry.at > config.agent.sessionTTL) {
    return { lastResults: [], lastResolvedIndex: 0 };
  }
  return entry.data;
};

const setSession = (req, patch) => {
  const key = _key(req);
  const current = getSession(req);
  SESSIONS.set(key, { data: { ...current, ...patch }, at: Date.now() });
};

const saveSearchResults = (req, musics = []) => {
  const compact = musics.slice(0, 30).map(m => ({
    songId: String(m._id || m.songId || ""),
    title: m.title || "Untitled",
    youtubeUrl: m.youtubeUrl || "",
  }));
  setSession(req, { lastResults: compact, lastResolvedIndex: 0 });
};

const ORDINALS = { first: 0, second: 1, third: 2, fourth: 3, fifth: 4 };

const resolveOrdinal = (message, session) => {
  const lower = message.toLowerCase();
  const m = lower.match(/\b(first|second|third|fourth|fifth|last|\d+)\b/);
  if (!m) return null;

  const token = m[1];
  if (ORDINALS[token] !== undefined) return ORDINALS[token];
  if (token === "last") return Math.max(0, (session.lastResults?.length ?? 1) - 1);

  const n = parseInt(token, 10);
  return Number.isFinite(n) && n >= 1 ? n - 1 : null;
};

// Evict stale sessions every 30 minutes
setInterval(() => {
  const cutoff = Date.now() - config.agent.sessionTTL;
  for (const [k, v] of SESSIONS) {
    if (v.at < cutoff) SESSIONS.delete(k);
  }
}, config.agent.sessionTTL);

module.exports = { getSession, setSession, saveSearchResults, resolveOrdinal };
