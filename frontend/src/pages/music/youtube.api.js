import {
  buildMusicSearchQuery,
  chunk,
  dedupeByKey,
  getMusicRelevanceScore,
  isHardExcluded,
  isLikelyShortForm,
  isLikelyMusicContent,
  isLiveOrUpcoming,
  parseIso8601DurationToSeconds,
  scoreVideo,
} from "./youtube.helpers";
import { MIN_VIDEO_SCORE } from "./youtube.constants";

export const fetchVideoDetailsByIds = async (videoIds = [], apiKey, signal) => {
  const detailsMap = new Map();
  if (!videoIds.length) return detailsMap;

  const batches = chunk(videoIds, 50);

  for (const batch of batches) {
    const params = new URLSearchParams({
      part: "snippet,contentDetails,statistics",
      id: batch.join(","),
      key: apiKey,
      fields:
        "items(id,snippet(title,channelTitle,categoryId,liveBroadcastContent,channelId),contentDetails(duration),statistics(viewCount))",
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${params}`,
      { signal },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 403) throw new Error("quota");
      throw new Error(err?.error?.message || `YouTube API error ${res.status}`);
    }

    const data = await res.json();
    for (const item of data.items || []) {
      detailsMap.set(item.id, {
        title: item.snippet?.title || "",
        channelTitle: item.snippet?.channelTitle || "",
        channelId: item.snippet?.channelId || "",
        categoryId: item.snippet?.categoryId || "",
        liveBroadcastContent: item.snippet?.liveBroadcastContent || "none",
        durationSeconds: parseIso8601DurationToSeconds(
          item.contentDetails?.duration,
        ),
        viewCount: Number(item.statistics?.viewCount || 0),
      });
    }
  }

  return detailsMap;
};

export const fetchChannelStatsByIds = async (
  channelIds = [],
  apiKey,
  signal,
) => {
  const statsMap = new Map();
  if (!channelIds.length) return statsMap;

  const batches = chunk(channelIds, 50);

  for (const batch of batches) {
    const params = new URLSearchParams({
      part: "statistics",
      id: batch.join(","),
      key: apiKey,
      fields: "items(id,statistics(subscriberCount))",
    });

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?${params}`,
      { signal },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 403) throw new Error("quota");
      throw new Error(err?.error?.message || `YouTube API error ${res.status}`);
    }

    const data = await res.json();
    for (const item of data.items || []) {
      statsMap.set(item.id, {
        subscriberCount: Number(item.statistics?.subscriberCount || 0),
      });
    }
  }

  return statsMap;
};

export const fetchYouTubeContentFresh = async (term, signal, options = {}) => {
  const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
  const {
    type = "video",
    maxResults = "15",
    order,
    videoCategoryId,
    strictMusicOnly = true,
    enhanceMusicQuery = true,
    pageToken,
  } = options;

  if (!API_KEY) {
    throw new Error(
      "VITE_YOUTUBE_API_KEY is not set in your Vercel environment variables.",
    );
  }

  const effectiveQuery = enhanceMusicQuery ? buildMusicSearchQuery(term) : term;

  // Requirement: Request only required fields to save bandwidth and quota
  const fields =
    "nextPageToken,items(id(videoId,playlistId),snippet(title,thumbnails(medium,default),channelTitle,liveBroadcastContent))";

  const params = new URLSearchParams({
    part: "snippet",
    q: effectiveQuery,
    type,
    maxResults,
    key: API_KEY,
    fields,
  });

  if (pageToken) params.set("pageToken", pageToken);

  if (order) params.set("order", order);
  if (videoCategoryId) {
    params.set("videoCategoryId", videoCategoryId);
  } else if (strictMusicOnly && type === "video") {
    params.set("videoCategoryId", "10");
  }

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`,
    { signal },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 403) throw new Error("quota");
    throw new Error(err?.error?.message || `YouTube API error ${res.status}`);
  }

  const data = await res.json();
  const items = dedupeByKey(
    (data.items || []).filter(
      (item) => item.id?.videoId || item.id?.playlistId,
    ),
    (item) =>
      item.id?.videoId
        ? `video:${item.id.videoId}`
        : `playlist:${item.id.playlistId}`,
  );

  const mappedPlaylists = dedupeByKey(
    items.filter((item) => item.id?.playlistId),
    (item) => item.id.playlistId,
  ).map((item) => {
    const thumbnail =
      item.snippet.thumbnails?.high?.url ||
      item.snippet.thumbnails?.medium?.url ||
      item.snippet.thumbnails?.default?.url;

    return {
      _id: `playlist_${item.id.playlistId}`,
      title: item.snippet.title,
      artist: { username: item.snippet.channelTitle },
      thumbnail,
      playlistId: item.id.playlistId,
      isPlaylist: true,
    };
  });

  // --- Phase 1: initial filter from search snippet (no duration yet) ---
  const preliminaryVideos = dedupeByKey(
    items.filter((item) => item.id?.videoId),
    (item) => item.id.videoId,
  )
    .map((item) => {
      const title = item.snippet?.title || "";
      if (isLiveOrUpcoming(item.snippet?.liveBroadcastContent)) return null;
      if (isHardExcluded(title)) return null;

      const thumbnail =
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.medium?.url ||
        item.snippet.thumbnails?.default?.url;

      return {
        _id: item.id.videoId,
        title: item.snippet.title,
        artist: { username: "" }, // Stripped channel name per requirements
        thumbnail,
        youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        isPlaylist: false,
        _score:
          getMusicRelevanceScore({
            title,
            channelTitle: item.snippet.channelTitle || "",
          }) +
          scoreVideo({
            title,
            channelTitle: item.snippet.channelTitle || "",
          }),
      };
    })
    .filter(Boolean);

  // --- Phase 2: enrich with real video details for duration + category filtering ---
  // The Search API does not return duration, so a second videos.list call is needed.
  // This filters Shorts and non-music content that the search API lets through (Req 2 & 3).
  let enrichedVideos = preliminaryVideos;
  const videoIds = preliminaryVideos.map((v) => v._id);
  if (videoIds.length > 0) {
    try {
      const detailsMap = await fetchVideoDetailsByIds(videoIds, API_KEY, signal);
      enrichedVideos = preliminaryVideos
        .map((video) => {
          const details = detailsMap.get(video._id);
          if (!details) return video; // keep if details unavailable (defensive)
          const resolvedTitle = details.title || video.title;
          if (isLikelyShortForm(resolvedTitle, details.durationSeconds)) return null;
          if (
            !isLikelyMusicContent({
              title: resolvedTitle,
              channelTitle: details.channelTitle || "",
              categoryId: details.categoryId,
            })
          )
            return null;
          return video;
        })
        .filter(Boolean);
    } catch {
      // If enrichment fails (e.g. signal aborted), proceed without duration filtering
      enrichedVideos = preliminaryVideos;
    }
  }

  // --- Phase 3: score gate + sort (Req 6) ---
  const mappedVideos = enrichedVideos
    .filter((v) => v._score >= MIN_VIDEO_SCORE)
    .sort((a, b) => b._score - a._score)
    .map(({ _score, ...video }) => video);

  return {
    tracks: [...mappedVideos, ...mappedPlaylists],
    nextPageToken: data.nextPageToken || null,
  };
};
