/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import YouTube from "react-youtube";
import { normalizeYoutubeUrl } from "../../utils/youtube";
import api from "../../services/api";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../../components/ui/Toast";
import {
  startMusicService,
  updateMusicMetadata,
  updatePlaybackState,
  stopMusicService,
  onMusicServiceAction,
} from "../../services/capacitor-music-service";

const MusicContext = createContext(null);

const extractVideoId = (url) => {
  if (!url) return null;
  const match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
  return match ? match[1] : null;
};

export const MusicProvider = ({ children }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState("all");
  const [playbackRules, setPlaybackRulesState] = useState({
    maxDurationMinutes: null,
    slowOnly: false,
    noRemixes: false,
    language: null,
  });
  const [volume, setVolume] = useState(() =>
    parseFloat(localStorage.getItem("playerVolume") || "0.7"),
  );
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // ─── Favorites State ──────────────────────────────────────────────────────
  const [savedByUrl, setSavedByUrl] = useState({});
  const [savingFavoriteId, setSavingFavoriteId] = useState(null);

  const playerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  // Mirrors isPlaying so async callbacks (player events, media session)
  // can read the latest intent without re-subscribing.
  const isPlayingRef = useRef(false);
  // Counts forced background resumes so we stop fighting OS-initiated pauses
  // (phone calls, audio-focus loss) after a couple of attempts.
  const resumeAttemptsRef = useRef({ count: 0, lastAt: 0 });
  const currentTrack = playlist[currentIndex] || null;
  const videoId = extractVideoId(currentTrack?.youtubeUrl);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    playerRef.current = null;
  }, [videoId]);

  const setPlaybackRules = useCallback((patch = {}) => {
    setPlaybackRulesState((prev) => ({ ...prev, ...patch }));
  }, []);

  const isAllowedByRules = useCallback(
    (track) => {
      if (!track) return false;
      const title = (track.title || "").toLowerCase();

      if (playbackRules.noRemixes && /\bremix\b/.test(title)) return false;

      if (
        playbackRules.slowOnly &&
        /\b(remix|edm|hard|trap|phonk)\b/.test(title)
      )
        return false;

      if (
        playbackRules.maxDurationMinutes &&
        Number.isFinite(track.durationSeconds) &&
        track.durationSeconds > playbackRules.maxDurationMinutes * 60
      )
        return false;

      return true;
    },
    [playbackRules],
  );

  // ─── Favorites API ────────────────────────────────────────────────────────
  const hydrateFavorites = useCallback(async () => {
    if (!localStorage.getItem("token")) {
      setSavedByUrl({});
      return;
    }
    try {
      const res = await api.get("/music/mine");
      const map = (res.data?.musics || []).reduce((acc, item) => {
        if (item.youtubeUrl) {
          const url = normalizeYoutubeUrl(item.youtubeUrl);
          if (url)
            acc[url] = { ...item, youtubeUrl: url, _id: item._id || item.id };
        }
        return acc;
      }, {});
      setSavedByUrl(map);
    } catch {
      // Silent fail for guests / auth issues
    }
  }, []);

  // Re-hydrate on login, clear on logout (user changes identity)
  useEffect(() => {
    hydrateFavorites();
  }, [hydrateFavorites, user?._id, user?.id]);

  const toggleFavorite = useCallback(
    async (track) => {
      if (!track?.youtubeUrl) return;
      // Guests: don't fire an authed request (the 401 interceptor would
      // hard-redirect to /login mid-playback). Tell them instead.
      if (!user && !localStorage.getItem("token")) {
        addToast("Log in to save favorites.", "info");
        return;
      }
      setSavingFavoriteId(track._id);
      try {
        const url = normalizeYoutubeUrl(track.youtubeUrl);
        if (!url) {
          setSavingFavoriteId(null);
          return;
        }
        const existing = savedByUrl[url];
        if (existing?._id) {
          await api.delete(`/music/${existing._id}`);
          setSavedByUrl((prev) => {
            const next = { ...prev };
            delete next[url];
            return next;
          });
        } else {
          const res = await api.post("/music", {
            title: track.title,
            youtubeUrl: url,
            thumbnailUrl: track.thumbnail || track.thumbnailUrl,
          });
          const saved = res.data?.music;
          if (saved?.youtubeUrl) {
            const savedUrl = normalizeYoutubeUrl(saved.youtubeUrl);
            if (savedUrl) {
              setSavedByUrl((prev) => ({
                ...prev,
                [savedUrl]: {
                  ...saved,
                  youtubeUrl: savedUrl,
                  _id: saved._id || saved.id,
                },
              }));
            }
          }
        }
      } catch {
        addToast("Could not update favorites. Try again.", "error");
      } finally {
        setSavingFavoriteId(null);
      }
    },
    [savedByUrl, user, addToast],
  );

  const isTrackFavorited = useCallback(
    (track) => {
      if (!track?.youtubeUrl) return false;
      const url = normalizeYoutubeUrl(track.youtubeUrl);
      return url ? !!savedByUrl[url] : false;
    },
    [savedByUrl],
  );

  // ─── Play Count Tracking ──────────────────────────────────────────────────
  const incrementPlayCount = useCallback((track) => {
    if (!track?.youtubeUrl) return;
    try {
      const counts = JSON.parse(
        localStorage.getItem("music_play_counts") || "{}",
      );
      counts[track.youtubeUrl] = (counts[track.youtubeUrl] || 0) + 1;
      localStorage.setItem("music_play_counts", JSON.stringify(counts));
    } catch {
      // silent
    }
  }, []);

  const getPlayCount = useCallback((youtubeUrl) => {
    if (!youtubeUrl) return 0;
    try {
      const counts = JSON.parse(
        localStorage.getItem("music_play_counts") || "{}",
      );
      return counts[youtubeUrl] || 0;
    } catch {
      return 0;
    }
  }, []);

  // ─── Player Core ─────────────────────────────────────────────────────────
  const getCurrentTime = useCallback(async () => {
    const player = playerRef.current;
    if (!player) return 0;
    try {
      return await player.getCurrentTime();
    } catch {
      return 0;
    }
  }, []);

  const setCurrentTime = useCallback((seconds) => {
    const player = playerRef.current;
    if (!player || !Number.isFinite(seconds)) return;
    try {
      player.seekTo(seconds, true);
    } catch {
      // Seek failed silently
    }
  }, []);

  const startProgressPolling = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(async () => {
      if (!playerRef.current) return;
      try {
        const currentTime = await playerRef.current.getCurrentTime();
        if (duration > 0) {
          setProgress((currentTime / duration) * 100);
        }
      } catch {
        // Ignore errors
      }
    }, 1000);
  }, [duration]);

  const stopProgressPolling = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      if (playerRef.current) {
        try {
          playerRef.current.playVideo?.();
        } catch (e) {
          if (import.meta.env.DEV) console.warn("Failed to play video:", e);
        }
        startProgressPolling();
      }
    } else {
      if (playerRef.current) {
        try {
          playerRef.current.pauseVideo?.();
        } catch (e) {
          if (import.meta.env.DEV) console.warn("Failed to pause video:", e);
        }
      }
      stopProgressPolling();
    }
  }, [isPlaying, startProgressPolling, stopProgressPolling]);

  useEffect(() => {
    if (playerRef.current) {
      try {
        playerRef.current.setVolume?.(volume * 100);
      } catch (e) {
        if (import.meta.env.DEV) console.warn("Failed to set volume:", e);
      }
    }
  }, [volume]);

  useEffect(() => {
    return () => stopProgressPolling();
  }, [stopProgressPolling]);

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    setIsPlaying((p) => !p);
  }, [currentTrack]);

  const pause = useCallback(() => {
    if (!currentTrack) return;
    setIsPlaying(false);
  }, [currentTrack]);

  const resume = useCallback(() => {
    if (!currentTrack) return;
    setIsPlaying(true);
  }, [currentTrack]);

  const playTrack = useCallback(
    (track, newPlaylist) => {
      if (!track?._id) return;

      const normalizedUrl = normalizeYoutubeUrl(track.youtubeUrl);
      if (!normalizedUrl) return;

      if (track.youtubeUrl !== normalizedUrl) {
        track.youtubeUrl = normalizedUrl;
      }

      const targetPlaylist = newPlaylist || playlist;
      if (newPlaylist) setPlaylist(newPlaylist);

      const idx = targetPlaylist.findIndex((t) => t._id === track._id);
      if (idx === -1) return;

      if (currentIndex === idx && !newPlaylist) {
        togglePlay();
        return;
      }

      setCurrentIndex(idx);
      setProgress(0);
      setDuration(0);
      setIsPlaying(true);
      localStorage.setItem("playerVolume", String(volume));
      incrementPlayCount(track);
    },
    [currentIndex, playlist, togglePlay, volume, incrementPlayCount],
  );

  const playNext = useCallback(
    (forceAdvance = false) => {
      if (!playlist.length) return;

      if (repeatMode === "one" && !forceAdvance) {
        setIsPlaying(true);
        return;
      }

      const filteredIndexes = playlist
        .map((track, idx) => ({ track, idx }))
        .filter(({ track }) => isAllowedByRules(track))
        .map(({ idx }) => idx);

      if (!filteredIndexes.length) {
        setIsPlaying(false);
        return;
      }

      let next = currentIndex;

      if (shuffleEnabled && filteredIndexes.length > 1) {
        const candidates = filteredIndexes.filter(
          (idx) => idx !== currentIndex,
        );
        next =
          candidates[Math.floor(Math.random() * candidates.length)] ??
          currentIndex;
      } else {
        const currentPos = filteredIndexes.indexOf(currentIndex);
        const hasNext =
          currentPos >= 0 && currentPos < filteredIndexes.length - 1;

        if (hasNext) {
          next = filteredIndexes[currentPos + 1];
        } else if (repeatMode === "all") {
          next = filteredIndexes[0];
        } else {
          setIsPlaying(false);
          return;
        }
      }

      setCurrentIndex(next);
      setProgress(0);
      setDuration(0);
      setIsPlaying(true);
      if (playlist[next]) incrementPlayCount(playlist[next]);
    },
    [
      currentIndex,
      isAllowedByRules,
      playlist,
      repeatMode,
      shuffleEnabled,
      incrementPlayCount,
    ],
  );

  const playPrevious = useCallback(async () => {
    if (!playlist.length) return;
    const currentTime = await getCurrentTime();
    if (currentTime > 3) {
      setCurrentTime(0);
      return;
    }
    const prev = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prev);
    setProgress(0);
    setDuration(0);
    setIsPlaying(true);
    if (playlist[prev]) incrementPlayCount(playlist[prev]);
  }, [
    currentIndex,
    getCurrentTime,
    playlist,
    setCurrentTime,
    incrementPlayCount,
  ]);

  const seek = useCallback(
    (value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || duration <= 0) return;
      const nextTime = (numeric / 100) * duration;
      setCurrentTime(nextTime);
      setProgress(numeric);
    },
    [duration, setCurrentTime],
  );

  const handleVolumeChange = useCallback((v) => {
    setVolume(v);
    localStorage.setItem("playerVolume", String(v));
  }, []);

  const clearQueue = useCallback(() => {
    setPlaylist([]);
    setCurrentIndex(-1);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    stopMusicService();
  }, []);

  const addToQueue = useCallback(
    (track, options = {}) => {
      if (!track?._id && !track?.youtubeUrl) return;

      setPlaylist((prev) => {
        const exists = prev.find(
          (item) => item.youtubeUrl === track.youtubeUrl,
        );
        if (exists) return prev;

        const { next = false } = options;
        if (next && currentIndex >= 0) {
          const nextList = [...prev];
          nextList.splice(currentIndex + 1, 0, track);
          return nextList;
        }

        return [...prev, track];
      });
    },
    [currentIndex],
  );

  const onPlayerReady = useCallback(
    async (event) => {
      playerRef.current = event.target;
      playerRef.current.setVolume(volume * 100);
      if (isPlaying) {
        playerRef.current.playVideo();
        startProgressPolling();
      }
      try {
        const d = await event.target.getDuration();
        setDuration(d);
      } catch {
        // Could not get duration
      }
    },
    [volume, isPlaying, startProgressPolling],
  );

  const onPlayerStateChange = useCallback(
    async (event) => {
      if (event.data === 1) {
        setIsPlaying(true);
        startProgressPolling();
        try {
          const d = await event.target.getDuration();
          if (d > 0 && d !== duration) setDuration(d);
        } catch {
          // Duration fetch can fail
        }
      } else if (event.data === 2) {
        // Background keep-alive: when the screen locks or the app is
        // backgrounded, the browser/WebView pauses the YouTube iframe even
        // though the user never pressed pause. If we still intend to play
        // and the page is hidden, resume instead of accepting the pause.
        //
        // But OS-initiated pauses (phone call, audio-focus loss) look the
        // same and REPEAT: the OS re-pauses right after every forced resume.
        // Cap attempts — if a pause recurs shortly after a forced resume
        // more than twice, accept it so we don't un-pause over a call.
        if (isPlayingRef.current && document.visibilityState === "hidden") {
          const now = Date.now();
          const attempts = resumeAttemptsRef.current;
          if (now - attempts.lastAt > 15000) attempts.count = 0; // fresh pause episode
          if (attempts.count < 2) {
            attempts.count += 1;
            attempts.lastAt = now;
            try {
              event.target.playVideo();
              return;
            } catch {
              // Resume failed — fall through to normal pause handling
            }
          }
        }
        setIsPlaying(false);
        stopProgressPolling();
      } else if (event.data === 0) {
        playNext();
      }
    },
    [duration, startProgressPolling, stopProgressPolling, playNext],
  );

  // ─── Background Playback (Media Session API) ─────────────────────────────
  // Lock-screen / notification controls + tells the OS this page is playing
  // media so it keeps the audio alive in the background.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: currentTrack.title || "Unknown Track",
      artist: currentTrack.artist?.username || "MusicDiscover",
      artwork: (currentTrack.thumbnail || currentTrack.thumbnailUrl)
        ? [
            {
              src: currentTrack.thumbnail || currentTrack.thumbnailUrl,
              sizes: "320x180",
              type: "image/jpeg",
            },
          ]
        : [],
    });
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const handlers = [
      ["play", () => setIsPlaying(true)],
      ["pause", () => setIsPlaying(false)],
      ["previoustrack", () => playPrevious()],
      ["nexttrack", () => playNext(true)],
      [
        "seekto",
        (details) => {
          if (Number.isFinite(details.seekTime)) setCurrentTime(details.seekTime);
        },
      ],
    ];

    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Action not supported on this platform
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // ignore
        }
      }
    };
  }, [playNext, playPrevious, setCurrentTime]);

  // When the page becomes hidden mid-playback, nudge the player to keep
  // going (some WebViews pause the iframe on visibilitychange). Respects
  // the same attempt cap as the keep-alive above so we don't force-resume
  // during a phone call / audio-focus loss.
  useEffect(() => {
    const onVisibility = () => {
      if (
        document.visibilityState === "hidden" &&
        isPlayingRef.current &&
        playerRef.current
      ) {
        const attempts = resumeAttemptsRef.current;
        if (Date.now() - attempts.lastAt <= 15000 && attempts.count >= 2) return;
        try {
          playerRef.current.playVideo?.();
        } catch {
          // ignore
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // ─── Foreground Service Integration (Android) ─────────────────────────────
  // Start / update the native foreground service & notification so Android
  // keeps the app alive in the background with media controls.

  // When a new track starts playing, start (or update) the foreground service
  useEffect(() => {
    if (!currentTrack) return;
    if (!isPlaying) return;

    const title = currentTrack.title || "Unknown Track";
    const artist = currentTrack.artist?.username || "MusicDiscover";
    const thumbnail = currentTrack.thumbnail || currentTrack.thumbnailUrl || "";

    startMusicService({ title, artist, thumbnail, isPlaying: true });
  }, [currentTrack?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // When play/pause state changes, update the notification icon
  useEffect(() => {
    if (!currentTrack) return;
    updatePlaybackState(isPlaying);
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // When the track metadata changes (e.g. next/prev), update the notification
  useEffect(() => {
    if (!currentTrack) return;
    if (!isPlaying) return;

    const title = currentTrack.title || "Unknown Track";
    const artist = currentTrack.artist?.username || "MusicDiscover";
    const thumbnail = currentTrack.thumbnail || currentTrack.thumbnailUrl || "";

    updateMusicMetadata({ title, artist, thumbnail });
  }, [currentTrack?.title, currentTrack?.youtubeUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for notification button actions from the native side
  useEffect(() => {
    const unsubscribe = onMusicServiceAction((action) => {
      switch (action) {
        case "play":
          setIsPlaying(true);
          break;
        case "pause":
          setIsPlaying(false);
          break;
        case "next":
          playNext(true);
          break;
        case "previous":
          playPrevious();
          break;
        case "stop":
          setPlaylist([]);
          setCurrentIndex(-1);
          setIsPlaying(false);
          setProgress(0);
          setDuration(0);
          stopMusicService();
          break;
      }
    });
    return unsubscribe;
  }, [playNext, playPrevious]);

  return (
    <MusicContext.Provider
      value={{
        currentTrack,
        isPlaying,
        playTrack,
        togglePlay,
        pause,
        resume,
        volume,
        setVolume: handleVolumeChange,
        progress,
        seek,
        duration,
        playlist,
        currentIndex,
        playNext,
        playPrevious,
        clearQueue,
        addToQueue,
        repeatMode,
        setRepeatMode,
        shuffleEnabled,
        setShuffleEnabled,
        playbackRules,
        setPlaybackRules,
        // Favorites
        savedByUrl,
        savingFavoriteId,
        toggleFavorite,
        isTrackFavorited,
        refreshFavorites: hydrateFavorites,
        // Play counts
        getPlayCount,
      }}
    >
      {children}

      {videoId && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: 200,
            height: 200,
            opacity: 0.01,
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <YouTube
            videoId={videoId}
            opts={{
              height: "200",
              width: "200",
              playerVars: {
                autoplay: isPlaying ? 1 : 0,
                modestbranding: 1,
                rel: 0,
                origin: window.location.origin,
                enablejsapi: 1,
                playsinline: 1,
                controls: 0,
              },
            }}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            onError={() => {
              playNext();
            }}
          />
        </div>
      )}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used inside MusicProvider");
  return ctx;
};
