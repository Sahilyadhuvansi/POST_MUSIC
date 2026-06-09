import {
  buildYouTubeCacheKey,
  dedupeByKey,
  getMusicRelevanceScore,
  getYouTubeSearchTtlMs,
  isHardExcluded,
  isLikelyShortForm,
  isLikelyMusicContent,
  isLiveOrUpcoming,
  scoreVideo,
} from "./youtube.helpers";
import {
  fetchChannelStatsByIds,
  fetchVideoDetailsByIds,
  fetchYouTubeContentFresh,
} from "./youtube.api";

const SEARCH_CACHE = new Map();
const PENDING_REFRESHES = new Map();
const SEARCH_METRICS = {
  hits: 0,
  staleHits: 0,
  misses: 0,
  refreshes: 0,
  fallbacks: 0,
  queryCounts: new Map(),
};
const STALE_WHILE_REVALIDATE_MS = 15 * 60 * 1000;

const logMetric = (_event, _payload = {}) => {
  // Metric logging placeholder for production health monitoring
};

const cloneTrack = (track) => ({
  ...track,
  artist: track.artist ? { ...track.artist } : track.artist,
});

const cloneTracks = (tracks = []) => tracks.map(cloneTrack);

const recordQueryUsage = (cacheKey) => {
  const next = (SEARCH_METRICS.queryCounts.get(cacheKey) || 0) + 1;
  SEARCH_METRICS.queryCounts.set(cacheKey, next);
};

const getCacheEntryState = (entry, ttlMs) => {
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age <= ttlMs) {
    return { state: "fresh", data: entry.data };
  }

  if (age <= ttlMs + STALE_WHILE_REVALIDATE_MS) {
    return { state: "stale", data: entry.data };
  }

  return { state: "expired", data: entry.data };
};

const setCacheEntry = (cacheKey, data, ttlMs) => {
  SEARCH_CACHE.set(cacheKey, {
    data: cloneTracks(data),
    timestamp: Date.now(),
    ttlMs,
  });
};

const refreshSearchCache = async (term, options, cacheKey, signal) => {
  if (PENDING_REFRESHES.has(cacheKey)) return PENDING_REFRESHES.get(cacheKey);

  const refreshPromise = fetchYouTubeContentFresh(term, signal, options)
    .then((freshData) => {
      const ttlMs = getYouTubeSearchTtlMs(term, options);
      setCacheEntry(cacheKey, freshData, ttlMs);
      SEARCH_METRICS.refreshes += 1;
      logMetric("refresh", { query: cacheKey, count: freshData.length });
      return freshData;
    })
    .catch((error) => {
      logMetric("refresh_failed", { query: cacheKey, error: error.message });
      return null;
    })
    .finally(() => {
      PENDING_REFRESHES.delete(cacheKey);
    });

  PENDING_REFRESHES.set(cacheKey, refreshPromise);
  return refreshPromise;
};

export const searchYouTubeContent = async (term, signal, options = {}) => {
  const cacheKey = buildYouTubeCacheKey(term, options);
  const ttlMs = getYouTubeSearchTtlMs(term, options);
  recordQueryUsage(cacheKey);

  const cachedEntry = SEARCH_CACHE.get(cacheKey);
  const cachedState = getCacheEntryState(cachedEntry, ttlMs);

  if (cachedState?.state === "fresh") {
    SEARCH_METRICS.hits += 1;
    logMetric("cache_hit", {
      query: cacheKey,
      fresh: true,
      count: cachedState.data.length,
    });
    return { tracks: cloneTracks(cachedState.data), nextPageToken: null };
  }

  if (cachedState?.state === "stale") {
    SEARCH_METRICS.staleHits += 1;
    logMetric("cache_hit", {
      query: cacheKey,
      fresh: false,
      count: cachedState.data.length,
    });
    void refreshSearchCache(term, options, cacheKey, undefined);
    return { tracks: cloneTracks(cachedState.data), nextPageToken: null };
  }

  SEARCH_METRICS.misses += 1;

  try {
    const response = await fetchYouTubeContentFresh(term, signal, options);
    setCacheEntry(cacheKey, response.tracks, ttlMs);
    logMetric("cache_miss", { query: cacheKey, count: response.tracks.length });
    return response;
  } catch (error) {
    if (cachedEntry?.data?.length) {
      SEARCH_METRICS.fallbacks += 1;
      logMetric("fallback", { query: cacheKey, error: error.message });
      return { tracks: cloneTracks(cachedEntry.data), nextPageToken: null };
    }

    throw error;
  }
};

