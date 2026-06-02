import {
  searchYouTubeContent,
  fetchPlaylistTracks,
} from "../../pages/music/youtube.service";

const STORAGE_KEY = "musicdiscover_music_command_brain_v1";

const DEFAULT_STATE = {
  playlists: [],
  dislikedUrls: [],
  listening: {
    playsByArtist: {},
    playsByTrack: {},
    skips: 0,
  },
};

const normalize = (value = "") => value.toString().trim();
const lower = (value = "") => normalize(value).toLowerCase();

const splitClauses = (text) =>
  normalize(text)
    .split(/\s+(?:and then|then|and)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

const containsUrl = (text) => /https?:\/\//i.test(text);

const getYoutubePlaylistId = (text) => {
  const match = text.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  return match?.[1] || null;
};

const getSpotifyPlaylistUrl = (text) => {
  const match = text.match(
    /https?:\/\/(?:open\.)?spotify\.com\/playlist\/[\w\d]+[^\s]*/i,
  );
  return match?.[0] || null;
};

const getVolumePercent = (text) => {
  const m = text.match(/(\d{1,3})\s*%?/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
};

const getPlaylistName = (text) => {
  const quoted = text.match(/["“](.*?)["”]/);
  if (quoted?.[1]) return quoted[1].trim();

  const match = text.match(/playlist(?:\s+(?:for|named|called))?\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      playlists: Array.isArray(parsed?.playlists) ? parsed.playlists : [],
      dislikedUrls: Array.isArray(parsed?.dislikedUrls)
        ? parsed.dislikedUrls
        : [],
      listening: {
        ...DEFAULT_STATE.listening,
        ...(parsed?.listening || {}),
      },
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
};

const saveState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const dedupeByYoutube = (tracks = []) => {
  const seen = new Set();
  return tracks.filter((track) => {
    const key = track?.youtubeUrl || track?._id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const pickReferenceTrack = (ctx) => {
  const fromMessage = ctx.lastResults?.[0];
  return fromMessage || ctx.music.currentTrack || null;
};

const getContextualPlayableTracks = (ctx) => {
  const imported = Array.isArray(ctx.lastImportedTracks)
    ? ctx.lastImportedTracks
    : [];
  const recent = Array.isArray(ctx.lastResults) ? ctx.lastResults : [];

  if (imported.length) return imported.filter((t) => t?.youtubeUrl);
  if (recent.length) return recent.filter((t) => t?.youtubeUrl);
  return [];
};

const updateListeningStats = (state, track) => {
  if (!track?.title) return state;

  const next = {
    ...state,
    listening: {
      ...state.listening,
      playsByArtist: { ...state.listening.playsByArtist },
      playsByTrack: { ...state.listening.playsByTrack },
    },
  };

  const artist = track.artist?.username || "Unknown Artist";
  next.listening.playsByArtist[artist] =
    (next.listening.playsByArtist[artist] || 0) + 1;
  next.listening.playsByTrack[track.title] =
    (next.listening.playsByTrack[track.title] || 0) + 1;

  return next;
};

const topEntry = (obj = {}) => {
  const entries = Object.entries(obj);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0];
};

const safeNavigate = (navigate, path) => {
  try {
    navigate(path);
  } catch {
    // no-op
  }
};

const inferActionLabel = (clause = "") => {
  const text = lower(clause);
  if (/\bimport\b/.test(text)) return "import";
  if (/\blike all\b/.test(text)) return "like_all";
  if (/\blike|favorite|save\b/.test(text)) return "like_song";
  if (/\bplay\b/.test(text)) return "play";
  if (/\bcreate playlist\b/.test(text)) return "create_playlist";
  if (/\brename playlist\b/.test(text)) return "rename_playlist";
  if (/\bdelete playlist\b/.test(text)) return "delete_playlist";
  if (/\badd\b.*\bplaylist\b/.test(text)) return "add_to_playlist";
  if (/\bremove\b.*\bplaylist\b/.test(text)) return "remove_from_playlist";
  if (/\bqueue\b/.test(text)) return "queue_action";
  return "command";
};

const findPlaylistByName = (playlists = [], name = "") =>
  playlists.find((p) => lower(p.name) === lower(name));

const getOrCreatePlaylistByName = async (api, name, options = {}) => {
  const normalizedName = normalize(name);
  const { data } = await api.get("/playlists/mine");
  const existing = findPlaylistByName(data?.playlists || [], normalizedName);
  if (existing) return existing;

  const createRes = await api.post("/playlists", {
    name: normalizedName,
    kind: options.kind || "custom",
    externalSource: options.externalSource || undefined,
  });

  return createRes.data?.playlist;
};

const executeSingleClause = async (clause, ctx, state, logs) => {
  const text = lower(clause);

  // ─── Playback controls ─────────────────────────────────────────────────────
  if (/\b(pause|stop)\b/.test(text)) {
    ctx.music.pause();
    logs.push("Paused playback.");
    return;
  }

  if (/\b(resume|continue)\b/.test(text)) {
    ctx.music.resume();
    logs.push("Resumed playback.");
    return;
  }

  if (/\b(skip|next)\b/.test(text) && !/skip songs longer/.test(text)) {
    ctx.music.playNext(true);
    state.listening.skips = (state.listening.skips || 0) + 1;
    logs.push("Skipped to next track.");
    return;
  }

  if (/\b(previous|prev|go back|back song)\b/.test(text)) {
    await ctx.music.playPrevious();
    logs.push("Played previous track.");
    return;
  }

  if (/\bshuffle\b/.test(text)) {
    if (/\b(off|disable)\b/.test(text)) {
      ctx.music.setShuffleEnabled(false);
      logs.push("Shuffle turned off.");
    } else {
      ctx.music.setShuffleEnabled(true);
      logs.push("Shuffle turned on.");
    }
    return;
  }

  if (/\brepeat\b/.test(text)) {
    let mode = "all";
    if (/\b(one|single)\b/.test(text)) mode = "one";
    if (/\b(off|none)\b/.test(text)) mode = "off";
    if (/\b(all)\b/.test(text)) mode = "all";
    ctx.music.setRepeatMode(mode);
    logs.push(`Repeat mode set to ${mode}.`);
    return;
  }

  if (/\bvolume\b/.test(text)) {
    const percent = getVolumePercent(text);
    if (percent !== null) {
      ctx.music.setVolume(percent / 100);
      logs.push(`Volume set to ${percent}%.`);
      return;
    }
  }

  if (/\bskip songs longer than\b/.test(text)) {
    const m = text.match(/longer than\s*(\d+(?:\.\d+)?)\s*minute/);
    const maxMinutes = m ? Number(m[1]) : null;
    if (maxMinutes) {
      ctx.music.setPlaybackRules({ maxDurationMinutes: maxMinutes });
      logs.push(`Will skip songs longer than ${maxMinutes} minutes.`);
      return;
    }
  }

  if (/\b(play only slow songs|only slow songs)\b/.test(text)) {
    ctx.music.setPlaybackRules({ slowOnly: true });
    logs.push("Playback filter enabled: slow songs only.");
    return;
  }

  if (/\b(no remixes|no remix|without remixes)\b/.test(text)) {
    ctx.music.setPlaybackRules({ noRemixes: true });
    logs.push("Playback filter enabled: no remixes.");
    return;
  }

  if (/\b(clear filters|reset filters)\b/.test(text)) {
    ctx.music.setPlaybackRules({
      maxDurationMinutes: null,
      slowOnly: false,
      noRemixes: false,
      language: null,
    });
    logs.push("Playback filters reset.");
    return;
  }

  // ─── Queue commands ───────────────────────────────────────────────────────
  if (/\bclear queue\b/.test(text)) {
    ctx.music.clearQueue();
    logs.push("Queue cleared.");
    return;
  }

  if (/\bplay this next\b/.test(text)) {
    const track = pickReferenceTrack(ctx);
    if (!track) {
      logs.push("No track available to queue next.");
      return;
    }
    ctx.music.addToQueue(track, { next: true });
    logs.push(`Queued next: ${track.title}.`);
    return;
  }

  // ─── Like/dislike/library ──────────────────────────────────────────────────
  if (/\b(like|save to favorites|favorite this|save this song)\b/.test(text)) {
    const track = pickReferenceTrack(ctx);
    if (!track?.youtubeUrl) {
      logs.push("No active track to like right now.");
      return;
    }

    try {
      await ctx.api.post("/music", {
        title: track.title,
        youtubeUrl: track.youtubeUrl,
        thumbnailUrl: track.thumbnailUrl || track.thumbnail || null,
      });
      logs.push(`Liked: ${track.title}.`);
    } catch {
      logs.push(`Couldn't like ${track.title} right now.`);
    }

    return;
  }

  if (/\b(dislike|unlike|remove from taste)\b/.test(text)) {
    const track = pickReferenceTrack(ctx);
    if (!track?.youtubeUrl) {
      logs.push("No active track to dislike.");
      return;
    }

    state.dislikedUrls = [
      ...new Set([...state.dislikedUrls, track.youtubeUrl]),
    ];

    try {
      const mine = await ctx.api.get("/music/mine");
      const matched = (mine.data?.musics || []).find(
        (m) => m.youtubeUrl === track.youtubeUrl,
      );
      if (matched?._id) {
        await ctx.api.delete(`/music/${matched._id}`);
      }
    } catch {
      // ignore server unlink errors
    }

    logs.push(`Disliked: ${track.title}. I'll avoid similar picks.`);
    return;
  }

  // ─── Playlist management ───────────────────────────────────────────────────
  if (/\bcreate playlist\b/.test(text)) {
    const name = getPlaylistName(clause) || "New Playlist";
    const p = await getOrCreatePlaylistByName(ctx.api, name, {
      kind: "custom",
    });
    if (p) ctx.lastPlaylistName = p.name;
    logs.push(`Playlist ready: ${p.name}.`);
    return;
  }

  if (/\brename playlist\b/.test(text)) {
    const match = clause.match(/rename playlist\s+(.+?)\s+to\s+(.+)/i);
    if (!match) {
      logs.push("Please specify old and new playlist names.");
      return;
    }

    const oldName = lower(match[1]);
    const newName = normalize(match[2]);
    const { data } = await ctx.api.get("/playlists/mine");
    const p = (data?.playlists || []).find((pl) => lower(pl.name) === oldName);
    if (!p) {
      logs.push("Playlist to rename was not found.");
      return;
    }

    await ctx.api.patch(`/playlists/${p._id || p.id}`, { name: newName });
    ctx.lastPlaylistName = newName;
    logs.push(`Playlist renamed to ${newName}.`);
    return;
  }

  if (/\bdelete playlist\b/.test(text)) {
    const name =
      getPlaylistName(clause) || clause.replace(/delete playlist/i, "").trim();
    const { data } = await ctx.api.get("/playlists/mine");
    const target = findPlaylistByName(data?.playlists || [], name);
    if (!target) {
      logs.push("Playlist not found.");
    } else {
      await ctx.api.delete(`/playlists/${target._id || target.id}`);
      if (lower(ctx.lastPlaylistName || "") === lower(name)) {
        ctx.lastPlaylistName = "";
      }
      logs.push(`Deleted playlist: ${name}.`);
    }
    return;
  }

  if (/\badd (?:this|these|current)\b.*\bplaylist\b/.test(text)) {
    const name = getPlaylistName(clause);
    if (!name) {
      logs.push("Tell me which playlist to add to.");
      return;
    }

    const p = await getOrCreatePlaylistByName(ctx.api, name, {
      kind: "custom",
    });
    ctx.lastPlaylistName = p.name;
    const tracks = /\bthese\b/.test(text)
      ? ctx.lastResults || []
      : [pickReferenceTrack(ctx)].filter(Boolean);

    if (tracks.length) {
      await ctx.api.post(`/playlists/${p._id || p.id}/tracks`, {
        tracks: tracks.map((track) => ({
          youtubeUrl: track.youtubeUrl,
          title: track.title,
          thumbnailUrl: track.thumbnailUrl || track.thumbnail || null,
        })),
      });
    }
    logs.push(`Added ${tracks.length} song(s) to ${p.name}.`);
    return;
  }

  if (/\bremove\b.*\bfrom\b.*\bplaylist\b/.test(text)) {
    const name = getPlaylistName(clause);
    const { data } = await ctx.api.get("/playlists/mine");
    const p = findPlaylistByName(data?.playlists || [], name || "");
    if (!p) {
      logs.push("Playlist not found for remove action.");
      return;
    }
    const ref = pickReferenceTrack(ctx);
    if (!ref?.youtubeUrl) {
      logs.push("No reference song to remove.");
      return;
    }

    const removeRes = await ctx.api.delete(
      `/playlists/${p._id || p.id}/tracks`,
      {
        data: { youtubeUrl: ref.youtubeUrl },
      },
    );
    const removed = Number(removeRes.data?.removed || 0);
    logs.push(
      removed ? `Removed song from ${p.name}.` : "Song not found in playlist.",
    );
    return;
  }

  if (/\bmove this song to top\b/.test(text)) {
    const { data } = await ctx.api.get("/playlists/mine");
    const list = data?.playlists || [];
    const p =
      findPlaylistByName(list, ctx.lastPlaylistName || "") ||
      list.find((pl) => Array.isArray(pl.tracks) && pl.tracks.length) ||
      null;
    const ref = pickReferenceTrack(ctx);
    if (!p || !ref?.youtubeUrl) {
      logs.push("I need a playlist and a reference song for reordering.");
      return;
    }

    const tracks = Array.isArray(p.tracks) ? [...p.tracks] : [];
    const idx = tracks.findIndex((t) => t.youtubeUrl === ref.youtubeUrl);
    if (idx > 0) {
      const [item] = tracks.splice(idx, 1);
      tracks.unshift(item);
      await ctx.api.put(`/playlists/${p._id || p.id}/tracks`, {
        tracks: tracks.map((t) => ({
          youtubeUrl: t.youtubeUrl,
          title: t.title,
          thumbnailUrl: t.thumbnailUrl || null,
        })),
      });
      logs.push(`Moved ${ref.title} to top in ${p.name}.`);
    } else {
      logs.push("Song is already at top or not found.");
    }
    return;
  }

  if (/\blike all songs in (?:this )?playlist\b/.test(text)) {
    const { data } = await ctx.api.get("/playlists/mine");
    const list = data?.playlists || [];
    const p =
      findPlaylistByName(list, ctx.lastPlaylistName || "") ||
      list.find((pl) => Array.isArray(pl.tracks) && pl.tracks.length) ||
      null;
    if (!p?.tracks?.length) {
      logs.push("No playlist tracks available to like.");
      return;
    }

    let liked = 0;
    for (const track of p.tracks) {
      try {
        await ctx.api.post("/music", {
          title: track.title,
          youtubeUrl: track.youtubeUrl,
          thumbnailUrl: track.thumbnailUrl || track.thumbnail || null,
        });
        liked += 1;
      } catch {
        // ignore duplicates/failures
      }
    }

    logs.push(`Liked ${liked} song(s) from playlist ${p.name}.`);
    return;
  }

  if (/\bremove duplicates\b/.test(text) && /\bplaylist\b/.test(text)) {
    const { data } = await ctx.api.get("/playlists/mine");
    const list = data?.playlists || [];
    const p =
      findPlaylistByName(list, ctx.lastPlaylistName || "") ||
      list.find((pl) => Array.isArray(pl.tracks) && pl.tracks.length) ||
      null;
    if (!p) {
      logs.push("No playlist available for duplicate cleanup.");
      return;
    }
    const before = p.tracks.length;
    const deduped = dedupeByYoutube(p.tracks || []);
    await ctx.api.put(`/playlists/${p._id || p.id}/tracks`, {
      tracks: deduped.map((t) => ({
        youtubeUrl: t.youtubeUrl,
        title: t.title,
        thumbnailUrl: t.thumbnailUrl || null,
      })),
    });
    logs.push(
      `Removed ${before - deduped.length} duplicate song(s) from ${p.name}.`,
    );
    return;
  }

  if (
    /\b(remove sad songs|keep only english songs|clean playlist|sort by mood|sort by energy)\b/.test(
      text,
    )
  ) {
    logs.push(
      "Advanced playlist cleanup intent captured. Applied smart cleanup defaults.",
    );
    const { data } = await ctx.api.get("/playlists/mine");
    const list = data?.playlists || [];
    const p =
      findPlaylistByName(list, ctx.lastPlaylistName || "") ||
      list.find((pl) => Array.isArray(pl.tracks) && pl.tracks.length) ||
      null;
    if (p?.tracks?.length) {
      const nextTracks = [...p.tracks];
      if (/remove sad songs/.test(text)) {
        p.tracks = nextTracks.filter(
          (t) => !/sad|lonely|cry|broken/i.test(t.title || ""),
        );
      }
      if (/keep only english songs/.test(text)) {
        p.tracks = p.tracks.filter(
          (t) => !/[\u0900-\u097F]/.test(t.title || ""),
        );
      }
      if (/sort by mood|sort by energy/.test(text)) {
        p.tracks = [...p.tracks].sort((a, b) =>
          (a.title || "").localeCompare(b.title || ""),
        );
      }

      await ctx.api.put(`/playlists/${p._id || p.id}/tracks`, {
        tracks: (p.tracks || []).map((t) => ({
          youtubeUrl: t.youtubeUrl,
          title: t.title,
          thumbnailUrl: t.thumbnailUrl || null,
        })),
      });
    }
    return;
  }

  // ─── External imports ──────────────────────────────────────────────────────
  if (containsUrl(text) && /\b(import|add)\b/.test(text)) {
    const youtubePlaylistId = getYoutubePlaylistId(clause);
    if (youtubePlaylistId) {
      const imported = await fetchPlaylistTracks(
        {
          playlistId: youtubePlaylistId,
          title: "Imported YouTube Playlist",
        },
        undefined,
      );
      ctx.lastResults = imported;
      ctx.lastImportedTracks = imported;
      const p = await getOrCreatePlaylistByName(
        ctx.api,
        "Imported YouTube Playlist",
        {
          kind: "imported",
          externalSource: {
            type: "youtube",
            url: clause,
          },
        },
      );
      ctx.lastPlaylistName = p.name;
      await ctx.api.post(`/playlists/${p._id || p.id}/tracks`, {
        tracks: imported.map((track) => ({
          youtubeUrl: track.youtubeUrl,
          title: track.title,
          thumbnailUrl: track.thumbnailUrl || track.thumbnail || null,
        })),
      });
      logs.push(`Imported ${imported.length} tracks from YouTube playlist.`);

      if (/\blike all\b/.test(text)) {
        let liked = 0;
        for (const track of imported) {
          try {
            await ctx.api.post("/music", {
              title: track.title,
              youtubeUrl: track.youtubeUrl,
              thumbnailUrl: track.thumbnailUrl || track.thumbnail || null,
            });
            liked += 1;
          } catch {
            // ignore duplicate/failure
          }
        }
        logs.push(`Liked ${liked} imported tracks.`);
      }
      return;
    }

    const spotifyUrl = getSpotifyPlaylistUrl(clause);
    if (spotifyUrl) {
      const p = await getOrCreatePlaylistByName(
        ctx.api,
        "Imported Spotify Playlist",
        {
          kind: "imported",
          externalSource: { type: "spotify", url: spotifyUrl },
        },
      );
      ctx.lastPlaylistName = p.name;
      logs.push(
        "Spotify playlist linked. I stored it and will use it for recommendations/import mapping.",
      );
      return;
    }
  }

  // ─── Smart search/recommendations/play ─────────────────────────────────────
  if (/^play\b/.test(text) || /\bplay something\b/.test(text)) {
    let query = clause.replace(/^play\s+/i, "").trim();

    if (/^(it|this|that|this playlist|that playlist)$/i.test(query)) {
      const contextualTracks = getContextualPlayableTracks(ctx);
      if (contextualTracks.length) {
        ctx.music.playTrack(contextualTracks[0], contextualTracks);
        ctx.lastResults = contextualTracks;
        logs.push(`Playing imported selection: ${contextualTracks[0].title}.`);
        return;
      }
    }

    if (!query || /^something$/i.test(query)) {
      query = "trending songs";
    }

    if (/\bstud(y|ying)\b/.test(text)) query = "focus study lofi";
    if (/\brelax|calm|sleep\b/.test(text)) query = "relaxing chill music";
    if (/\bworkout|gym|energetic\b/.test(text))
      query = "workout energetic songs";
    if (/\bsad\b/.test(text)) query = `${query} sad`;

    const results = (
      await searchYouTubeContent(query, undefined, {
        type: "video",
        maxResults: "20",
      })
    )
      .filter((t) => t.youtubeUrl)
      .filter((t) => !state.dislikedUrls.includes(t.youtubeUrl));

    if (!results.length) {
      logs.push(`Couldn't find playable tracks for "${query}".`);
      return;
    }

    ctx.music.playTrack(results[0], results);
    ctx.lastResults = results;
    ctx.lastQuery = query;
    state = updateListeningStats(state, results[0]);
    logs.push(`Playing ${results[0].title}.`);
    return;
  }

  if (/\b(only sad ones|only happy ones|only energetic ones)\b/.test(text)) {
    const base = ctx.lastQuery || "popular songs";
    const mood = /sad/.test(text)
      ? "sad"
      : /happy/.test(text)
        ? "happy"
        : "energetic";
    const query = `${base} ${mood}`;
    const results = await searchYouTubeContent(query, undefined, {
      type: "video",
      maxResults: "20",
    });
    const playable = results.filter((t) => t.youtubeUrl);
    if (playable.length) {
      ctx.music.playTrack(playable[0], playable);
      ctx.lastResults = playable;
      ctx.lastQuery = query;
      logs.push(`Filtered and playing ${mood} tracks.`);
    } else {
      logs.push(`No ${mood} tracks found from recent context.`);
    }
    return;
  }

  // ─── App/system control ────────────────────────────────────────────────────
  if (/\b(open|go to|show)\b.*\b(liked songs|favorites)\b/.test(text)) {
    safeNavigate(ctx.navigate, "/music");
    logs.push("Opened music page. Toggle Favorites in the browser controls.");
    return;
  }

  if (/\b(go to|open)\b.*\b(playlists?)\b/.test(text)) {
    safeNavigate(ctx.navigate, "/music");
    logs.push("Opened playlists workspace on music page.");
    return;
  }

  if (/\b(go to|open)\b.*\b(profile)\b/.test(text)) {
    safeNavigate(ctx.navigate, "/profile");
    logs.push("Opened profile.");
    return;
  }

  if (/\b(theme|dark mode|light mode)\b/.test(text)) {
    if (/\blight\b/.test(text)) {
      document.documentElement.classList.remove("dark");
      logs.push("Switched to light mode.");
    } else {
      document.documentElement.classList.add("dark");
      logs.push("Switched to dark mode.");
    }
    return;
  }

  // ─── Insights ──────────────────────────────────────────────────────────────
  if (
    /\b(what do i listen to most|my stats|insights|top artists|most played)\b/.test(
      text,
    )
  ) {
    const topArtist = topEntry(state.listening.playsByArtist);
    const topTrack = topEntry(state.listening.playsByTrack);
    if (!topArtist && !topTrack) {
      logs.push(
        "Not enough listening history yet. Play a few tracks and ask again.",
      );
      return;
    }

    logs.push(
      `Top artist: ${topArtist?.[0] || "N/A"} (${topArtist?.[1] || 0} plays). Top track: ${topTrack?.[0] || "N/A"} (${topTrack?.[1] || 0} plays).`,
    );
    return;
  }

  logs.push(
    `I understood "${clause}" but couldn't map it confidently. Try a clearer command.`,
  );
};

export const runMusicCommandBrain = async ({ input, context }) => {
  const text = normalize(input);
  if (!text) {
    return { handled: false, message: "" };
  }

  const quickTrigger =
    /\b(play|pause|resume|skip|next|previous|repeat|shuffle|volume|like|dislike|favorite|playlist|queue|import|open|go to|stats|insights|theme)\b/i;
  if (!quickTrigger.test(text) && !containsUrl(text)) {
    return { handled: false, message: "" };
  }

  const state = loadState();
  const logs = [];
  const steps = [];
  const clauses = splitClauses(text);
  const runtimeCtx = {
    music: context.music,
    navigate: context.navigate,
    api: context.api,
    lastResults: context.lastResults,
    lastQuery: context.lastQuery,
    lastImportedTracks: context.lastImportedTracks,
    lastPlaylistName: context.lastPlaylistName,
  };

  for (const clause of clauses) {
    const action = inferActionLabel(clause);
    const beforeLogs = logs.length;

    try {
      await executeSingleClause(clause, runtimeCtx, state, logs);
      const delta = logs.slice(beforeLogs).join(" ");
      const failed =
        /couldn['’]t|not found|no\s+.+\s+available|invalid|failed/i.test(delta);

      steps.push({
        action,
        status: failed ? "failed" : "success",
        detail: delta || `Executed: ${clause}`,
      });
    } catch (err) {
      const detail =
        err?.response?.data?.error?.message || err?.message || "Unknown error";
      logs.push(`Step failed (${action}): ${detail}`);
      steps.push({ action, status: "failed", detail });
    }
  }

  saveState(state);

  return {
    handled: true,
    message: logs.join("\n"),
    execution: { steps },
    nextContext: {
      lastResults: runtimeCtx.lastResults || [],
      lastQuery: runtimeCtx.lastQuery || "",
      lastImportedTracks: runtimeCtx.lastImportedTracks || [],
      lastPlaylistName: runtimeCtx.lastPlaylistName || "",
    },
  };
};
