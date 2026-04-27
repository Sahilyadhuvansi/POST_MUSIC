import {
  BAD_KEYWORDS,
  HARD_EXCLUDE_KEYWORDS,
  MAX_TRACK_DURATION_SECONDS,
  MIN_TRACK_DURATION_SECONDS,
  MUSIC_INTENT_KEYWORDS,
  PREFERRED_CHANNEL_HINTS,
  QUERY_NOISE_KEYWORDS,
  SHORT_FORM_KEYWORDS,
  SOFT_QUALITY_PENALTY_KEYWORDS,
  TRENDING_QUERY_KEYWORDS,
} from "./youtube.constants";

export const parseIso8601DurationToSeconds = (isoDuration = "") => {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return 0;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
};

export const chunk = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export const hasKeyword = (title = "", keywords = []) => {
  const normalized = title.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
};

export const isLikelyShortForm = (title = "", durationSeconds = 0) => {
  const normalized = title.toLowerCase();
  const hasShortKeyword = SHORT_FORM_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );

  return (
    durationSeconds < MIN_TRACK_DURATION_SECONDS ||
    durationSeconds > MAX_TRACK_DURATION_SECONDS ||
    hasShortKeyword
  );
};

export const isHardExcluded = (title = "") => {
  return hasKeyword(title, HARD_EXCLUDE_KEYWORDS);
};

export const hasMusicIntent = (text = "") => {
  return hasKeyword(text, MUSIC_INTENT_KEYWORDS);
};

export const buildMusicSearchQuery = (term = "") => {
  const normalized = normalizeMusicSearchTerm(term);
  if (!normalized) return normalized;
  if (hasMusicIntent(normalized)) return normalized;
  return `${normalized} song music official video lyrics audio`;
};

export const normalizeMusicSearchTerm = (term = "") => {
  const lower = term.toLowerCase().trim();
  if (!lower) return "";

  const stripped = QUERY_NOISE_KEYWORDS.reduce((value, keyword) => {
    const pattern = new RegExp(
      `(?:^|\\s)${keyword.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}(?:$|\\s)`,
      "gi",
    );
    return value.replace(pattern, " ");
  }, lower);

  return stripped
    .replace(/[^a-z0-9\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const normalizeCacheKey = (value = "") =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-:]+/g, "");

export const buildYouTubeCacheKey = (term = "", options = {}) => {
  const normalizedQuery = normalizeMusicSearchTerm(term);
  const normalizedOptions = normalizeCacheKey(
    JSON.stringify({
      type: options.type || "video",
      maxResults: options.maxResults || "30",
      order: options.order || "default",
      videoCategoryId: options.videoCategoryId || "music",
      strictMusicOnly: options.strictMusicOnly !== false,
      enhanceMusicQuery: options.enhanceMusicQuery !== false,
    }),
  );

  return normalizeCacheKey(`yt:${normalizedQuery}:${normalizedOptions}`);
};

export const isTrendingSearchQuery = (term = "") => {
  const normalized = normalizeMusicSearchTerm(term);
  if (!normalized) return false;
  return TRENDING_QUERY_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );
};

export const getYouTubeSearchTtlMs = (term = "", options = {}) => {
  const trending = isTrendingSearchQuery(term) || options.order === "date";
  const baseTtl = trending ? 30 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return options.type === "playlist"
    ? Math.min(baseTtl, 12 * 60 * 60 * 1000)
    : baseTtl;
};

export const dedupeByKey = (items = [], getKey) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const isLikelyMusicContent = ({
  title = "",
  channelTitle = "",
  categoryId = "",
}) => {
  if (categoryId === "10") return true;
  if (hasMusicIntent(title)) return true;
  if (hasMusicIntent(channelTitle)) return true;
  return false;
};

export const isLiveOrUpcoming = (liveBroadcastContent = "none") => {
  return liveBroadcastContent === "live" || liveBroadcastContent === "upcoming";
};

export const getMusicRelevanceScore = ({
  title = "",
  channelTitle = "",
  durationSeconds = 0,
  categoryId = "",
  viewCount = 0,
  subscriberCount = 0,
}) => {
  let score = 0;

  // duration preference: 3-6 min ideal (aligned with 180-360 range)
  if (durationSeconds >= 180 && durationSeconds <= 360) score += 5;
  else if (durationSeconds >= 150 && durationSeconds <= 390) score += 3;
  else if (
    durationSeconds >= MIN_TRACK_DURATION_SECONDS &&
    durationSeconds <= MAX_TRACK_DURATION_SECONDS
  )
    score += 1;

  if (categoryId === "10") score += 4;
  if (hasMusicIntent(title)) score += 2;
  if (hasMusicIntent(channelTitle)) score += 1;

  const normalizedChannel = channelTitle.toLowerCase();
  if (
    PREFERRED_CHANNEL_HINTS.some((hint) => normalizedChannel.includes(hint))
  ) {
    score += 3;
  }

  // prefer high views
  if (viewCount >= 10_000_000) score += 4;
  else if (viewCount >= 1_000_000) score += 3;
  else if (viewCount >= 100_000) score += 2;
  else if (viewCount >= 10_000) score += 1;

  // channel trust proxy (verified-like preference)
  if (subscriberCount >= 1_000_000) score += 4;
  else if (subscriberCount >= 100_000) score += 2;
  else if (subscriberCount >= 10_000) score += 1;

  if (hasKeyword(title, BAD_KEYWORDS)) {
    score -= 5;
  }

  if (hasKeyword(title, SOFT_QUALITY_PENALTY_KEYWORDS)) {
    score -= 3;
  }

  return score;
};

export const scoreVideo = ({ title = "", channelTitle = "" }) => {
  const normalizedTitle = title.toLowerCase();
  const normalizedChannel = channelTitle.toLowerCase();

  let score = 0;

  if (PREFERRED_CHANNEL_HINTS.some((k) => normalizedChannel.includes(k))) {
    score += 3;
  }

  if (MUSIC_INTENT_KEYWORDS.some((k) => normalizedTitle.includes(k))) {
    score += 2;
  }

  if (BAD_KEYWORDS.some((k) => normalizedTitle.includes(k))) {
    score -= 5;
  }

  return score;
};
