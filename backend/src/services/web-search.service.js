"use strict";

/**
 * Free, keyless web search via DuckDuckGo (duck-duck-scrape).
 * Falls back to DDG's HTML endpoint when the primary API rate-limits
 * ("anomaly detected" — common from shared/server IPs).
 * Returns [] on total failure — the agent degrades gracefully.
 */

const { search, SafeSearchType } = require("duck-duck-scrape");
const logger = require("../utils/logger");

const stripTags = (html = "") =>
  html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim();

// Fallback: parse DDG's tolerant HTML endpoint (no key, no JS required)
const searchHTML = async (query, maxResults) => {
  const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });
  if (!res.ok) throw new Error(`DDG HTML ${res.status}`);
  const html = await res.text();

  const results = [];
  // Split HTML into result sections using result container boundaries
  const blocks = html.split(/class="[^"]*result[^"]*"/i).slice(1);

  for (const block of blocks) {
    if (results.length >= maxResults) break;

    const linkMatch = block.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const snippetMatch = block.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);

    const rawUrl = linkMatch[1];
    const urlMatch = rawUrl.match(/uddg=([^&]+)/);
    const url = urlMatch ? decodeURIComponent(urlMatch[1]) : rawUrl;

    results.push({
      title: stripTags(linkMatch[2]),
      snippet: snippetMatch ? stripTags(snippetMatch[1]) : "",
      url,
    });
  }
  return results;
};

exports.search = async (query, { maxResults = 5 } = {}) => {
  try {
    const res = await search(query, { safeSearch: SafeSearchType.MODERATE });
    const results = (res.results || []).slice(0, maxResults).map((r) => ({
      title: stripTags(r.title),
      snippet: stripTags(r.description || ""),
      url: r.url,
    }));
    if (results.length) return results;
    throw new Error("empty result set");
  } catch (err) {
    logger.warn("Primary web search failed — trying HTML fallback", { query, error: err.message });
    try {
      return await searchHTML(query, maxResults);
    } catch (err2) {
      logger.warn("Web search failed", { query, error: err2.message });
      return [];
    }
  }
};
