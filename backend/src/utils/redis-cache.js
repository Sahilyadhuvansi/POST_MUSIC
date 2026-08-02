"use strict";

/**
 * Thin JSON cache layer over the shared Redis client.
 * Never throws — returns null/false when Redis is unavailable so callers
 * can fall back to their in-memory stores.
 */

const { getRedisClient } = require("./redis");

// Memoize the connection attempt: if Redis is down at first use, stay on the
// in-memory fallback for the process lifetime instead of paying a connect
// timeout on every request. (Once connected, node-redis auto-reconnects.)
let clientPromise = null;
const _client = () => (clientPromise ??= getRedisClient());

const getJSON = async (key) => {
  try {
    const client = await _client();
    if (!client) return null;
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const setJSON = async (key, value, ttlMs) => {
  try {
    const client = await _client();
    if (!client) return false;
    await client.set(key, JSON.stringify(value), {
      EX: Math.max(1, Math.ceil(ttlMs / 1000)),
    });
    return true;
  } catch {
    return false;
  }
};

module.exports = { getJSON, setJSON };
