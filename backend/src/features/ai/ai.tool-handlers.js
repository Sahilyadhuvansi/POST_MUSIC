"use strict";

const { z } = require("zod");
const youtubeService = require("../../services/youtube.service");
const webSearchService = require("../../services/web-search.service");
const embeddingService = require("../../services/embedding.service");
const Music = require("../music/music.model");
const Playlist = require("../playlists/playlists.model");
const { ensureLikedSongsPlaylist } = require("../music/music.controller");

// ─── Response factory ──────────────────────────────────────────────────────────
const ok = (action, data, message) => ({ success: true, action, data, message });
const fail = (action, message) => ({ success: false, action, data: null, message });

// ─── Utility helpers ───────────────────────────────────────────────────────────
const trim = (v = "") => String(v).trim();

const searchLocal = async (query, limit = 10) => {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Music.find({
    $or: [
      { title: new RegExp(escaped, "i") },
      { youtubeUrl: new RegExp(escaped, "i") },
    ],
  })
    .select("_id youtubeUrl title thumbnailUrl artist createdAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

const syncLikedPlaylist = async (userId, song) => {
  try {
    const playlist = await ensureLikedSongsPlaylist(userId);
    const already = (playlist.tracks || []).some(t => t.youtubeUrl === song.youtubeUrl);
    if (!already) {
      playlist.tracks.push({
        youtubeUrl: song.youtubeUrl,
        title: song.title,
        thumbnailUrl: song.thumbnailUrl || null,
        addedAt: new Date(),
      });
      await playlist.save();
    }
  } catch { /* non-critical — liked songs playlist sync is best-effort */ }
};

const extractYouTubeUrl = (text = "") => {
  const m = text.match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s]+/i);
  return m?.[0] ?? null;
};

const extractSpotifyUrl = (text = "") => {
  const m = text.match(/https?:\/\/(?:open\.)?spotify\.com\/[^\s]+/i);
  return m?.[0] ?? null;
};

// ─── Tool handlers ─────────────────────────────────────────────────────────────

