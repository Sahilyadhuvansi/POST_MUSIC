import { memo } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { GENRES } from "./constants";

const MusicBrowseControls = memo(({
  tracksCount: _tracksCount,
  searchQuery,
  setSearchQuery,
  isSearching,
  showFavoritesOnly,
  setShowFavoritesOnly,
  activeGenre,
  handleGenreClick,
  playlistMeta,
  setPlaylistMeta,
  recentSearches = [],
  runSearch,
}) => {
  return (
    <>
      {/* Hero heading */}
      <div className="relative mb-10 pb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between overflow-hidden rounded-[32px] px-1">
        <div className="pointer-events-none absolute -left-16 -top-8 h-56 w-56 rounded-full bg-indigo-500/12 blur-[80px]" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-48 w-48 rounded-full bg-pink-500/10 blur-[80px]" />

        <div className="relative space-y-3 min-w-0 max-w-full">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-600">
            Music discovery
          </p>
          <h1 className="max-w-full text-[clamp(2.5rem,8vw,4.75rem)] font-black tracking-tight leading-[0.9] text-white break-words">
            <span className="block sm:inline">Sonic</span>
            <span
              className="block sm:inline sm:ml-3 text-transparent bg-clip-text"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #818cf8 0%, #c084fc 40%, #f472b6 100%)",
              }}
            >
              Universe
            </span>
          </h1>
        </div>
      </div>

      {/* Search input */}
      <div className="relative mb-7">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-neutral-600" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Bollywood, pop, artist, song name…"
          aria-label="Search for music"
          className="w-full rounded-3xl pl-13 pr-6 py-4 sm:py-5 text-sm text-white placeholder-neutral-700 outline-none transition-all duration-350"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(24px) saturate(150%)",
            WebkitBackdropFilter: "blur(24px) saturate(150%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.border = "1px solid rgba(99,102,241,0.45)";
            e.currentTarget.style.boxShadow =
              "0 0 0 3px rgba(99,102,241,0.12), 0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.09)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
            e.currentTarget.style.boxShadow =
              "0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.07)";
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-5 flex items-center text-neutral-600 hover:text-white transition-colors duration-300 text-xs font-black uppercase tracking-widest"
          >
            Clear
          </button>
        )}
      </div>

      {/* Recent searches */}
      {!isSearching && recentSearches.length > 0 && (
        <div className="mb-8 px-2">
          <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-3">
            Recent Inquiries
          </p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((s) => (
              <button
                key={s}
                onClick={() => setSearchQuery(s)}
                className="text-[10px] font-bold text-neutral-600 hover:text-white transition-colors duration-250"
              >
                {s} <span className="text-neutral-800 mx-1">/</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Genre pills */}
      {!isSearching && (
        <div
          className="mb-10 overflow-x-auto pb-2 -mx-1 px-1"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          <div className="flex w-max min-w-full gap-2" role="group" aria-label="Browse by genre">
            <button
              onClick={() => {
                setShowFavoritesOnly((prev) => !prev);
                setSearchQuery("");
                setPlaylistMeta(null);
              }}
              className="micro-interact px-4 sm:px-5 py-2.5 rounded-2xl text-[11px] font-semibold uppercase tracking-[0.16em] transition-all duration-300"
              style={
                showFavoritesOnly
                  ? {
                      background: "linear-gradient(135deg, rgba(236,72,153,0.85), rgba(168,85,247,0.8))",
                      color: "white",
                      border: "1px solid rgba(255,255,255,0.18)",
                      boxShadow: "0 4px 20px rgba(236,72,153,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
                    }
                  : {
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.45)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                    }
              }
            >
              Favorites
            </button>
            {GENRES.map((g, idx) => (
              <button
                key={g.label}
                onClick={() => handleGenreClick(idx)}
                className="micro-interact px-4 sm:px-5 py-2.5 rounded-2xl text-[11px] font-semibold uppercase tracking-[0.16em] transition-all duration-300"
                style={
                  activeGenre === idx
                    ? {
                        background: "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(168,85,247,0.8))",
                        color: "white",
                        border: "1px solid rgba(255,255,255,0.18)",
                        boxShadow: "0 4px 20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                      }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        color: "rgba(255,255,255,0.45)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                      }
                }
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isSearching && (
        <p className="text-[10px] font-black text-neutral-700 uppercase tracking-[0.3em] mb-8">
          Search: &quot;{searchQuery}&quot;
        </p>
      )}

      {playlistMeta && (
        <div
          className="mb-8 flex items-center justify-between gap-4 rounded-2xl px-5 py-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-black">
              Album / Playlist
            </p>
            <h3 className="text-sm text-white font-black truncate mt-1">
              {playlistMeta.title}
            </h3>
          </div>
          <button
            onClick={() => {
              setPlaylistMeta(null);
              runSearch(searchQuery.trim() || GENRES[activeGenre].term);
            }}
            className="px-4 py-2 rounded-xl text-neutral-300 hover:text-white transition-all duration-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 micro-interact"
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        </div>
      )}
    </>
  );
});

export default MusicBrowseControls;
