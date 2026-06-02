import { useEffect, useMemo, useState } from "react";
import { useMusic } from "./MusicContext";
import {
  ChevronDown,
  Expand,
  Play,
  Pause,
  Volume2,
  Music as MusicIcon,
  SkipBack,
  SkipForward,
} from "lucide-react";

const Player = () => {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    progress,
    seek,
    volume,
    setVolume,
    playNext,
    playPrevious,
    playlist,
    duration,
  } = useMusic();
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const onEscape = (event) => {
      if (event.key === "Escape") setIsExpanded(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  // ─── Native Back Button Support ──────────────────────────────────────────
  useEffect(() => {
    if (!isExpanded) return;

    // Guard against duplicate push states
    if (!window.history.state?.modal) {
      window.history.pushState({ modal: "player-expanded" }, "");
    }

    const handleBack = () => {
      setIsExpanded(false);
    };

    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, [isExpanded]);

  // ─── Production-Grade Scroll Locking ──────────────────────────────────────
  useEffect(() => {
    document.body.classList.toggle(
      "has-mini-player",
      !!currentTrack && !isExpanded,
    );

    if (!!currentTrack && isExpanded) {
      // Save current scroll position
      const scrollY = window.scrollY;

      // Freeze the background + prevent horizontal shifts (mobile keyboard safety)
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";

      return () => {
        // Restore background scroll position
        const savedY = document.body.style.top;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        document.body.style.overflow = "";

        if (savedY) {
          window.scrollTo(0, parseInt(savedY || "0") * -1);
        }
      };
    }
  }, [currentTrack, isExpanded]);

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const coverArt = currentTrack?.thumbnailUrl || currentTrack?.thumbnail;
  const trackTitle = currentTrack?.title || "Unknown Track";
  const trackArtist = currentTrack?.artist?.username || "Unknown Artist";

  const progressValue = useMemo(
    () => (Number.isFinite(progress) ? progress : 0),
    [progress],
  );

  const elapsedTime = useMemo(
    () => formatTime((progressValue * duration) / 100),
    [progressValue, duration],
  );

  const totalDuration = useMemo(() => formatTime(duration), [duration]);

  // Safety check: return if no track loaded
  if (!currentTrack?.youtubeUrl) return null;

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 z-[1300]"
          role="dialog"
          aria-modal="true"
          aria-label="Music Player"
        >
          <div
            onClick={() => setIsExpanded(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[28px] backdrop-saturate-150 backdrop-brightness-75 transition-all duration-500 will-change-[backdrop-filter]"
          />

          <div className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div className="pointer-events-auto relative w-full max-w-5xl overflow-hidden rounded-t-[34px] sm:rounded-[36px] border border-white/10 bg-neutral-950/82 shadow-[0_36px_140px_rgba(0,0,0,0.62)] backdrop-blur-[28px] soft-glow">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(99,102,241,0.16),transparent_34%),radial-gradient(circle_at_84%_12%,rgba(236,72,153,0.11),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_26%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.06),transparent_32%,transparent_66%,rgba(255,255,255,0.02))]" />
              <div className="relative flex items-center justify-between border-b border-white/5 px-5 py-4 sm:px-6">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="micro-interact flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45"
                  aria-label="Minimize player"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">
                  Now playing
                </p>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-300 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                  {playlist.length} tracks
                </div>
              </div>

              <div className="relative grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="relative flex min-h-[320px] items-center justify-center bg-gradient-to-br from-white/[0.06] via-neutral-950/95 to-black p-6 sm:min-h-[540px] sm:p-10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.24),transparent_44%),radial-gradient(circle_at_bottom,rgba(236,72,153,0.16),transparent_40%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_30%,rgba(0,0,0,0.14))]" />
                  {coverArt && (
                    <img
                      src={coverArt}
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-[0.2] blur-3xl saturate-125"
                    />
                  )}
                  <div className="relative w-full max-w-[420px]">
                    <div className="aspect-square overflow-hidden rounded-[30px] border border-white/10 bg-neutral-900 shadow-[0_28px_100px_rgba(0,0,0,0.58)]">
                      {coverArt ? (
                        <img
                          src={coverArt}
                          alt={trackTitle}
                          className={`h-full w-full object-cover transition-transform duration-[12s] ease-out scale-100`}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <MusicIcon className="h-16 w-16 text-neutral-700" />
                        </div>
                      )}
                      {isPlaying && (
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12),transparent_48%),linear-gradient(180deg,rgba(99,102,241,0.08),rgba(236,72,153,0.05))] mix-blend-screen" />
                      )}
                    </div>

                    <div className="mt-7 space-y-1.5 text-center">
                      <h3 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
                        {trackTitle}
                      </h3>
                      <p className="text-sm text-neutral-400">{trackArtist}</p>
                    </div>
                  </div>
                </div>

                <div className="relative flex flex-col justify-between gap-8 p-5 sm:p-8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_24%,rgba(0,0,0,0.16))]">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-neutral-500">
                      <span>{elapsedTime}</span>
                      <span>{totalDuration}</span>
                    </div>
                    <div className="relative flex items-center py-1.5">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={progressValue}
                        onChange={(e) => seek(e.target.value)}
                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                      />
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-400 to-pink-500 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                          style={{ width: `${progressValue}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-5 sm:gap-8">
                    <button
                      onClick={playPrevious}
                      disabled={playlist.length <= 1}
                      className="micro-interact rounded-full border border-white/10 bg-white/[0.04] p-4 text-neutral-500 hover:text-white hover:bg-white/[0.08] hover:shadow-[0_10px_26px_rgba(0,0,0,0.22)] disabled:opacity-25"
                    >
                      <SkipBack className="h-6 w-6 fill-current" />
                    </button>
                    <button
                      onClick={togglePlay}
                      className="group micro-interact relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-white text-black shadow-[0_0_60px_rgba(255,255,255,0.18)] hover:shadow-[0_0_72px_rgba(255,255,255,0.22)]"
                    >
                      <div className="absolute inset-0 rounded-full bg-white blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-20" />
                      {isPlaying ? (
                        <Pause className="h-7 w-7 fill-current" />
                      ) : (
                        <Play className="ml-1 h-7 w-7 fill-current" />
                      )}
                    </button>
                    <button
                      onClick={playNext}
                      disabled={playlist.length <= 1}
                      className="micro-interact rounded-full border border-white/10 bg-white/[0.04] p-4 text-neutral-500 hover:text-white hover:bg-white/[0.08] hover:shadow-[0_10px_26px_rgba(0,0,0,0.22)] disabled:opacity-25"
                    >
                      <SkipForward className="h-6 w-6 fill-current" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
                    <Volume2 className="h-4 w-4 text-neutral-500" />
                    <div className="relative flex-1">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => setVolume(e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-white transition-all duration-150"
                          style={{ width: `${volume * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-12 text-right text-xs font-semibold text-neutral-500">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isExpanded && (
        <div className="fixed bottom-3 left-1/2 z-[1100] w-[calc(100%-1rem)] max-w-4xl -translate-x-1/2 sm:bottom-4 sm:w-[calc(100%-2rem)]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/78 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-[24px] soft-glow">
            <div className="h-[2px] w-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-violet-400 to-pink-500 transition-all duration-300 ease-out"
                style={{ width: `${progressValue}%` }}
              />
            </div>
            <div className="relative flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06),transparent_28%,transparent_74%,rgba(255,255,255,0.025))]" />
              <button
                onClick={() => setIsExpanded(true)}
                className="micro-interact h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-[0_10px_28px_rgba(0,0,0,0.3)]"
              >
                {coverArt ? (
                  <img
                    src={coverArt}
                    alt={trackTitle}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <MusicIcon className="h-5 w-5 text-neutral-600" />
                  </div>
                )}
              </button>

              <button
                onClick={() => setIsExpanded(true)}
                className="relative min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-semibold text-white">
                  {trackTitle}
                </p>
                <p className="truncate text-xs text-neutral-500">
                  {trackArtist} · {elapsedTime}
                </p>
              </button>

              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={playPrevious}
                  disabled={playlist.length <= 1}
                  className="micro-interact flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-500 hover:text-white hover:bg-white/10 disabled:opacity-25"
                  aria-label="Previous track"
                >
                  <SkipBack className="h-4 w-4 fill-current" />
                </button>
                <button
                  onClick={togglePlay}
                  className="micro-interact flex h-10 w-10 items-center justify-center rounded-full bg-white text-black hover:shadow-[0_0_36px_rgba(255,255,255,0.26)]"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5 fill-current" />
                  ) : (
                    <Play className="ml-0.5 h-5 w-5 fill-current" />
                  )}
                </button>
                <button
                  onClick={playNext}
                  disabled={playlist.length <= 1}
                  className="micro-interact flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-500 hover:text-white hover:bg-white/10 disabled:opacity-25"
                  aria-label="Next track"
                >
                  <SkipForward className="h-4 w-4 fill-current" />
                </button>
                <button
                  onClick={() => setIsExpanded(true)}
                  className="micro-interact hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-500 hover:text-white hover:bg-white/10"
                  aria-label="Open expanded player"
                >
                  <Expand className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Player;