export const prefetchYouTubeSearches = async (terms = [], options = {}) => {
  const uniqueTerms = [
    ...new Set(terms.map((term) => term.trim()).filter(Boolean)),
  ];

  return Promise.allSettled(
    uniqueTerms.map((term) => searchYouTubeContent(term, undefined, options)),
  );
};

export const getYouTubeSearchMetrics = () => ({
  hits: SEARCH_METRICS.hits,
  staleHits: SEARCH_METRICS.staleHits,
  misses: SEARCH_METRICS.misses,
  refreshes: SEARCH_METRICS.refreshes,
  fallbacks: SEARCH_METRICS.fallbacks,
  queryCounts: Array.from(SEARCH_METRICS.queryCounts.entries()).sort(
    (a, b) => b[1] - a[1],
  ),
});

export const fetchPlaylistTracks = async (playlist, signal) => {
  const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
  const params = new URLSearchParams({
    part: "snippet,contentDetails",
    playlistId: playlist.playlistId,
    maxResults: "50",
    key: API_KEY,
  });

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?${params}`,
    { signal },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 403) throw new Error("quota");
    throw new Error(err?.error?.message || `YouTube API error ${res.status}`);
  }

  const data = await res.json();
  const baseTracks = dedupeByKey(
    (data.items || [])
      .filter((item) => item.contentDetails?.videoId && item.snippet?.title)
      .filter((item) => item.snippet.title.toLowerCase() !== "deleted video")
      .map((item) => ({
        _id: item.contentDetails.videoId,
        title: item.snippet.title,
        artist: {
          username:
            item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
        },
        thumbnail:
          item.snippet.thumbnails?.high?.url ||
          item.snippet.thumbnails?.medium?.url ||
          item.snippet.thumbnails?.default?.url,
        youtubeUrl: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
        isPlaylist: false,
      })),
    (item) => item._id,
  );

  const detailsMap = await fetchVideoDetailsByIds(
    baseTracks.map((track) => track._id),
    API_KEY,
    signal,
  );
  const channelStatsMap = await fetchChannelStatsByIds(
    [
      ...new Set(
        [...detailsMap.values()].map((d) => d.channelId).filter(Boolean),
      ),
    ],
    API_KEY,
    signal,
  );

  return baseTracks.filter((track) => {
    const details = detailsMap.get(track._id);
    if (!details) return false;

    const title = details.title || track.title;
    if (isLikelyShortForm(title, details.durationSeconds)) return false;
    if (isHardExcluded(title)) return false;
    if (isLiveOrUpcoming(details.liveBroadcastContent)) return false;
    if (
      !isLikelyMusicContent({
        title,
        channelTitle: details.channelTitle || "",
        categoryId: details.categoryId,
      })
    ) {
      return false;
    }

    const channelStats = channelStatsMap.get(details.channelId) || {
      subscriberCount: 0,
    };

    const rankScore =
      getMusicRelevanceScore({
        title,
        channelTitle: details.channelTitle || "",
        durationSeconds: details.durationSeconds,
        categoryId: details.categoryId,
        viewCount: details.viewCount,
        subscriberCount: channelStats.subscriberCount,
      }) + scoreVideo({ title, channelTitle: details.channelTitle || "" });

    if (rankScore < 1) return false;

    return true;
  });
};