const handlers = {

  search_music: async (args) => {
    const query = trim(args?.query);
    if (!query) return fail("search_music", "Please tell me what to search for.");

    const [local, yt] = await Promise.all([
      searchLocal(query, 10),
      youtubeService.findTracks(query, { maxResults: 15 }).catch(() => []),
    ]);

    const localUrls = new Set(local.map(m => m.youtubeUrl));
    const merged = [
      ...local.map(m => ({ ...m, songId: String(m._id), source: "library" })),
      ...yt
        .filter(t => !localUrls.has(t.youtubeUrl))
        .map(t => ({
          songId: `yt_${t.videoId}`,
          title: t.title,
          youtubeUrl: t.youtubeUrl,
          thumbnailUrl: t.thumbnailUrl || t.thumbnail || null,
          source: "youtube",
        })),
    ];

    return ok(
      "search_music",
      { query, musics: merged },
      merged.length ? `Found ${merged.length} results for "${query}".` : `No results for "${query}".`,
    );
  },

  play_song: async (args) => {
    const query = trim(args?.query);
    const url = trim(args?.youtubeUrl);
    if (!query && !url) return fail("play_song", "Which song should I play?");

    let track = url
      ? { youtubeUrl: url, title: args?.title || "Requested track", thumbnailUrl: args?.thumbnailUrl || null }
      : null;

    if (!track) {
      const results = await youtubeService.findTracks(query, { maxResults: 1 }).catch(() => []);
      if (results.length) {
        track = {
          youtubeUrl: results[0].youtubeUrl,
          title: results[0].title,
          thumbnailUrl: results[0].thumbnailUrl || results[0].thumbnail || null,
        };
      }
    }

    if (!track) return fail("play_song", `Couldn't find "${query}" to play.`);
    return ok("play_song", { track }, `Playing: ${track.title}`);
  },

  fetch_favorites: async (_args, req) => {
    const musics = await Music.find({ artist: req.user.id })
      .select("_id youtubeUrl title thumbnailUrl artist createdAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const data = musics.map(m => ({ ...m, songId: String(m._id) }));
    return ok(
      "fetch_favorites",
      { musics: data },
      data.length ? `Found ${data.length} saved tracks.` : "You haven't saved any songs yet.",
    );
  },

  like_song: async (args, req) => {
    const { songId, youtubeUrl, query, title = "Saved Track", thumbnailUrl } = args || {};
    let target = null;

    if (songId) {
      if (String(songId).startsWith("yt_")) {
        target = {
          youtubeUrl: `https://www.youtube.com/watch?v=${songId.replace(/^yt_/, "")}`,
          title,
          thumbnailUrl: thumbnailUrl || null,
        };
      } else {
        target = await Music.findById(songId)
          .select("youtubeUrl title thumbnailUrl")
          .lean()
          .catch(() => null);
      }
    }

    if (!target && youtubeUrl) {
      target = { youtubeUrl, title, thumbnailUrl: thumbnailUrl || null };
    }

    if (!target && query) {
      const local = await searchLocal(query, 1);
      if (local.length) {
        target = local[0];
      } else {
        const yt = await youtubeService.findTracks(query, { maxResults: 1 }).catch(() => []);
        if (yt.length) {
          target = { youtubeUrl: yt[0].youtubeUrl, title: yt[0].title, thumbnailUrl: yt[0].thumbnailUrl || null };
        }
      }
    }

    if (!target?.youtubeUrl) {
      return fail("like_song", "Please provide a song name or YouTube link to save.");
    }

    const existing = await Music.findOne({ artist: req.user.id, youtubeUrl: target.youtubeUrl }).lean();
    if (existing) return ok("like_song", existing, `"${existing.title}" is already in your library.`);

    const saved = await Music.create({
      artist: req.user.id,
      youtubeUrl: target.youtubeUrl,
      title: trim(target.title || title),
      thumbnailUrl: target.thumbnailUrl || null,
    });

    await syncLikedPlaylist(req.user.id, saved);
    return ok("like_song", saved.toObject(), `Saved: "${saved.title}"`);
  },

  delete_song: async (args, req) => {
    const { songId, youtubeUrl, title } = args || {};
    if (!songId && !youtubeUrl && !title) {
      return fail("delete_song", "Tell me which song to remove — name, ID, or URL.");
    }

    const filter = { artist: req.user.id };
    if (songId) filter._id = songId;
    else if (youtubeUrl) filter.youtubeUrl = youtubeUrl;
    else filter.title = new RegExp(trim(title).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const song = await Music.findOneAndDelete(filter);
    if (!song) return fail("delete_song", "Song not found in your library.");

    try {
      const playlist = await Playlist.findOne({ owner: req.user.id, kind: "system_liked" });
      if (playlist) {
        playlist.tracks = playlist.tracks.filter(t => t.youtubeUrl !== song.youtubeUrl);
        await playlist.save();
      }
    } catch { /* non-critical */ }

    return ok("delete_song", song.toObject(), `Removed: "${song.title}"`);
  },

  batch_like: async (args, req) => {
    const tracks = Array.isArray(args?.tracks) ? args.tracks : [];
    if (!tracks.length) return fail("batch_like", "No tracks provided.");

    const results = { saved: [], skipped: [], failed: [] };

    for (const t of tracks) {
      try {
        const yt = await youtubeService
          .findSingleTrack(`${t.title} ${t.artist || ""}`.trim())
          .catch(() => null);
        if (!yt) { results.failed.push(t.title); continue; }

        const exists = await Music.findOne({ artist: req.user.id, youtubeUrl: yt.youtubeUrl }).lean();
        if (exists) { results.skipped.push(t.title); continue; }

        const saved = await Music.create({
          artist: req.user.id,
          youtubeUrl: yt.youtubeUrl,
          title: yt.title,
          thumbnailUrl: yt.thumbnailUrl || null,
        });
        results.saved.push(saved.title);
      } catch {
        results.failed.push(t.title);
      }
    }

    return ok(
      "batch_like",
      results,
      `Saved ${results.saved.length}, skipped ${results.skipped.length}, failed ${results.failed.length}.`,
    );
  },

  import_playlist: async (args) => {
    const { url = "", source = "spotify" } = args || {};
    return ok(
      "import_playlist",
      { url, source },
      "Playlist import initiated — confirm to start the batch import.",
    );
  },

  semantic_search_music: async (args) => {
    const query = trim(args?.query);
    if (!query) return fail("semantic_search_music", "Describe the vibe or feeling you're after.");

    const results = await embeddingService.searchMusicByMeaning(query, { limit: 10 });

    // Embeddings unavailable (model offline) — degrade to keyword search
    if (results === null) return handlers.search_music({ query });

    const musics = results.map(m => ({
      ...m,
      songId: String(m._id),
      source: "library",
    }));

    return ok(
      "semantic_search_music",
      { query, musics },
      musics.length
        ? `Found ${musics.length} tracks matching that vibe.`
        : `Nothing in the library matches "${query}" yet — try a regular search to pull from YouTube.`,
    );
  },

  web_search: async (args) => {
    const query = trim(args?.query);
    if (!query) return fail("web_search", "What should I look up?");

    const results = await webSearchService.search(query, { maxResults: 5 });
    return ok(
      "web_search",
      { query, results },
      results.length ? `Found ${results.length} results for "${query}".` : `No web results for "${query}".`,
    );
  },
};

// ─── Tool registry ─────────────────────────────────────────────────────────────
// `parameters` are zod schemas — converted to JSON Schema for the LLM's native
// tool-calling API and used to validate/coerce planner-produced args.
const TOOLS = {
  search_music: {
    description: "Search music by title or artist (local library + YouTube)",
    requiresAuth: false,
    parameters: z.object({
      query: z.string().describe("Song title, artist name, or keywords"),
    }),
    handler: handlers.search_music,
  },
  semantic_search_music: {
    description: "Find library songs by mood, vibe, or meaning rather than exact keywords (e.g. 'songs for a rainy night')",
    requiresAuth: false,
    parameters: z.object({
      query: z.string().describe("Mood, feeling, or vibe description"),
    }),
    handler: handlers.semantic_search_music,
  },
  play_song: {
    description: "Find and stream a song by title or YouTube URL",
    requiresAuth: false,
    parameters: z.object({
      query: z.string().optional().describe("Song title or artist to play"),
      youtubeUrl: z.string().optional().describe("Direct YouTube URL"),
    }),
    handler: handlers.play_song,
  },
  fetch_favorites: {
    description: "Retrieve the current user's saved songs",
    requiresAuth: true,
    parameters: z.object({}),
    handler: handlers.fetch_favorites,
  },
  like_song: {
    description: "Save a single song to the user's library",
    requiresAuth: true,
    parameters: z.object({
      query: z.string().optional().describe("Song title to find and save"),
      youtubeUrl: z.string().optional().describe("Direct YouTube URL"),
      songId: z.string().optional().describe("ID of a song from recent search results"),
    }),
    handler: handlers.like_song,
  },
  delete_song: {
    description: "Remove a song from the user's library",
    requiresAuth: true,
    parameters: z.object({
      title: z.string().optional().describe("Song title to remove"),
      youtubeUrl: z.string().optional().describe("YouTube URL of the song"),
      songId: z.string().optional().describe("ID of a song from recent search results"),
    }),
    handler: handlers.delete_song,
  },
  batch_like: {
    description: "Save multiple songs in one batch operation",
    requiresAuth: true,
    parameters: z.object({
      tracks: z.array(z.object({
        title: z.string(),
        artist: z.string().optional(),
      })).describe("List of songs to save"),
    }),
    handler: handlers.batch_like,
  },
  import_playlist: {
    description: "Import a Spotify or YouTube playlist",
    requiresAuth: true,
    parameters: z.object({
      url: z.string().describe("Playlist URL"),
      source: z.enum(["spotify", "youtube"]).default("spotify"),
    }),
    handler: handlers.import_playlist,
  },
  web_search: {
    description: "Search the web for music facts, artist news, release dates, or anything not in the music library",
    requiresAuth: false,
    parameters: z.object({
      query: z.string().describe("Web search query"),
    }),
    handler: handlers.web_search,
  },
};

// OpenAI-style function specs for the LLM `tools` parameter (Groq + Gemini compatible)
const toLLMSpec = () =>
  Object.entries(TOOLS).map(([name, def]) => ({
    type: "function",
    function: {
      name,
      description: def.description,
      parameters: z.toJSONSchema(def.parameters),
    },
  }));

module.exports = { TOOLS, toLLMSpec, searchLocal, extractYouTubeUrl, extractSpotifyUrl };
