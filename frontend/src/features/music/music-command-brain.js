/**
 * Music Command Brain — client-side command interpreter
 * ──────────────────────────────────────────────────────
 * Intercepts music-control commands (play, pause, queue, playlist, import, etc.)
 * and executes them locally WITHOUT an AI/LLM call, keeping latency near-zero.
 *
 * The FloatingAIButton calls this FIRST; only when this returns { handled: false }
 * does the app fall through to the agentic backend chat.
 */

import { searchYouTubeContent, fetchPlaylistTracks } from "../../pages/music/youtube.service";

// ─── Persistent state (survives page reloads) ─────────────────────────────────
const STORAGE_KEY = "musicdiscover_brain_v2";

const DEFAULT_STATE = {
  playlists: [],
  dislikedUrls: [],
  listening: { playsByArtist: {}, playsByTrack: {}, skips: 0 },
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
      dislikedUrls: Array.isArray(parsed?.dislikedUrls) ? parsed.dislikedUrls : [],
      listening: { ...DEFAULT_STATE.listening, ...(parsed?.listening ?? {}) },
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
};

const saveState = (state) => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const norm  = (v = "") => String(v).trim();
const lower = (v = "") => norm(v).toLowerCase();

const splitClauses = (text) =>
  norm(text)
    .split(/\s+(?:and then|then|and)\s+/i)
    .map(p => p.trim())
    .filter(Boolean);

const containsUrl = (text) => /https?:\/\//i.test(text);

const getYouTubePlaylistId = (text) => text.match(/[?&]list=([a-zA-Z0-9_-]+)/i)?.[1] ?? null;

const getSpotifyPlaylistUrl = (text) =>
  text.match(/https?:\/\/(?:open\.)?spotify\.com\/playlist\/[\w\d]+[^\s]*/i)?.[0] ?? null;

