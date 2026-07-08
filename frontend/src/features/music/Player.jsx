import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useMusic } from "./MusicContext";
import {
  ChevronDown,
  Expand,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music as MusicIcon,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Timer,
  X,
  ListMusic,
  Mic2,
} from "lucide-react";

// ─── Sleep Timer Options ───────────────────────────────────────────────────
const SLEEP_OPTIONS = [
  { label: "5 min", minutes: 5 },
  { label: "10 min", minutes: 10 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "60 min", minutes: 60 },
  { label: "End of song", minutes: "end" },
];

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

const formatCountdown = (seconds) => {
  if (seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

const Player = () => {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    pause,
    progress,
    seek,
    volume,
    setVolume,
    playNext,
    playPrevious,
    playlist,
    duration,
    shuffleEnabled,
    setShuffleEnabled,
    repeatMode,
    setRepeatMode,
    savedByUrl,
    savingFavoriteId,
    toggleFavorite,
  } = useMusic();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [sleepTimerEnd, setSleepTimerEnd] = useState(null);
  const [sleepMode, setSleepMode] = useState(null); // 'timed' | 'end'
  const [sleepRemaining, setSleepRemaining] = useState(null);
  const [showLyricsTab, setShowLyricsTab] = useState(false);

  const sleepMenuRef = useRef(null);
  const prevTrackIdRef = useRef(null);

  // ─── End-of-song sleep timer ──────────────────────────────────────────────
  useEffect(() => {
    const newId = currentTrack?._id || null;
    if (
      sleepMode === "end" &&
      prevTrackIdRef.current &&
      prevTrackIdRef.current !== newId
    ) {
      pause();
      setSleepMode(null);
      setSleepTimerEnd(null);
      setSleepRemaining(null);
    }
    prevTrackIdRef.current = newId;
  }, [currentTrack?._id, sleepMode, pause]);

  // ─── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!sleepTimerEnd || sleepMode !== "timed") return;
    const tick = setInterval(() => {
      const remaining = Math.max(0, Math.floor((sleepTimerEnd - Date.now()) / 1000));
      setSleepRemaining(remaining);
      if (remaining <= 0) {
        pause();
        setSleepMode(null);
        setSleepTimerEnd(null);
        setSleepRemaining(null);
        clearInterval(tick);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [sleepTimerEnd, sleepMode, pause]);

  // ─── Close sleep menu on outside click ────────────────────────────────────
  useEffect(() => {
    if (!showSleepMenu) return;
    const handler = (e) => {
      if (sleepMenuRef.current && !sleepMenuRef.current.contains(e.target)) {
        setShowSleepMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSleepMenu]);

  const handleSleepSelect = useCallback((option) => {
    setShowSleepMenu(false);
    if (option.minutes === "end") {
      setSleepMode("end");
      setSleepTimerEnd(null);
      setSleepRemaining(null);
    } else {
      const end = Date.now() + option.minutes * 60 * 1000;
      setSleepMode("timed");
      setSleepTimerEnd(end);
      setSleepRemaining(option.minutes * 60);
    }
  }, []);

  const cancelSleep = useCallback(() => {
    setSleepMode(null);
    setSleepTimerEnd(null);
    setSleepRemaining(null);
    setShowSleepMenu(false);
  }, []);

  // ─── Escape / back button ─────────────────────────────────────────────────
  useEffect(() => {
    const onEscape = (e) => {
      if (e.key === "Escape") setIsExpanded(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  useEffect(() => {
    if (!isExpanded) return;
    if (!window.history.state?.modal) {
      window.history.pushState({ modal: "player-expanded" }, "");
    }
    const handleBack = () => setIsExpanded(false);
    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, [isExpanded]);

  // ─── Scroll locking ───────────────────────────────────────────────────────
  useEffect(() => {
    document.body.classList.toggle(
      "has-mini-player",
      !!currentTrack && !isExpanded,
    );

    if (!!currentTrack && isExpanded) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";

      return () => {
        const savedY = document.body.style.top;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        if (savedY) window.scrollTo(0, parseInt(savedY || "0") * -1);
      };
    }
  }, [currentTrack, isExpanded]);

  const coverArt = currentTrack?.thumbnailUrl || currentTrack?.thumbnail;
  const trackTitle = currentTrack?.title || "Unknown Track";
  const trackArtist = currentTrack?.artist?.username || "Unknown Artist";
  const isFavorited = useMemo(() => {
    if (!currentTrack?.youtubeUrl) return false;
    const url = currentTrack.youtubeUrl;
    return !!savedByUrl[url];
  }, [currentTrack, savedByUrl]);

  const progressValue = useMemo(
    () => (Number.isFinite(progress) ? progress : 0),
    [progress],
  );

  const elapsedTime = useMemo(
    () => formatTime((progressValue * duration) / 100),
    [progressValue, duration],
  );

  const totalDuration = useMemo(() => formatTime(duration), [duration]);

  const sleepActive = !!sleepMode;
  const sleepLabel =
    sleepMode === "end"
      ? "End of song"
      : sleepRemaining != null
        ? formatCountdown(sleepRemaining)
        : null;

  if (!currentTrack?.youtubeUrl) return null;

  // ─── Shared sub-components ────────────────────────────────────────────────

  const RepeatIcon = repeatMode === "one" ? Repeat1 : Repeat;
  const VolumeIcon = volume === 0 ? VolumeX : Volume2;

  const SeekBar = ({ className = "" }) => (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 tabular-nums">
        <span>{elapsedTime}</span>
        <span>{totalDuration}</span>
      </div>
      <div className="relative flex items-center py-2 group/seek">
        <input
          type="range"
          min="0"
          max="100"
          value={progressValue}
          onChange={(e) => seek(e.target.value)}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          aria-label="Seek"
        />
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 group-hover/seek:h-2.5 transition-all duration-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-400 to-pink-500 transition-[width] duration-300 ease-out"
            style={{ width: `${progressValue}%` }}
          />
        </div>
      </div>
    </div>
  );

  const VolumeBar = ({ className = "" }) => (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
        className="micro-interact text-neutral-500 hover:text-white"
        aria-label={volume === 0 ? "Unmute" : "Mute"}
      >
        <VolumeIcon className="h-4 w-4" />
      </button>
      <div className="relative flex-1 group/vol">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Volume"
        />
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 group-hover/vol:h-2.5 transition-all duration-200">
          <div
            className="h-full rounded-full bg-white/80 transition-[width] duration-150"
            style={{ width: `${volume * 100}%` }}
          />
        </div>
      </div>
      <span className="w-10 text-right text-xs font-semibold text-neutral-500 tabular-nums">
        {Math.round(volume * 100)}%
      </span>
    </div>
  );

  // ─── Expanded Player ───────────────────────────────────────────────────────
  if (isExpanded) {
    return (
      <div
        className="fixed inset-0 z-[1300]"
        role="dialog"
        aria-modal="true"
        aria-label="Music Player"
      >
        {/* Backdrop */}
        <div
          onClick={() => setIsExpanded(false)}
          className="absolute inset-0 bg-black/50 backdrop-blur-[32px] backdrop-saturate-150"
        />

        {/* Scroll container — prevents top cutoff on short viewports */}
        <div className="absolute inset-0 overflow-y-auto flex items-start justify-center py-3 sm:py-5 px-0 sm:px-4">
          <div
            className="pointer-events-auto relative w-full max-w-5xl my-auto rounded-t-[30px] sm:rounded-[32px] border border-white/10 bg-neutral-950/90 shadow-[0_40px_160px_rgba(0,0,0,0.7)] backdrop-blur-[28px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient gradients */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_10%,rgba(99,102,241,0.18),transparent_36%),radial-gradient(circle_at_85%_12%,rgba(236,72,153,0.12),transparent_30%)]" />

            {/* Top bar */}
            <div className="relative flex items-center justify-between border-b border-white/5 px-5 py-3.5 sm:px-7">
              <button
                onClick={() => setIsExpanded(false)}
                className="micro-interact flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
                aria-label="Minimize player"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-400">
                Now playing
              </p>
              <div className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-300">
                {playlist.length} tracks
              </div>
            </div>

            {/* Main content grid */}
            <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
              {/* Left — Album Art */}
              <div className="relative flex items-center justify-center bg-gradient-to-br from-white/[0.05] via-neutral-950 to-black p-6 sm:p-10 min-h-[280px] sm:min-h-[420px]">
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.22),transparent_46%),radial-gradient(circle_at_bottom,rgba(236,72,153,0.14),transparent_40%)]" />
                {coverArt && (
                  <img
                    src={coverArt}
                    alt=""
                    aria-hidden
                    className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-[0.18] blur-3xl saturate-150"
                  />
                )}
                <div className="relative w-full max-w-[360px] sm:max-w-[420px]">
                  <div className="aspect-square overflow-hidden rounded-[26px] sm:rounded-[30px] border border-white/10 bg-neutral-900 shadow-[0_28px_100px_rgba(0,0,0,0.6)]">
                    {coverArt ? (
                      <img
                        src={coverArt}
                        alt={trackTitle}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <MusicIcon className="h-20 w-20 text-neutral-700" />
                      </div>
                    )}
                  </div>
                  <div className="mt-6 space-y-1 text-center">
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight line-clamp-2">
                      {trackTitle}
                    </h3>
                    <p className="text-sm text-neutral-400">{trackArtist}</p>
                  </div>
                </div>
              </div>

              {/* Right — Controls */}
              <div className="relative flex flex-col gap-5 p-5 sm:p-8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                {/* Seek bar */}
                <SeekBar />

                {/* Main Controls */}
                <div className="flex flex-col gap-5">
                  {/* Playback row */}
                  <div className="flex items-center justify-center gap-4 sm:gap-6">
                    <button
                      onClick={() => setShuffleEnabled((p) => !p)}
                      className={`micro-interact p-2.5 rounded-full border transition-all ${shuffleEnabled ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-400" : "border-white/10 bg-white/[0.04] text-neutral-500 hover:text-white hover:bg-white/[0.08]"}`}
                      aria-label="Shuffle"
                    >
                      <Shuffle className="h-4 w-4" />
                    </button>

                    <button
                      onClick={playPrevious}
                      disabled={playlist.length <= 1}
                      className="micro-interact rounded-full border border-white/10 bg-white/[0.04] p-4 text-neutral-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-25"
                    >
                      <SkipBack className="h-5 w-5 fill-current" />
                    </button>

                    <button
                      onClick={togglePlay}
                      className="group micro-interact relative flex h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20 items-center justify-center rounded-full bg-white text-black shadow-[0_0_56px_rgba(255,255,255,0.2)] hover:shadow-[0_0_72px_rgba(255,255,255,0.28)]"
                    >
                      <div className="absolute inset-0 rounded-full bg-white blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-20" />
                      {isPlaying ? (
                        <Pause className="h-7 w-7 sm:h-8 sm:w-8 fill-current" />
                      ) : (
                        <Play className="ml-1 h-7 w-7 sm:h-8 sm:w-8 fill-current" />
                      )}
                    </button>

                    <button
                      onClick={() => playNext(true)}
                      disabled={playlist.length <= 1}
                      className="micro-interact rounded-full border border-white/10 bg-white/[0.04] p-4 text-neutral-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-25"
                    >
                      <SkipForward className="h-5 w-5 fill-current" />
                    </button>

                    <button
                      onClick={() =>
                        setRepeatMode((m) =>
                          m === "off" ? "all" : m === "all" ? "one" : "off",
                        )
                      }
                      className={`micro-interact p-2.5 rounded-full border transition-all ${repeatMode !== "off" ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-400" : "border-white/10 bg-white/[0.04] text-neutral-500 hover:text-white hover:bg-white/[0.08]"}`}
                      aria-label={`Repeat: ${repeatMode}`}
                    >
                      <RepeatIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Like + Sleep row */}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => currentTrack && toggleFavorite(currentTrack)}
                      disabled={savingFavoriteId === currentTrack?._id}
                      className={`micro-interact flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all ${isFavorited ? "border-pink-500/50 bg-pink-500/15 text-pink-300" : "border-white/10 bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08]"}`}
                      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                    >
                      {savingFavoriteId === currentTrack?._id ? (
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Heart className={`h-3.5 w-3.5 ${isFavorited ? "fill-current" : ""}`} />
                      )}
                      <span>{isFavorited ? "Saved" : "Save"}</span>
                    </button>

                    {/* Sleep Timer */}
                    <div className="relative" ref={sleepMenuRef}>
                      {sleepActive ? (
                        <button
                          onClick={cancelSleep}
                          className="micro-interact flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-300 text-xs font-semibold hover:bg-amber-500/25"
                        >
                          <Timer className="h-3.5 w-3.5" />
                          <span>{sleepLabel}</span>
                          <X className="h-3 w-3" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowSleepMenu((p) => !p)}
                          className="micro-interact flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.04] text-neutral-400 hover:text-white hover:bg-white/[0.08] text-xs font-semibold"
                        >
                          <Timer className="h-3.5 w-3.5" />
                          <span>Sleep</span>
                        </button>
                      )}

                      {showSleepMenu && (
                        <div className="absolute bottom-full mb-2 right-0 z-10 w-44 rounded-2xl border border-white/10 bg-neutral-900/95 shadow-2xl backdrop-blur-xl overflow-hidden">
                          <p className="px-4 pt-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                            Sleep after
                          </p>
                          {SLEEP_OPTIONS.map((opt) => (
                            <button
                              key={opt.label}
                              onClick={() => handleSleepSelect(opt)}
                              className="w-full px-4 py-2.5 text-left text-sm font-medium text-neutral-300 hover:bg-white/5 hover:text-white transition-colors"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Volume */}
                <VolumeBar className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3" />

                {/* Tabs: Lyrics / Queue (future-ready) */}
                <div className="flex gap-1 rounded-2xl border border-white/5 bg-white/[0.03] p-1">
                  <button
                    onClick={() => setShowLyricsTab(false)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${!showLyricsTab ? "bg-white/10 text-white" : "text-neutral-500 hover:text-neutral-300"}`}
                  >
                    <ListMusic className="h-3.5 w-3.5" />
                    Queue ({playlist.length})
                  </button>
                  <button
                    onClick={() => setShowLyricsTab(true)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${showLyricsTab ? "bg-white/10 text-white" : "text-neutral-500 hover:text-neutral-300"}`}
                  >
                    <Mic2 className="h-3.5 w-3.5" />
                    Lyrics
                  </button>
                </div>

                {/* Queue / Lyrics panel */}
                <div className="flex-1 rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                  {showLyricsTab ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                      <Mic2 className="h-7 w-7 text-neutral-700" />
                      <p className="text-xs font-semibold text-neutral-600 uppercase tracking-widest">
                        Lyrics coming soon
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-y-auto max-h-44">
                      {playlist.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 gap-2">
                          <ListMusic className="h-7 w-7 text-neutral-700" />
                          <p className="text-xs text-neutral-600">Queue empty</p>
                        </div>
                      ) : (
                        playlist.map((track, i) => {
                          const isActive = track._id === currentTrack?._id;
                          return (
                            <div
                              key={track._id || i}
                              className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${isActive ? "bg-white/10" : "hover:bg-white/5"}`}
                            >
                              <div className="h-8 w-8 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800">
                                {track.thumbnail ? (
                                  <img src={track.thumbnail} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <MusicIcon className="h-4 w-4 text-neutral-600 m-auto mt-2" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-semibold truncate ${isActive ? "text-white" : "text-neutral-300"}`}>
                                  {track.title}
                                </p>
                              </div>
                              {isActive && (
                                <div className="flex gap-0.5">
                                  {[0, 1, 2].map((bar) => (
                                    <div
                                      key={bar}
                                      className="w-0.5 rounded-full bg-indigo-400 animate-bounce"
                                      style={{ height: `${8 + bar * 3}px`, animationDelay: `${bar * 0.15}s` }}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Mini Player ───────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-3 left-1/2 z-[1100] w-[calc(100%-1rem)] max-w-[960px] -translate-x-1/2 sm:bottom-4 sm:w-[calc(100%-2rem)]">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/85 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-[28px]">
        {/* Progress bar */}
        <div className="relative h-1 w-full bg-white/[0.08] cursor-pointer group/bar"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seek(((e.clientX - rect.left) / rect.width) * 100);
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-violet-400 to-pink-500 transition-[width] duration-300 ease-out group-hover/bar:h-1.5 transition-all"
            style={{ width: `${progressValue}%` }}
          />
        </div>

        <div className="relative flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3.5">
          {/* Gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_26%,transparent_76%,rgba(255,255,255,0.02))]" />

          {/* Album art */}
          <button
            onClick={() => setIsExpanded(true)}
            className="micro-interact h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
            aria-label="Open player"
          >
            {coverArt ? (
              <img src={coverArt} alt={trackTitle} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <MusicIcon className="h-6 w-6 text-neutral-600" />
              </div>
            )}
          </button>

          {/* Track info */}
          <button
            onClick={() => setIsExpanded(true)}
            className="relative min-w-0 flex-1 text-left"
          >
            <p className="truncate text-sm font-semibold text-white leading-tight">
              {trackTitle}
            </p>
            <p className="truncate text-xs text-neutral-500 mt-0.5">
              {trackArtist}
              {sleepActive && (
                <span className="ml-2 text-amber-400 font-semibold">
                  · Sleep {sleepLabel}
                </span>
              )}
            </p>
          </button>

          {/* Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Like — hidden on xs */}
            <button
              onClick={() => currentTrack && toggleFavorite(currentTrack)}
              disabled={savingFavoriteId === currentTrack?._id}
              className={`micro-interact hidden sm:flex h-9 w-9 items-center justify-center rounded-full border disabled:opacity-50 ${isFavorited ? "border-pink-500/40 bg-pink-500/15 text-pink-300" : "border-white/10 bg-white/5 text-neutral-500 hover:text-white hover:bg-white/10"}`}
              aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              {savingFavoriteId === currentTrack?._id ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
              )}
            </button>

            {/* Shuffle — hidden on xs/sm */}
            <button
              onClick={() => setShuffleEnabled((p) => !p)}
              className={`micro-interact hidden md:flex h-9 w-9 items-center justify-center rounded-full border ${shuffleEnabled ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-400" : "border-white/10 bg-white/5 text-neutral-500 hover:text-white hover:bg-white/10"}`}
              aria-label="Shuffle"
            >
              <Shuffle className="h-3.5 w-3.5" />
            </button>

            {/* Previous */}
            <button
              onClick={playPrevious}
              disabled={playlist.length <= 1}
              className="micro-interact flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-500 hover:text-white hover:bg-white/10 disabled:opacity-25"
              aria-label="Previous"
            >
              <SkipBack className="h-4 w-4 fill-current" />
            </button>

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="micro-interact flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-[0_0_28px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.28)]"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={() => playNext(true)}
              disabled={playlist.length <= 1}
              className="micro-interact flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-500 hover:text-white hover:bg-white/10 disabled:opacity-25"
              aria-label="Next"
            >
              <SkipForward className="h-4 w-4 fill-current" />
            </button>

            {/* Repeat — hidden on xs/sm */}
            <button
              onClick={() =>
                setRepeatMode((m) =>
                  m === "off" ? "all" : m === "all" ? "one" : "off",
                )
              }
              className={`micro-interact hidden md:flex h-9 w-9 items-center justify-center rounded-full border ${repeatMode !== "off" ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-400" : "border-white/10 bg-white/5 text-neutral-500 hover:text-white hover:bg-white/10"}`}
              aria-label={`Repeat: ${repeatMode}`}
            >
              <RepeatIcon className="h-3.5 w-3.5" />
            </button>

            {/* Volume — hidden on xs/sm/md, visible on lg+ */}
            <div className="hidden lg:flex items-center gap-2 w-36 ml-1">
              <VolumeIcon className="h-4 w-4 text-neutral-500 flex-shrink-0" />
              <div className="relative flex-1 group/vol">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Volume"
                />
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 group-hover/vol:h-2.5 transition-all duration-200">
                  <div
                    className="h-full rounded-full bg-white/70 transition-[width] duration-150"
                    style={{ width: `${volume * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Expand */}
            <button
              onClick={() => setIsExpanded(true)}
              className="micro-interact flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-500 hover:text-white hover:bg-white/10"
              aria-label="Open expanded player"
            >
              <Expand className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;
