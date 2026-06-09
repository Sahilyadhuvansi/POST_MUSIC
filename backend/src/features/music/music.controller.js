"use strict";

const musicModel = require("./music.model");
const Playlist = require("../playlists/playlists.model");
const ErrorResponse = require("../../utils/ErrorResponse");
const MESSAGES = require("./music.messages");
const { serializeMusic } = require("./music.serializer");

const ensureLikedSongsPlaylist = async (ownerId) => {
  let playlist = await Playlist.findOne({
    owner: ownerId,
    kind: "system_liked",
  });
  if (playlist) return playlist;

  playlist = await Playlist.create({
    owner: ownerId,
    name: "Liked Songs",
    kind: "system_liked",
    tracks: [],
  });

  return playlist;
};

/**
 * MUSIC CONTROLLER - Music Discover API
 * Silent error handling and scalable file cleanup.
 */

// ─── Create Music (YouTube Focus) ─────────────────────────────────────────────
const createMusic = async (req, res, next) => {
  try {
    const { title, youtubeUrl, thumbnailUrl } = req.body;

    if (!title?.trim()) {
      return next(new ErrorResponse(MESSAGES.TITLE_REQUIRED, 400));
    }
    if (!youtubeUrl) {
      return next(new ErrorResponse(MESSAGES.YOUTUBE_URL_REQUIRED, 400));
    }

    const existing = await musicModel.findOne({
      artist: req.user.id,
      youtubeUrl,
    });

    if (existing) {
      try {
        const liked = await ensureLikedSongsPlaylist(req.user.id);
        const alreadyPresent = (liked.tracks || []).some(
          (t) => t.youtubeUrl === existing.youtubeUrl,
        );
        if (!alreadyPresent) {
          liked.tracks.push({
            youtubeUrl: existing.youtubeUrl,
            title: existing.title,
            thumbnailUrl: existing.thumbnailUrl || null,
            addedAt: new Date(),
          });
          await liked.save();
        }
      } catch {
        // Non-blocking sync.
      }

      return res.status(200).json({
        success: true,
        message: MESSAGES.TRACK_ALREADY_FAVORITE,
        music: serializeMusic(existing),
        requestId: req.id,
      });
    }

    const music = await musicModel.create({
      youtubeUrl,
      title: title.trim(),
      thumbnailUrl: thumbnailUrl || null,
      artist: req.user.id,
    });

    try {
      const liked = await ensureLikedSongsPlaylist(req.user.id);
      const alreadyPresent = (liked.tracks || []).some(
        (t) => t.youtubeUrl === music.youtubeUrl,
      );

      if (!alreadyPresent) {
        liked.tracks.push({
          youtubeUrl: music.youtubeUrl,
          title: music.title,
          thumbnailUrl: music.thumbnailUrl || null,
          addedAt: new Date(),
        });
        await liked.save();
      }
    } catch {
      // Non-blocking sync: music save should still succeed.
    }

    return res.status(201).json({
      success: true,
      message: MESSAGES.TRACK_SAVED,
      music: serializeMusic(music),
      requestId: req.id,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Create Multiple Music (Bulk Save) ──────────────────────────────────────────
const createMultipleMusic = async (req, res, next) => {
  try {
    const { tracks = [] } = req.body;
    if (!Array.isArray(tracks) || tracks.length === 0) {
      return next(new ErrorResponse("No tracks provided", 400));
    }

    const userId = req.user.id;
    const results = { saved: [], skipped: [], failed: [] };

    for (const track of tracks) {
      try {
        const { title, youtubeUrl, thumbnailUrl } = track;
        if (!title?.trim() || !youtubeUrl) {
          results.failed.push({ title, reason: "Invalid data" });
          continue;
        }

        const existing = await musicModel.findOne({
          artist: userId,
          youtubeUrl,
        });
        if (existing) {
          results.skipped.push(title);
          continue;
        }

        const music = await musicModel.create({
          youtubeUrl,
          title: title.trim(),
          thumbnailUrl: thumbnailUrl || null,
          artist: userId,
        });
        results.saved.push(serializeMusic(music));
      } catch (e) {
        results.failed.push({ title: track.title, reason: e.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${tracks.length} tracks.`,
      data: results,
      requestId: req.id,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get My Favorites ────────────────────────────────────────────────────────
const getMyMusics = async (req, res, next) => {
  try {
    const musics = await musicModel
      .find({ artist: req.user.id })
      .select("youtubeUrl title thumbnailUrl artist createdAt")
      .populate("artist", "username profilePic")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      musics,
      requestId: req.id,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get All Music ────────────────────────────────────────────────────────────
const getAllMusics = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const sort =
      req.query.sort === "trending"
        ? { playCount: -1, createdAt: -1 }
        : { createdAt: -1 };
    const skip = (page - 1) * limit;

    const [musics, total] = await Promise.all([
      musicModel
        .find()
        .select("youtubeUrl title thumbnailUrl artist createdAt")
        .populate("artist", "username profilePic")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      musicModel.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      musics,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      requestId: req.id,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Delete Music ─────────────────────────────────────────────────────────────
const deleteMusic = async (req, res, next) => {
  try {
    const music = await musicModel.findById(req.params.musicId);

    if (!music) {
      return next(
        new ErrorResponse(MESSAGES.TRACK_NOT_FOUND, 404, "NOT_FOUND"),
      );
    }

    if (music.artist.toString() !== req.user.id) {
      return next(new ErrorResponse(MESSAGES.FORBIDDEN, 403, "NOT_AUTHORIZED"));
    }

    await musicModel.findByIdAndDelete(req.params.musicId);

    try {
      const liked = await Playlist.findOne({
        owner: req.user.id,
        kind: "system_liked",
      });
      if (liked) {
        liked.tracks = (liked.tracks || []).filter(
          (t) => t.youtubeUrl !== music.youtubeUrl,
        );
        await liked.save();
      }
    } catch {
      // Non-blocking sync: deletion should still succeed.
    }

    return res.status(200).json({
      success: true,
      message: MESSAGES.TRACK_REMOVED,
      requestId: req.id,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createMusic,
  createMultipleMusic,
  getAllMusics,
  getMyMusics,
  deleteMusic,
  ensureLikedSongsPlaylist,
};
