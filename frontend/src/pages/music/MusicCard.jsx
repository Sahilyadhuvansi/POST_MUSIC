import React from "react";
import { Play, Pause, ListMusic, Heart, Zap } from "lucide-react";

const MusicCard = React.memo(
  ({
    track,
    currentTrack,
    isPlaying,
    playTrack,
    playableTracks,
    handleOpenPlaylist,
    savedByUrl,
    savingId,
    toggleFavorite,
    forceAlbum = false,
    accent = "indigo",
  }) => {
    const isActive = currentTrack?._id === track._id;
    const isAlbum = forceAlbum || !!track.isPlaylist;
    const isSaved = !!savedByUrl[track.youtubeUrl];

    const accentClass =
      accent === "pink"
        ? "group-hover:text-pink-400"
        : "group-hover:text-indigo-400";

    return (
      <article
        className={`group rounded-[24px] border p-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
          isActive
            ? "border-indigo-500/40 bg-gradient-to-b from-indigo-500/14 to-white/[0.03] shadow-[0_22px_60px_rgba(79,70,229,0.24)]"
            : "border-white/10 bg-gradient-to-b from-white/[0.045] to-white/[0.02] hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_18px_50px_rgba(0,0,0,0.26)]"
        }`}
      >
        <button
          onClick={() => {
            if (isAlbum) {
              handleOpenPlaylist(track);
              return;
            }
            playTrack(track, playableTracks);
          }}
          className="micro-interact relative w-full aspect-square overflow-hidden rounded-[20px] bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/45"
        >
          {track.thumbnail ? (
            <img
              src={track.thumbnail}
              alt={track.title}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-neutral-800 via-neutral-900 to-black">
              <Zap className="w-10 h-10 text-neutral-700" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/38 via-black/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.22),transparent_26%,transparent_72%,rgba(255,255,255,0.04))] opacity-40 transition-opacity duration-500 group-hover:opacity-70" />

          <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-90 transition-all duration-500 group-hover:opacity-100 group-hover:scale-100">
            <div className="h-14 w-14 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl">
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

        <div className="pt-3 px-1 space-y-1.5">
          <h3
            className={`text-sm font-semibold text-white truncate transition-colors ${accentClass}`}
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
              disabled={savingId === track._id}
              className={`micro-interact h-8 w-8 rounded-full border flex items-center justify-center disabled:opacity-50 ${
                isSaved
                  ? "border-pink-500/50 bg-pink-500/20 text-pink-300 shadow-[0_10px_24px_rgba(236,72,153,0.18)]"
                  : "border-white/15 bg-white/5 text-neutral-500 hover:text-indigo-200 hover:border-indigo-400/40 hover:bg-white/10"
              }`}
              title={isSaved ? "Remove from favorites" : "Add to favorites"}
            >
              {savingId === track._id ? (
                <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Heart
                  className={`w-3.5 h-3.5 ${isSaved ? "fill-current" : ""}`}
                />
              )}
            </button>
          ) : (
            <button
              onClick={() => handleOpenPlaylist(track)}
              className="micro-interact h-8 rounded-full border border-white/15 bg-white/5 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400 hover:text-white hover:border-white/30 hover:bg-white/10"
            >
              Open
            </button>
          )}
        </div>
      </article>
    );
  },
);

export default MusicCard;
