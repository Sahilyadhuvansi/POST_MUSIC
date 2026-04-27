"use strict";

const yts = require("yt-search");
const logger = require("../utils/logger");
const { MIN_TRACK_DURATION_SECONDS, MAX_TRACK_DURATION_SECONDS } = require("../constants");

/**
 * Filter for valid music duration (90s - 360s)
 * Also excludes common non-music/shortform keywords in title
 */
const isValidMusicTrack = (video) => {
  if (!video) return false;
  
  const duration = video.duration?.seconds || 0;
  const isWithinDuration = duration >= MIN_TRACK_DURATION_SECONDS && duration <= MAX_TRACK_DURATION_SECONDS;
  
  const title = (video.title || "").toLowerCase();
  const hasShortsKeyword = ["#shorts", "shorts", "reels", "tiktok", "status"].some(k => title.includes(k));

  return isWithinDuration && !hasShortsKeyword;
};

/**
 * Find the most relevant YouTube video for a query
 */
exports.findSingleTrack = async (query) => {
  try {
    const r = await yts(query);
    const validVideos = r.videos.filter(isValidMusicTrack);
    const video = validVideos[0];
    
    if (!video) return null;

    return {
      title: video.title,
      youtubeUrl: video.url,
      thumbnailUrl: video.thumbnail || video.image,
      duration: video.duration.seconds,
      views: video.views,
    };
  } catch (error) {
    logger.error("[YouTubeService] Search error:", error);
    return null;
  }
};

/**
 * Find multiple tracks for a query with duration filtering
 */
exports.findTracks = async (query, options = {}) => {
  try {
    const limit = options.maxResults || 10;
    const r = await yts(query);
    
    return r.videos
      .filter(isValidMusicTrack)
      .slice(0, limit)
      .map(video => ({
        title: video.title,
        youtubeUrl: video.url,
        thumbnailUrl: video.thumbnail || video.image,
        duration: video.duration.seconds,
        views: video.views,
        videoId: video.videoId
      }));
  } catch (error) {
    logger.error("[YouTubeService] findTracks error:", error);
    return [];
  }
};

