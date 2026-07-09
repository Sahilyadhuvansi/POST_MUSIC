import React from "react";
import { Play, Pause, ListMusic, Heart, Zap } from "lucide-react";
import { useMusic } from "../../features/music/MusicContext";

const MusicCard = React.memo(
  ({
    track,
    currentTrack,
    isPlaying,
    playTrack,
    playableTracks,
    handleOpenPlaylist,
    forceAlbum = false,
    accent = "indigo",
    draggable,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    isDragOver,
  }) => {
    const { savedByUrl, savingFavoriteId, toggleFavorite } = useMusic();

    const isActive = currentTrack?._id === track._id;
    const isAlbum = forceAlbum || !!track.isPlaylist;
    const isSaved = !!savedByUrl[track.youtubeUrl];

    const accentTextHover =
      accent === "pink" ? "group-hover:text-pink-300" : "group-hover:text-indigo-300";

    return (
      <article
        className={`group relative rounded-[26px] p-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform liquid-sheen-on-hover overflow-hidden ${
          isDragOver ? "scale-[1.03]" : ""
        }`}
        style={
          isActive
            ? {
                background:
                  "linear-gradient(160deg, rgba(99,102,241,0.14) 0%, rgba(99,102,241,0.04) 60%, rgba(0,0,0,0.08) 100%)",
                border: "1px solid rgba(99,102,241,0.35)",
                boxShadow:
                  "0 8px 32px rgba(99,102,241,0.22), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
              }
            : isDragOver
            ? {
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.5)",
                boxShadow: "0 0 0 2px rgba(99,102,241,0.2)",
              }
            : {
                background:
                  "linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 60%, rgba(0,0,0,0.06) 100%)",
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow:
                  "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.07)",
                backdropFilter: "blur(16px) saturate(140%)",
                WebkitBackdropFilter: "blur(16px) saturate(140%)",
              }
        }
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
      >
        {/* Subtle top highlight */}
        <div
          className="absolute top-0 left-0 right-0 h-px rounded-t-[26px] pointer-events-none"
          style={{
            background: isActive
              ? "rgba(99,102,241,0.5)"
              : "rgba(255,255,255,0.1)",
          }}
        />

        <button
          onClick={() => {
            if (isAlbum) {
              handleOpenPlaylist(track);
              return;
            }
            playTrack(track, playableTracks);
          }}
          className="micro-interact relative w-full aspect-square overflow-hidden rounded-[20px] bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40"
        >
          {track.thumbnail ? (
            <img
              src={track.thumbnail}
              alt={track.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-neutral-800 via-neutral-900 to-black">
              <Zap className="w-10 h-10 text-neutral-700" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          {/* Glass sheen */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_30%,transparent_70%,rgba(255,255,255,0.04))] opacity-35 transition-opacity duration-500 group-hover:opacity-60" />

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-90 transition-all duration-400 group-hover:opacity-100 group-hover:scale-100">
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center shadow-2xl"
              style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.25)",
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              {isActive && isPlaying ? (
                <Pause className="w-6 h-6 text-white fill-white" />
              ) : isAlbum ? (
                <ListMusic className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white fill-white ml-1" />
              )}
            </div>
          </div>
        </button>

        <div className="pt-3 px-1 space-y-1">
          <h3
            className={`text-sm font-semibold text-white/90 truncate transition-colors duration-300 ${accentTextHover}`}
          >
            {track.title}
          </h3>
        </div>

        <div className="pt-3 px-1 flex items-center justify-between">
          {!isAlbum ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(track);
              }}
              disabled={savingFavoriteId === track._id}
              className="micro-interact h-8 w-8 rounded-full flex items-center justify-center disabled:opacity-40 transition-all duration-300"
              style={
                isSaved
                  ? {
                      background: "rgba(236,72,153,0.18)",
                      border: "1px solid rgba(236,72,153,0.4)",
                      boxShadow:
                        "0 4px 16px rgba(236,72,153,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
                      color: "rgb(249,168,212)",
                    }
                  : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.3)",
                    }
              }
              title={isSaved ? "Remove from favorites" : "Add to favorites"}
            >
              {savingFavoriteId === track._id ? (
                <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-current" : ""}`} />
              )}
            </button>
          ) : (
            <button
              onClick={() => handleOpenPlaylist(track)}
              className="micro-interact h-8 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400 hover:text-white transition-all duration-300"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              Open
            </button>
          )}

          {draggable && (
            <div className="text-neutral-600 cursor-grab active:cursor-grabbing select-none px-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <circle cx="5" cy="4" r="1.2" />
                <circle cx="11" cy="4" r="1.2" />
                <circle cx="5" cy="8" r="1.2" />
                <circle cx="11" cy="8" r="1.2" />
                <circle cx="5" cy="12" r="1.2" />
                <circle cx="11" cy="12" r="1.2" />
              </svg>
            </div>
          )}
        </div>
      </article>
    );
  },
);

export default MusicCard;
