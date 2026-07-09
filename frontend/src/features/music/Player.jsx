import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  memo,
} from "react";
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

// ─── Constants ────────────────────────────────────────────────────────────────
const SLEEP_OPTIONS = [
  { label: "5 min", minutes: 5 },
  { label: "10 min", minutes: 10 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "60 min", minutes: 60 },
  { label: "End of song", minutes: "end" },
];

const SWIPE_DOWN_THRESHOLD = 110;
const SWIPE_H_THRESHOLD = 70;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

// ─── BottomSheet (mobile only) ────────────────────────────────────────────────
const BottomSheet = memo(({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1400] lg:hidden" aria-modal="true" role="dialog">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="absolute bottom-0 left-0 right-0 flex max-h-[78vh] flex-col overflow-hidden rounded-t-[28px] border-t border-white/10 bg-neutral-900/98 backdrop-blur-2xl animate-slide-up"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 1.25rem)" }}
      >
        {/* Handle */}
        <div className="flex flex-shrink-0 justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-white/25" />
        </div>
        {title && (
          <div className="flex flex-shrink-0 items-center justify-between border-b border-white/5 px-5 pb-3">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-neutral-500">
              {title}
            </p>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-neutral-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
});

// ─── QueueList ───────────────────────────────────────────────────────────────
const QueueList = memo(({ playlist, currentTrack }) =>
  playlist.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-14 gap-3">
      <ListMusic className="h-8 w-8 text-neutral-700" />
      <p className="text-sm text-neutral-600">Queue is empty</p>
    </div>
  ) : (
    <div>
      {playlist.map((track, i) => {
        const active = track._id === currentTrack?._id;
        return (
          <div
            key={track._id || i}
            className={`flex items-center gap-3 px-5 py-3 transition-colors ${active ? "bg-white/10" : "hover:bg-white/5"}`}
          >
            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-800">
              {track.thumbnail ? (
                <img src={track.thumbnail} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <MusicIcon className="h-4 w-4 text-neutral-600" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-semibold ${active ? "text-white" : "text-neutral-300"}`}>
                {track.title}
              </p>
              <p className="truncate text-xs text-neutral-500">
                {track.artist?.username || "Unknown"}
              </p>
            </div>
            {active && (
              <div className="flex items-end gap-0.5" style={{ height: 16 }}>
                {[4, 7, 5].map((h, b) => (
                  <div
                    key={b}
                    className="w-0.5 animate-bounce rounded-full bg-indigo-400"
                    style={{ height: h + 4, animationDelay: `${b * 0.15}s`, animationDuration: "0.8s" }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  )
);

// ─── SleepOptions ─────────────────────────────────────────────────────────────
const SleepOptions = memo(({ sleepActive, sleepLabel, onSelect, onCancel }) => (
  <div>
    {SLEEP_OPTIONS.map((opt) => (
      <button
        key={opt.label}
        onClick={() => onSelect(opt)}
        className="flex w-full items-center justify-between px-5 py-4 text-base font-medium text-neutral-200 transition-colors active:bg-white/10 hover:bg-white/5"
      >
        {opt.label}
      </button>
    ))}
    {sleepActive && (
      <div className="border-t border-white/5">
        <button
          onClick={onCancel}
          className="flex w-full items-center gap-3 px-5 py-4 text-base font-semibold text-red-400 transition-colors active:bg-red-500/10 hover:bg-white/5"
        >
          <X className="h-4 w-4" />
          Cancel timer ({sleepLabel})
        </button>
      </div>
    )}
  </div>
));

// ─── SeekBar ─────────────────────────────────────────────────────────────────
const SeekBar = memo(({ progress, onSeek, elapsed, total }) => (
  <div className="space-y-1.5">
    <div className="relative flex items-center py-2.5 cursor-pointer group/seek">
      <input
        type="range"
        min="0"
        max="100"
        value={progress}
        onChange={(e) => onSeek(e.target.value)}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        aria-label="Seek"
      />
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 transition-all duration-200 group-hover/seek:h-2.5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-400 to-pink-500 transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
    <div className="flex items-center justify-between text-xs font-semibold tabular-nums text-neutral-500">
      <span>{elapsed}</span>
      <span>{total}</span>
    </div>
  </div>
));

// ─── Player ───────────────────────────────────────────────────────────────────
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

  // ─── UI state ──────────────────────────────────────────────────────────────
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLyricsTab, setShowLyricsTab] = useState(false);
  const [showQueueSheet, setShowQueueSheet] = useState(false);
  const [showSleepSheet, setShowSleepSheet] = useState(false);
  const [showSleepMenu, setShowSleepMenu] = useState(false); // desktop dropdown

  // ─── Sleep timer ───────────────────────────────────────────────────────────
  const [sleepTimerEnd, setSleepTimerEnd] = useState(null);
  const [sleepMode, setSleepMode] = useState(null); // 'timed' | 'end'
  const [sleepRemaining, setSleepRemaining] = useState(null);

  // ─── Drag-to-dismiss ───────────────────────────────────────────────────────
  const [dragY, setDragY] = useState(0);
  const dragActiveRef = useRef(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const miniTouchRef = useRef({ y: 0 });

  // ─── Other refs ────────────────────────────────────────────────────────────
  const prevTrackIdRef = useRef(null);
  const sleepMenuRef = useRef(null);

  // ─── Derived values ─────────────────────────────────────────────────────────
  const progressValue = useMemo(
    () => (Number.isFinite(progress) ? progress : 0),
    [progress],
  );

  const elapsedTime = useMemo(
    () => fmt((progressValue * duration) / 100),
    [progressValue, duration],
  );

  const totalDuration = useMemo(() => fmt(duration), [duration]);

  // ── End-of-song sleep ──────────────────────────────────────────────────────
  useEffect(() => {
    const id = currentTrack?._id || null;
    if (sleepMode === "end" && prevTrackIdRef.current && prevTrackIdRef.current !== id) {
      pause();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSleepMode(null);
      setSleepTimerEnd(null);
      setSleepRemaining(null);
    }
    prevTrackIdRef.current = id;
  }, [currentTrack?._id, sleepMode, pause]);

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sleepTimerEnd || sleepMode !== "timed") return;
    const tick = setInterval(() => {
      const rem = Math.max(0, Math.floor((sleepTimerEnd - Date.now()) / 1000));
      setSleepRemaining(rem);
      if (rem <= 0) {
        pause();
        setSleepMode(null);
        setSleepTimerEnd(null);
        setSleepRemaining(null);
        clearInterval(tick);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [sleepTimerEnd, sleepMode, pause]);

  // ── Desktop sleep menu outside-click close ─────────────────────────────────
  useEffect(() => {
    if (!showSleepMenu) return;
    const h = (e) => {
      if (sleepMenuRef.current && !sleepMenuRef.current.contains(e.target)) {
        setShowSleepMenu(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showSleepMenu]);

  const handleSleepSelect = useCallback((opt) => {
    setShowSleepMenu(false);
    setShowSleepSheet(false);
    if (opt.minutes === "end") {
      setSleepMode("end");
      setSleepTimerEnd(null);
      setSleepRemaining(null);
    } else {
      setSleepMode("timed");
      setSleepTimerEnd(Date.now() + opt.minutes * 60 * 1000);
      setSleepRemaining(opt.minutes * 60);
    }
  }, []);

  const cancelSleep = useCallback(() => {
    setSleepMode(null);
    setSleepTimerEnd(null);
    setSleepRemaining(null);
    setShowSleepMenu(false);
    setShowSleepSheet(false);
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      // Never fire when user is typing in an input/textarea
      const tag = document.activeElement?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable;

      if (e.key === "Escape") { setIsExpanded(false); return; }
      if (isTyping) return;

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seek(Math.min(100, progressValue + (5 / (duration || 1)) * 100));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seek(Math.max(0, progressValue - (5 / (duration || 1)) * 100));
      } else if (e.key === "m" || e.key === "M") {
        setVolume(volume === 0 ? 0.7 : 0);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [togglePlay, seek, progressValue, duration, volume, setVolume]);

  useEffect(() => {
    if (!isExpanded) return;
    if (!window.history.state?.modal) {
      window.history.pushState({ modal: "player-expanded" }, "");
    }
    const h = () => setIsExpanded(false);
    window.addEventListener("popstate", h);
    return () => window.removeEventListener("popstate", h);
  }, [isExpanded]);

  // ── Scroll lock ────────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.classList.toggle("has-mini-player", !!currentTrack && !isExpanded);
    document.body.classList.toggle("has-expanded-player", !!currentTrack && isExpanded);
    if (currentTrack && isExpanded) {
      const y = window.scrollY;
      Object.assign(document.body.style, {
        position: "fixed",
        top: `-${y}px`,
        left: "0",
        right: "0",
        width: "100%",
        overflow: "hidden",
      });
      return () => {
        const saved = document.body.style.top;
        Object.assign(document.body.style, {
          position: "",
          top: "",
          left: "",
          right: "",
          width: "",
          overflow: "",
        });
        if (saved) window.scrollTo(0, parseInt(saved) * -1);
      };
    }
  }, [currentTrack, isExpanded]);

  // ── Touch gestures — expanded player ───────────────────────────────────────
  const onExpandedTouchStart = useCallback((e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    dragActiveRef.current = false;
  }, []);

  const onExpandedTouchMove = useCallback((e) => {
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    const dx = Math.abs(e.touches[0].clientX - touchStartRef.current.x);
    if (dy > 8 && dx < dy * 0.75) {
      dragActiveRef.current = true;
      setDragY(Math.min(dy, 260));
    }
  }, []);

  const onExpandedTouchEnd = useCallback((e) => {
    const ex = e.changedTouches[0].clientX;
    const ey = e.changedTouches[0].clientY;
    const dy = ey - touchStartRef.current.y;
    const dx = ex - touchStartRef.current.x;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (dragActiveRef.current) {
      if (dy > SWIPE_DOWN_THRESHOLD) setIsExpanded(false);
    } else if (adx > SWIPE_H_THRESHOLD && adx > ady * 1.4) {
      if (dx < -SWIPE_H_THRESHOLD) playNext(true);
      else playPrevious();
    }

    setDragY(0);
    dragActiveRef.current = false;
  }, [playNext, playPrevious]);

  // ── Touch gestures — mini player (swipe-up to expand) ─────────────────────
  const onMiniTouchStart = useCallback((e) => {
    miniTouchRef.current = { y: e.touches[0].clientY };
  }, []);

  const onMiniTouchEnd = useCallback((e) => {
    const dy = miniTouchRef.current.y - e.changedTouches[0].clientY;
    if (dy > 40) setIsExpanded(true);
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const coverArt = currentTrack?.thumbnailUrl || currentTrack?.thumbnail;
  const trackTitle = currentTrack?.title || "Unknown Track";
  const trackArtist = currentTrack?.artist?.username || "Unknown Artist";

  const isFavorited = useMemo(() => {
    if (!currentTrack?.youtubeUrl) return false;
    return !!savedByUrl[currentTrack.youtubeUrl];
  }, [currentTrack, savedByUrl]);


  const sleepActive = !!sleepMode;
  const sleepLabel =
    sleepMode === "end"
      ? "End of song"
      : sleepRemaining != null
        ? fmt(sleepRemaining)
        : null;

  if (!currentTrack?.youtubeUrl) return null;

  const RepeatIcon = repeatMode === "one" ? Repeat1 : Repeat;
  const VolumeIcon = volume === 0 ? VolumeX : Volume2;

  // QueueList and SleepOptions are defined at file scope (memo components)

  // ────────────────────────────────────────────────────────────────────────────
  // EXPANDED PLAYER
  // ────────────────────────────────────────────────────────────────────────────
  if (isExpanded) {
    return (
      <>
        {/* Mobile-only bottom sheets */}
        <BottomSheet
          isOpen={showQueueSheet}
          onClose={() => setShowQueueSheet(false)}
          title={`Queue · ${playlist.length} tracks`}
        >
          <QueueList playlist={playlist} currentTrack={currentTrack} />
        </BottomSheet>
        <BottomSheet
          isOpen={showSleepSheet}
          onClose={() => setShowSleepSheet(false)}
          title="Sleep timer"
        >
          <SleepOptions sleepActive={sleepActive} sleepLabel={sleepLabel} onSelect={handleSleepSelect} onCancel={cancelSleep} />
        </BottomSheet>

        <div className="fixed inset-0 z-[1300]" role="dialog" aria-modal="true" aria-label="Music Player">

          {/* ── Desktop: backdrop + centered modal ─── */}
          <div
            className="absolute inset-0 hidden bg-black/50 backdrop-blur-[32px] lg:block"
            onClick={() => setIsExpanded(false)}
          />
          <div className="absolute inset-0 hidden overflow-y-auto lg:flex items-start justify-center py-5 px-4">
            <div
              className="pointer-events-auto relative my-auto w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-neutral-950/92 shadow-[0_40px_160px_rgba(0,0,0,0.72)] backdrop-blur-[28px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Ambient */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(99,102,241,0.18),transparent_36%),radial-gradient(circle_at_86%_12%,rgba(236,72,153,0.12),transparent_30%)]" />

              {/* Top bar */}
              <div className="relative flex items-center justify-between border-b border-white/5 px-6 py-4">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="micro-interact flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                  aria-label="Minimize"
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

              {/* Desktop two-column layout */}
              <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
                {/* Left — Art */}
                <div className="relative flex min-h-[400px] items-center justify-center bg-gradient-to-br from-white/[0.05] via-neutral-950 to-black p-10">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.22),transparent_46%)]" />
                  {coverArt && (
                    <img src={coverArt} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-[0.18] blur-3xl saturate-150" />
                  )}
                  <div className="relative w-full max-w-[400px]">
                    <div className="aspect-square overflow-hidden rounded-[28px] border border-white/10 bg-neutral-900 shadow-[0_28px_100px_rgba(0,0,0,0.6)]">
                      {coverArt ? (
                        <img src={coverArt} alt={trackTitle} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <MusicIcon className="h-20 w-20 text-neutral-700" />
                        </div>
                      )}
                    </div>
                    <div className="mt-6 space-y-1 text-center">
                      <h3 className="line-clamp-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                        {trackTitle}
                      </h3>
                      <p className="text-sm text-neutral-400">{trackArtist}</p>
                    </div>
                  </div>
                </div>

                {/* Right — Controls */}
                <div className="relative flex flex-col gap-5 p-6 sm:p-8">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                  <SeekBar progress={progressValue} onSeek={seek} elapsed={elapsedTime} total={totalDuration} />

                  {/* Playback controls */}
                  <div className="flex items-center justify-center gap-4 sm:gap-5">
                    <button onClick={() => setShuffleEnabled((p) => !p)}
                      className={`micro-interact rounded-full border p-2.5 transition-all ${shuffleEnabled ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-400" : "border-white/10 bg-white/[0.04] text-neutral-500 hover:bg-white/[0.08] hover:text-white"}`}>
                      <Shuffle className="h-4 w-4" />
                    </button>
                    <button onClick={playPrevious} disabled={playlist.length <= 1}
                      className="micro-interact rounded-full border border-white/10 bg-white/[0.04] p-4 text-neutral-400 hover:bg-white/[0.08] hover:text-white disabled:opacity-25">
                      <SkipBack className="h-5 w-5 fill-current" />
                    </button>
                    <button onClick={togglePlay}
                      className="micro-interact flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-white text-black shadow-[0_0_56px_rgba(255,255,255,0.2)] hover:shadow-[0_0_72px_rgba(255,255,255,0.28)]">
                      {isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="ml-1 h-7 w-7 fill-current" />}
                    </button>
                    <button onClick={() => playNext(true)} disabled={playlist.length <= 1}
                      className="micro-interact rounded-full border border-white/10 bg-white/[0.04] p-4 text-neutral-400 hover:bg-white/[0.08] hover:text-white disabled:opacity-25">
                      <SkipForward className="h-5 w-5 fill-current" />
                    </button>
                    <button onClick={() => setRepeatMode((m) => m === "off" ? "all" : m === "all" ? "one" : "off")}
                      className={`micro-interact rounded-full border p-2.5 transition-all ${repeatMode !== "off" ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-400" : "border-white/10 bg-white/[0.04] text-neutral-500 hover:bg-white/[0.08] hover:text-white"}`}>
                      <RepeatIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Like + Sleep row */}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => currentTrack && toggleFavorite(currentTrack)}
                      disabled={savingFavoriteId === currentTrack?._id}
                      className={`micro-interact flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all ${isFavorited ? "border-pink-500/50 bg-pink-500/15 text-pink-300" : "border-white/10 bg-white/[0.04] text-neutral-400 hover:bg-white/[0.08] hover:text-white"}`}
                    >
                      {savingFavoriteId === currentTrack?._id
                        ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        : <Heart className={`h-3.5 w-3.5 ${isFavorited ? "fill-current" : ""}`} />}
                      {isFavorited ? "Saved" : "Save"}
                    </button>

                    {/* Desktop sleep dropdown */}
                    <div className="relative" ref={sleepMenuRef}>
                      {sleepActive ? (
                        <button onClick={cancelSleep}
                          className="micro-interact flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-300">
                          <Timer className="h-3.5 w-3.5" />{sleepLabel}<X className="h-3 w-3" />
                        </button>
                      ) : (
                        <button onClick={() => setShowSleepMenu((p) => !p)}
                          className="micro-interact flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-neutral-400 hover:bg-white/[0.08] hover:text-white">
                          <Timer className="h-3.5 w-3.5" />Sleep
                        </button>
                      )}
                      {showSleepMenu && (
                        <div className="absolute bottom-full right-0 z-10 mb-2 w-44 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/95 shadow-2xl backdrop-blur-xl">
                          <p className="px-4 pb-1.5 pt-3 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Sleep after</p>
                          {SLEEP_OPTIONS.map((opt) => (
                            <button key={opt.label} onClick={() => handleSleepSelect(opt)}
                              className="w-full px-4 py-2.5 text-left text-sm font-medium text-neutral-300 transition-colors hover:bg-white/5 hover:text-white">
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                    <button onClick={() => setVolume(volume === 0 ? 0.7 : 0)} className="micro-interact text-neutral-500 hover:text-white">
                      <VolumeIcon className="h-4 w-4" />
                    </button>
                    <div className="relative flex-1 group/vol">
                      <input type="range" min="0" max="1" step="0.01" value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 transition-all duration-200 group-hover/vol:h-2.5">
                        <div className="h-full rounded-full bg-white/80 transition-[width] duration-150" style={{ width: `${volume * 100}%` }} />
                      </div>
                    </div>
                    <span className="w-10 text-right text-xs font-semibold tabular-nums text-neutral-500">{Math.round(volume * 100)}%</span>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-1 rounded-2xl border border-white/5 bg-white/[0.03] p-1">
                    <button onClick={() => setShowLyricsTab(false)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all ${!showLyricsTab ? "bg-white/10 text-white" : "text-neutral-500 hover:text-neutral-300"}`}>
                      <ListMusic className="h-3.5 w-3.5" />Queue ({playlist.length})
                    </button>
                    <button onClick={() => setShowLyricsTab(true)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all ${showLyricsTab ? "bg-white/10 text-white" : "text-neutral-500 hover:text-neutral-300"}`}>
                      <Mic2 className="h-3.5 w-3.5" />Lyrics
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
                    {showLyricsTab ? (
                      <div className="flex h-36 flex-col items-center justify-center gap-2">
                        <Mic2 className="h-7 w-7 text-neutral-700" />
                        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-600">Lyrics coming soon</p>
                      </div>
                    ) : (
                      <div className="max-h-44 overflow-y-auto"><QueueList playlist={playlist} currentTrack={currentTrack} /></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Mobile: true full-screen ───────────────────────────────────── */}
          <div
            className="absolute inset-0 flex flex-col overflow-hidden lg:hidden"
            style={{
              background: "var(--color-bg)",
              transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
              transition: dragY > 0 ? "none" : "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
              willChange: "transform",
            }}
            onTouchStart={onExpandedTouchStart}
            onTouchMove={onExpandedTouchMove}
            onTouchEnd={onExpandedTouchEnd}
          >
            {/* Ambient blurred background art */}
            {coverArt && (
              <img src={coverArt} alt="" aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-3xl saturate-150" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-neutral-950/80 to-neutral-950" />

            {/* Safe-area top + drag handle */}
            <div className="relative z-10 flex flex-shrink-0 flex-col items-center"
              style={{ paddingTop: "env(safe-area-inset-top, 8px)" }}>
              <div className="mt-3 h-1 w-10 rounded-full bg-white/25" />
            </div>

            {/* Top bar */}
            <div className="relative z-10 flex flex-shrink-0 items-center justify-between px-5 py-2">
              <button onClick={() => setIsExpanded(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-neutral-400 active:bg-white/15"
                aria-label="Minimize">
                <ChevronDown className="h-5 w-5" />
              </button>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-400">
                Now playing
              </p>
              <div className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-400">
                {playlist.length}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="relative z-10 flex flex-1 flex-col overflow-y-auto">
              {/* Album art — 60vw, centered, capped at 320px */}
              <div className="flex flex-shrink-0 justify-center px-6 pb-6 pt-4">
                <div className="overflow-hidden rounded-[22px] border border-white/10 bg-neutral-900 shadow-[0_24px_72px_rgba(0,0,0,0.55)]"
                  style={{ width: "min(60vw, 320px)", aspectRatio: "1" }}>
                  {coverArt ? (
                    <img src={coverArt} alt={trackTitle} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <MusicIcon className="h-16 w-16 text-neutral-700" />
                    </div>
                  )}
                </div>
              </div>

              {/* Title + Artist + Like */}
              <div className="flex flex-shrink-0 items-start justify-between gap-3 px-6">
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-xl font-black leading-tight tracking-tight text-white sm:text-2xl">
                    {trackTitle}
                  </h3>
                  <p className="mt-1 truncate text-sm text-neutral-400">{trackArtist}</p>
                </div>
                <button
                  onClick={() => currentTrack && toggleFavorite(currentTrack)}
                  disabled={savingFavoriteId === currentTrack?._id}
                  className={`mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border transition-all ${isFavorited ? "border-pink-500/50 bg-pink-500/15 text-pink-300" : "border-white/15 bg-white/5 text-neutral-500 active:bg-white/10"}`}
                  aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                >
                  {savingFavoriteId === currentTrack?._id
                    ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    : <Heart className={`h-5 w-5 ${isFavorited ? "fill-current" : ""}`} />}
                </button>
              </div>

              {/* Seek bar */}
              <div className="mt-6 flex-shrink-0 px-6">
                <SeekBar progress={progressValue} onSeek={seek} elapsed={elapsedTime} total={totalDuration} />
              </div>

              {/* Main controls */}
              <div className="mt-5 flex flex-shrink-0 items-center justify-between px-5">
                {/* Shuffle */}
                <button onClick={() => setShuffleEnabled((p) => !p)}
                  className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all active:scale-95 ${shuffleEnabled ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-400" : "border-white/10 bg-white/[0.06] text-neutral-500"}`}>
                  <Shuffle className="h-5 w-5" />
                </button>
                {/* Previous */}
                <button onClick={playPrevious} disabled={playlist.length <= 1}
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-neutral-300 active:scale-95 disabled:opacity-30">
                  <SkipBack className="h-6 w-6 fill-current" />
                </button>
                {/* Play/Pause */}
                <button onClick={togglePlay}
                  className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-white text-black shadow-[0_0_50px_rgba(255,255,255,0.22)] active:scale-95">
                  {isPlaying
                    ? <Pause className="h-8 w-8 fill-current" />
                    : <Play className="ml-1 h-8 w-8 fill-current" />}
                </button>
                {/* Next */}
                <button onClick={() => playNext(true)} disabled={playlist.length <= 1}
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-neutral-300 active:scale-95 disabled:opacity-30">
                  <SkipForward className="h-6 w-6 fill-current" />
                </button>
                {/* Repeat */}
                <button onClick={() => setRepeatMode((m) => m === "off" ? "all" : m === "all" ? "one" : "off")}
                  className={`flex h-12 w-12 items-center justify-center rounded-full border transition-all active:scale-95 ${repeatMode !== "off" ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-400" : "border-white/10 bg-white/[0.06] text-neutral-500"}`}>
                  <RepeatIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Action row: Queue + Sleep */}
              <div className="mt-5 flex flex-shrink-0 gap-3 px-5">
                <button onClick={() => setShowQueueSheet(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] py-3.5 text-sm font-semibold text-neutral-400 active:bg-white/10">
                  <ListMusic className="h-4 w-4" />
                  Queue ({playlist.length})
                </button>
                {sleepActive ? (
                  <button onClick={cancelSleep}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/15 py-3.5 text-sm font-semibold text-amber-300 active:bg-amber-500/25">
                    <Timer className="h-4 w-4" />{sleepLabel}<X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button onClick={() => setShowSleepSheet(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] py-3.5 text-sm font-semibold text-neutral-400 active:bg-white/10">
                    <Timer className="h-4 w-4" />Sleep
                  </button>
                )}
              </div>

              {/* Volume */}
              <div className="mx-5 mt-4 flex flex-shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5">
                <button onClick={() => setVolume(volume === 0 ? 0.7 : 0)} className="text-neutral-500 active:text-white">
                  <VolumeIcon className="h-4 w-4" />
                </button>
                <div className="relative flex-1">
                  <input type="range" min="0" max="1" step="0.01" value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-white/80 transition-[width] duration-150" style={{ width: `${volume * 100}%` }} />
                  </div>
                </div>
                <span className="w-10 text-right text-xs font-semibold tabular-nums text-neutral-500">{Math.round(volume * 100)}%</span>
              </div>

              {/* Safe-area spacer */}
              <div className="flex-shrink-0" style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)" }} />
            </div>
          </div>
        </div>
      </>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MINI PLAYER
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed left-1/2 z-[1100] w-[calc(100%-0.75rem)] max-w-[960px] -translate-x-1/2"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
      onTouchStart={onMiniTouchStart}
      onTouchEnd={onMiniTouchEnd}
    >
      <div className="overflow-hidden rounded-[20px] border border-white/10 bg-neutral-950/90 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-[28px]">
        {/* Clickable progress bar */}
        <div
          className="relative h-1 w-full cursor-pointer bg-white/[0.08]"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            seek(((e.clientX - r.left) / r.width) * 100);
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-violet-400 to-pink-500 transition-[width] duration-300 ease-out"
            style={{ width: `${progressValue}%` }}
          />
        </div>

        {/* Player row */}
        <div className="relative flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_26%,transparent_76%,rgba(255,255,255,0.02))]" />

          {/* Album art — tap to expand */}
          <button
            onClick={() => setIsExpanded(true)}
            className="micro-interact h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
            aria-label="Open player"
          >
            {coverArt
              ? <img src={coverArt} alt={trackTitle} className="h-full w-full object-cover" />
              : <div className="flex h-full w-full items-center justify-center"><MusicIcon className="h-6 w-6 text-neutral-600" /></div>}
          </button>

          {/* Track info — tap to expand */}
          <button onClick={() => setIsExpanded(true)} className="relative min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold text-white">{trackTitle}</p>
            <p className="mt-0.5 truncate text-xs text-neutral-500">
              {trackArtist}
              {sleepActive && (
                <span className="ml-2 font-semibold text-amber-400">· {sleepLabel}</span>
              )}
            </p>
          </button>

          {/* Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Like — sm+ */}
            <button
              onClick={() => currentTrack && toggleFavorite(currentTrack)}
              disabled={savingFavoriteId === currentTrack?._id}
              className={`micro-interact hidden h-10 w-10 items-center justify-center rounded-full border sm:flex disabled:opacity-50 ${isFavorited ? "border-pink-500/40 bg-pink-500/15 text-pink-300" : "border-white/10 bg-white/5 text-neutral-500 hover:text-white"}`}
              aria-label={isFavorited ? "Remove from favorites" : "Save"}
            >
              {savingFavoriteId === currentTrack?._id
                ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                : <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />}
            </button>

            {/* Shuffle — md+ */}
            <button onClick={() => setShuffleEnabled((p) => !p)}
              className={`micro-interact hidden h-9 w-9 items-center justify-center rounded-full border md:flex ${shuffleEnabled ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-400" : "border-white/10 bg-white/5 text-neutral-500 hover:text-white"}`}
              aria-label="Shuffle">
              <Shuffle className="h-3.5 w-3.5" />
            </button>

            {/* Previous */}
            <button onClick={playPrevious} disabled={playlist.length <= 1}
              className="micro-interact flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-500 hover:text-white disabled:opacity-25 active:scale-95"
              aria-label="Previous">
              <SkipBack className="h-4 w-4 fill-current" />
            </button>

            {/* Play/Pause — largest touch target */}
            <button onClick={togglePlay}
              className="micro-interact flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-[0_0_28px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.28)] active:scale-95"
              aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying
                ? <Pause className="h-5 w-5 fill-current" />
                : <Play className="ml-0.5 h-5 w-5 fill-current" />}
            </button>

            {/* Next */}
            <button onClick={() => playNext(true)} disabled={playlist.length <= 1}
              className="micro-interact flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-500 hover:text-white disabled:opacity-25 active:scale-95"
              aria-label="Next">
              <SkipForward className="h-4 w-4 fill-current" />
            </button>

            {/* Repeat — md+ */}
            <button onClick={() => setRepeatMode((m) => m === "off" ? "all" : m === "all" ? "one" : "off")}
              className={`micro-interact hidden h-9 w-9 items-center justify-center rounded-full border md:flex ${repeatMode !== "off" ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-400" : "border-white/10 bg-white/5 text-neutral-500 hover:text-white"}`}
              aria-label={`Repeat: ${repeatMode}`}>
              <RepeatIcon className="h-3.5 w-3.5" />
            </button>

            {/* Inline volume — lg+ */}
            <div className="ml-1 hidden w-32 items-center gap-2 lg:flex">
              <VolumeIcon className="h-4 w-4 flex-shrink-0 text-neutral-500" />
              <div className="relative flex-1 group/vol">
                <input type="range" min="0" max="1" step="0.01" value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 transition-all duration-200 group-hover/vol:h-2.5">
                  <div className="h-full rounded-full bg-white/70 transition-[width] duration-150" style={{ width: `${volume * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Expand */}
            <button onClick={() => setIsExpanded(true)}
              className="micro-interact flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-500 hover:text-white"
              aria-label="Open expanded player">
              <Expand className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;