const getVolumePercent = (text) => {
  const m = text.match(/(\d{1,3})\s*%?/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
};

const getPlaylistName = (text) => {
  const quoted = text.match(/[""](.*?)[""]/);
  if (quoted?.[1]) return quoted[1].trim();
  return text.match(/playlist(?:\s+(?:for|named|called))?\s+(.+)$/i)?.[1]?.trim() ?? null;
};

const pickReferenceTrack = (ctx) => ctx.lastResults?.[0] ?? ctx.music.currentTrack ?? null;

const getContextualTracks = (ctx) => {
  const imported = Array.isArray(ctx.lastImportedTracks) ? ctx.lastImportedTracks : [];
  const recent   = Array.isArray(ctx.lastResults) ? ctx.lastResults : [];
  return (imported.length ? imported : recent).filter(t => t?.youtubeUrl);
};

const dedupeByUrl = (tracks = []) => {
  const seen = new Set();
  return tracks.filter(t => {
    const key = t?.youtubeUrl || t?._id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const updateListeningStats = (state, track) => {
  if (!track?.title) return state;
  const next = { ...state, listening: { ...state.listening, playsByArtist: { ...state.listening.playsByArtist }, playsByTrack: { ...state.listening.playsByTrack } } };
  const artist = track.artist?.username ?? "Unknown Artist";
  next.listening.playsByArtist[artist] = (next.listening.playsByArtist[artist] ?? 0) + 1;
  next.listening.playsByTrack[track.title] = (next.listening.playsByTrack[track.title] ?? 0) + 1;
  return next;
};

const topEntry = (obj = {}) => {
  const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  return entries[0] ?? null;
};

const safeNavigate = (navigate, path) => { try { navigate(path); } catch { /* no-op */ } };

const findPlaylist = (playlists = [], name = "") =>
  playlists.find(p => lower(p.name) === lower(name));

const getOrCreatePlaylist = async (api, name, options = {}) => {
  const { data } = await api.get("/playlists/mine");
  const found = findPlaylist(data?.playlists ?? [], name);
  if (found) return found;
  const res = await api.post("/playlists", { name: norm(name), kind: options.kind ?? "custom", externalSource: options.externalSource });
  return res.data?.playlist;
};

// ─── Quick trigger — only run brain when these keywords are present ───────────
const QUICK_TRIGGER =
  /\b(play|pause|resume|stop|skip|next|previous|repeat|shuffle|volume|like|dislike|favorite|playlist|queue|import|open|go to|stats|insights|theme)\b/i;

// ─── Single-clause executor ───────────────────────────────────────────────────
const executeClause = async (clause, ctx, state, logs) => {
  const text = lower(clause);

  // ── Playback controls ──────────────────────────────────────────────────────
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
    state.listening.skips = (state.listening.skips ?? 0) + 1;
    logs.push("Skipped to next track.");
    return;
  }
  if (/\b(previous|prev|go back|back song)\b/.test(text)) {
    await ctx.music.playPrevious();
    logs.push("Played previous track.");
    return;
  }
  if (/\bshuffle\b/.test(text)) {
    const on = !/\b(off|disable)\b/.test(text);
    ctx.music.setShuffleEnabled(on);
    logs.push(`Shuffle ${on ? "on" : "off"}.`);
    return;
  }
  if (/\brepeat\b/.test(text)) {
    const mode = /\b(one|single)\b/.test(text) ? "one" : /\b(off|none)\b/.test(text) ? "off" : "all";
    ctx.music.setRepeatMode(mode);
    logs.push(`Repeat mode: ${mode}.`);
    return;
  }
  if (/\bvolume\b/.test(text)) {
    const pct = getVolumePercent(text);
    if (pct !== null) { ctx.music.setVolume(pct / 100); logs.push(`Volume set to ${pct}%.`); return; }
  }
  if (/\bskip songs longer than\b/.test(text)) {
    const m = text.match(/longer than\s*(\d+(?:\.\d+)?)\s*minute/);
    if (m) { ctx.music.setPlaybackRules({ maxDurationMinutes: Number(m[1]) }); logs.push(`Skipping songs longer than ${m[1]} min.`); return; }
  }
  if (/\b(play only slow songs|only slow songs)\b/.test(text)) {
    ctx.music.setPlaybackRules({ slowOnly: true });
    logs.push("Playback filter: slow songs only.");
    return;
  }
  if (/\b(no remixes?|without remixes?)\b/.test(text)) {
    ctx.music.setPlaybackRules({ noRemixes: true });
    logs.push("Playback filter: no remixes.");
    return;
  }
  if (/\b(clear filters?|reset filters?)\b/.test(text)) {
    ctx.music.setPlaybackRules({ maxDurationMinutes: null, slowOnly: false, noRemixes: false });
    logs.push("Playback filters reset.");
    return;
  }

  // ── Queue controls ─────────────────────────────────────────────────────────
  if (/\bclear queue\b/.test(text)) {
    ctx.music.clearQueue();
    logs.push("Queue cleared.");
    return;
  }
  if (/\bplay this next\b/.test(text)) {
    const track = pickReferenceTrack(ctx);
    if (!track) { logs.push("No track available to queue next."); return; }
    ctx.music.addToQueue(track, { next: true });
    logs.push(`Queued next: ${track.title}.`);
    return;
  }

  // ── Like / dislike ─────────────────────────────────────────────────────────
  if (/\b(like this|save this|favorite this|save this song|like this song)\b/.test(text)) {
    const track = pickReferenceTrack(ctx);
    if (!track?.youtubeUrl) { logs.push("No active track to save."); return; }
    try {
      await ctx.api.post("/music", { title: track.title, youtubeUrl: track.youtubeUrl, thumbnailUrl: track.thumbnailUrl ?? null });
      logs.push(`Saved: ${track.title}.`);
    } catch { logs.push(`Couldn't save ${track.title} right now.`); }
    return;
  }
  if (/\b(dislike|unlike|remove from taste)\b/.test(text)) {
    const track = pickReferenceTrack(ctx);
    if (!track?.youtubeUrl) { logs.push("No active track to dislike."); return; }
    state.dislikedUrls = [...new Set([...state.dislikedUrls, track.youtubeUrl])];
    try {
      const mine = await ctx.api.get("/music/mine");
      const matched = (mine.data?.musics ?? []).find(m => m.youtubeUrl === track.youtubeUrl);
      if (matched?._id) await ctx.api.delete(`/music/${matched._id}`);
    } catch { /* ignore */ }
    logs.push(`Disliked: ${track.title}. I'll avoid similar picks.`);
    return;
  }

  // ── Playlist management ────────────────────────────────────────────────────
  if (/\bcreate playlist\b/.test(text)) {
    const name = getPlaylistName(clause) ?? "New Playlist";
    const p = await getOrCreatePlaylist(ctx.api, name, { kind: "custom" });
    ctx.lastPlaylistName = p.name;
    logs.push(`Playlist ready: ${p.name}.`);
    return;
  }
  if (/\brename playlist\b/.test(text)) {
    const m = clause.match(/rename playlist\s+(.+?)\s+to\s+(.+)/i);
    if (!m) { logs.push("Specify old and new playlist names."); return; }
    const { data } = await ctx.api.get("/playlists/mine");
    const p = (data?.playlists ?? []).find(pl => lower(pl.name) === lower(m[1]));
    if (!p) { logs.push("Playlist not found."); return; }
    await ctx.api.patch(`/playlists/${p._id || p.id}`, { name: norm(m[2]) });
    ctx.lastPlaylistName = norm(m[2]);
    logs.push(`Playlist renamed to ${norm(m[2])}.`);
    return;
  }
  if (/\bdelete playlist\b/.test(text)) {
    const name = getPlaylistName(clause) ?? clause.replace(/delete playlist/i, "").trim();
    const { data } = await ctx.api.get("/playlists/mine");
    const p = findPlaylist(data?.playlists ?? [], name);
    if (!p) { logs.push("Playlist not found."); return; }
    await ctx.api.delete(`/playlists/${p._id || p.id}`);
    if (lower(ctx.lastPlaylistName ?? "") === lower(name)) ctx.lastPlaylistName = "";
    logs.push(`Deleted playlist: ${name}.`);
    return;
  }
  if (/\badd (?:this|these|current)\b.*\bplaylist\b/.test(text)) {
    const name = getPlaylistName(clause);
    if (!name) { logs.push("Tell me which playlist to add to."); return; }
    const p = await getOrCreatePlaylist(ctx.api, name, { kind: "custom" });
    ctx.lastPlaylistName = p.name;
    const tracks = /\bthese\b/.test(text) ? ctx.lastResults ?? [] : [pickReferenceTrack(ctx)].filter(Boolean);
    if (tracks.length) {
      await ctx.api.post(`/playlists/${p._id || p.id}/tracks`, {
        tracks: tracks.map(t => ({ youtubeUrl: t.youtubeUrl, title: t.title, thumbnailUrl: t.thumbnailUrl ?? null })),
      });
    }
    logs.push(`Added ${tracks.length} song(s) to ${p.name}.`);
    return;
  }
  if (/\bremove\b.*\bfrom\b.*\bplaylist\b/.test(text)) {
    const name = getPlaylistName(clause);
    const { data } = await ctx.api.get("/playlists/mine");
    const p = findPlaylist(data?.playlists ?? [], name ?? "");
    if (!p) { logs.push("Playlist not found."); return; }
    const ref = pickReferenceTrack(ctx);
    if (!ref?.youtubeUrl) { logs.push("No reference song to remove."); return; }
    const res = await ctx.api.delete(`/playlists/${p._id || p.id}/tracks`, { data: { youtubeUrl: ref.youtubeUrl } });
    logs.push(Number(res.data?.removed ?? 0) ? `Removed from ${p.name}.` : "Song not found in playlist.");
    return;
  }
  if (/\bmove this song to top\b/.test(text)) {
    const { data } = await ctx.api.get("/playlists/mine");
    const list = data?.playlists ?? [];
    const p = findPlaylist(list, ctx.lastPlaylistName ?? "") ?? list.find(pl => pl.tracks?.length);
    const ref = pickReferenceTrack(ctx);
    if (!p || !ref?.youtubeUrl) { logs.push("Need a playlist and a reference song."); return; }
    const tracks = Array.isArray(p.tracks) ? [...p.tracks] : [];
    const idx = tracks.findIndex(t => t.youtubeUrl === ref.youtubeUrl);
    if (idx > 0) {
      const [item] = tracks.splice(idx, 1);
      tracks.unshift(item);
      await ctx.api.put(`/playlists/${p._id || p.id}/tracks`, {
        tracks: tracks.map(t => ({ youtubeUrl: t.youtubeUrl, title: t.title, thumbnailUrl: t.thumbnailUrl ?? null })),
      });
      logs.push(`Moved ${ref.title} to top of ${p.name}.`);
    } else { logs.push("Song is already at top or not found."); }
    return;
  }
  if (/\blike all songs in (?:this )?playlist\b/.test(text)) {
    const { data } = await ctx.api.get("/playlists/mine");
    const list = data?.playlists ?? [];
    const p = findPlaylist(list, ctx.lastPlaylistName ?? "") ?? list.find(pl => pl.tracks?.length);
    if (!p?.tracks?.length) { logs.push("No playlist tracks to like."); return; }
    let liked = 0;
    for (const t of p.tracks) {
      try { await ctx.api.post("/music", { title: t.title, youtubeUrl: t.youtubeUrl, thumbnailUrl: t.thumbnailUrl ?? null }); liked++; } catch { /* duplicate */ }
    }
    logs.push(`Liked ${liked} song(s) from ${p.name}.`);
    return;
  }
  if (/\bremove duplicates\b/.test(text) && /\bplaylist\b/.test(text)) {
    const { data } = await ctx.api.get("/playlists/mine");
    const list = data?.playlists ?? [];
    const p = findPlaylist(list, ctx.lastPlaylistName ?? "") ?? list.find(pl => pl.tracks?.length);
    if (!p) { logs.push("No playlist available."); return; }
    const before = p.tracks.length;
    const deduped = dedupeByUrl(p.tracks);
    await ctx.api.put(`/playlists/${p._id || p.id}/tracks`, {
      tracks: deduped.map(t => ({ youtubeUrl: t.youtubeUrl, title: t.title, thumbnailUrl: t.thumbnailUrl ?? null })),
    });
    logs.push(`Removed ${before - deduped.length} duplicate(s) from ${p.name}.`);
    return;
  }

  // ── External imports ───────────────────────────────────────────────────────
  if (containsUrl(text) && /\b(import|add)\b/.test(text)) {
    const ytId = getYouTubePlaylistId(clause);
    if (ytId) {
      const imported = await fetchPlaylistTracks({ playlistId: ytId, title: "Imported YouTube Playlist" }, undefined);
      ctx.lastResults = imported;
      ctx.lastImportedTracks = imported;
      const p = await getOrCreatePlaylist(ctx.api, "Imported YouTube Playlist", {
        kind: "imported",
        externalSource: { type: "youtube", url: clause },
      });
      ctx.lastPlaylistName = p.name;
      await ctx.api.post(`/playlists/${p._id || p.id}/tracks`, {
        tracks: imported.map(t => ({ youtubeUrl: t.youtubeUrl, title: t.title, thumbnailUrl: t.thumbnailUrl ?? null })),
      });
      logs.push(`Imported ${imported.length} tracks from YouTube playlist.`);
      if (/\blike all\b/.test(text)) {
        let liked = 0;
        for (const t of imported) {
          try { await ctx.api.post("/music", { title: t.title, youtubeUrl: t.youtubeUrl, thumbnailUrl: t.thumbnailUrl ?? null }); liked++; } catch { /* duplicate */ }
        }
        logs.push(`Liked ${liked} imported tracks.`);
      }
      return;
    }
    const spotifyUrl = getSpotifyPlaylistUrl(clause);
    if (spotifyUrl) {
      const p = await getOrCreatePlaylist(ctx.api, "Imported Spotify Playlist", {
        kind: "imported",
        externalSource: { type: "spotify", url: spotifyUrl },
      });
      ctx.lastPlaylistName = p.name;
      logs.push("Spotify playlist linked.");
      return;
    }
  }

  // ── Smart play ─────────────────────────────────────────────────────────────
  if (/^play\b/.test(text) || /\bplay something\b/.test(text)) {
    let query = clause.replace(/^play\s+/i, "").trim();

    if (/^(it|this|that|this playlist|that playlist)$/i.test(query)) {
      const tracks = getContextualTracks(ctx);
      if (tracks.length) {
        ctx.music.playTrack(tracks[0], tracks);
        ctx.lastResults = tracks;
        logs.push(`Playing: ${tracks[0].title}.`);
        return;
      }
    }

    if (!query || /^something$/i.test(query)) query = "trending songs";
    if (/\bstud(y|ying)\b/.test(text)) query = "focus study lofi";
    else if (/\brelax|calm|sleep\b/.test(text)) query = "relaxing chill music";
    else if (/\bworkout|gym|energetic\b/.test(text)) query = "workout energetic songs";
    if (/\bsad\b/.test(text)) query = `${query} sad`;

    const results = (await searchYouTubeContent(query, undefined, { type: "video", maxResults: "20" }))
      .filter(t => t.youtubeUrl && !state.dislikedUrls.includes(t.youtubeUrl));

    if (!results.length) { logs.push(`Couldn't find playable tracks for "${query}".`); return; }

    ctx.music.playTrack(results[0], results);
    ctx.lastResults = results;
    ctx.lastQuery = query;
    Object.assign(state, updateListeningStats(state, results[0]));
    logs.push(`Playing: ${results[0].title}.`);
    return;
  }

  if (/\b(only sad ones|only happy ones|only energetic ones)\b/.test(text)) {
    const mood = /sad/.test(text) ? "sad" : /happy/.test(text) ? "happy" : "energetic";
    const results = (await searchYouTubeContent(`${ctx.lastQuery || "popular songs"} ${mood}`, undefined, { type: "video", maxResults: "20" }))
      .filter(t => t.youtubeUrl);
    if (results.length) { ctx.music.playTrack(results[0], results); ctx.lastResults = results; logs.push(`Playing ${mood} tracks.`); }
    else { logs.push(`No ${mood} tracks found.`); }
    return;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  if (/\b(open|go to|show)\b.*\b(liked songs|favorites)\b/.test(text)) {
    safeNavigate(ctx.navigate, "/music");
    logs.push("Opened music page.");
    return;
  }
  if (/\b(go to|open)\b.*\bplaylists?\b/.test(text)) {
    safeNavigate(ctx.navigate, "/music");
    logs.push("Opened playlists.");
    return;
  }
  if (/\b(go to|open)\b.*\bprofile\b/.test(text)) {
    safeNavigate(ctx.navigate, "/profile");
    logs.push("Opened profile.");
    return;
  }

  // ── Theme ──────────────────────────────────────────────────────────────────
  if (/\b(theme|dark mode|light mode)\b/.test(text)) {
    if (/\blight\b/.test(text)) { document.documentElement.classList.remove("dark"); logs.push("Switched to light mode."); }
    else { document.documentElement.classList.add("dark"); logs.push("Switched to dark mode."); }
    return;
  }

  // ── Listening insights ─────────────────────────────────────────────────────
  if (/\b(my stats|insights|top artists?|most played|what do i listen to)\b/.test(text)) {
    const topArtist = topEntry(state.listening.playsByArtist);
    const topTrack  = topEntry(state.listening.playsByTrack);
    if (!topArtist && !topTrack) { logs.push("No listening history yet. Play some tracks first."); return; }
    logs.push(`Top artist: ${topArtist?.[0] ?? "N/A"} (${topArtist?.[1] ?? 0} plays). Top track: ${topTrack?.[0] ?? "N/A"} (${topTrack?.[1] ?? 0} plays).`);
    return;
  }

  logs.push(`I understood "${clause}" but couldn't map it to an action. Try a clearer command.`);
};

// ─── Public API ───────────────────────────────────────────────────────────────
export const runMusicCommandBrain = async ({ input, context }) => {
  const text = norm(input);
  if (!text) return { handled: false };

  // Skip brain entirely when no known keyword is present (saves a state load)
  if (!QUICK_TRIGGER.test(text) && !containsUrl(text)) return { handled: false };

  const state = loadState();
  const logs  = [];
  const steps = [];

  const runtimeCtx = {
    music: context.music,
    navigate: context.navigate,
    api: context.api,
    lastResults: context.lastResults,
    lastQuery: context.lastQuery,
    lastImportedTracks: context.lastImportedTracks,
    lastPlaylistName: context.lastPlaylistName,
  };

  for (const clause of splitClauses(text)) {
    const labelMap = {
      import: /\bimport\b/i,
      like_all: /\blike all\b/i,
      like: /\b(like|favorite|save)\b/i,
      play: /\bplay\b/i,
      create_playlist: /\bcreate playlist\b/i,
      rename_playlist: /\brename playlist\b/i,
      delete_playlist: /\bdelete playlist\b/i,
      add_to_playlist: /\badd\b.*\bplaylist\b/i,
      remove_from_playlist: /\bremove\b.*\bplaylist\b/i,
      queue: /\bqueue\b/i,
    };
    const action = Object.entries(labelMap).find(([, re]) => re.test(clause))?.[0] ?? "command";
    const before = logs.length;

    try {
      await executeClause(clause, runtimeCtx, state, logs);
      const delta = logs.slice(before).join(" ");
      const failed = /couldn['']t|not found|no\s+.+\s+available|invalid|failed/i.test(delta);
      steps.push({ action, status: failed ? "failed" : "success", detail: delta || `Executed: ${clause}` });
    } catch (err) {
      const detail = err?.response?.data?.error?.message ?? err?.message ?? "Unknown error";
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
      lastResults: runtimeCtx.lastResults ?? [],
      lastQuery: runtimeCtx.lastQuery ?? "",
      lastImportedTracks: runtimeCtx.lastImportedTracks ?? [],
      lastPlaylistName: runtimeCtx.lastPlaylistName ?? "",
    },
  };
};
