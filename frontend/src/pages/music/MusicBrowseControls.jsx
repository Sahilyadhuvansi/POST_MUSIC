import { memo } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { GENRES } from "./constants";

const MusicBrowseControls = memo(({
  tracksCount,
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
      <div className="relative mb-10 border-b border-white/5 pb-8 sm:pb-10 flex flex-col gap-5 sm:gap-6 md:flex-row md:items-end md:justify-between overflow-hidden rounded-[28px] px-1">
        <div className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-indigo-500/15 blur-[70px]" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-36 w-36 rounded-full bg-pink-500/12 blur-[74px]" />

        <div className="relative space-y-3 min-w-0 max-w-full">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">
            Music discovery
          </p>
          <h1 className="max-w-full text-[clamp(2.5rem,8vw,4.75rem)] font-black tracking-tight leading-[0.9] text-white break-words">
            <span className="block sm:inline">Sonic</span>
            <span className="block sm:inline text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 sm:ml-2">
              Universe
            </span>
          </h1>
        </div>
      </div>

      <div className="relative mb-7">
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-neutral-500" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Bollywood, pop, artist, song name…"
          aria-label="Search for music"
          className="w-full glass rounded-3xl border border-white/5 bg-white/[0.03] pl-14 pr-6 py-4 sm:py-5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500/50 transition-all duration-300 focus:shadow-[0_14px_40px_rgba(99,102,241,0.2)]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-6 flex items-center text-neutral-600 hover:text-white transition-colors duration-300 text-xs font-black uppercase tracking-widest"
          >
            Clear
          </button>
        )}
      </div>

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
                className="text-[10px] font-bold text-neutral-500 hover:text-white transition-colors"
              >
                {s} <span className="text-neutral-800 mx-1">/</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!isSearching && (
        <div className="mb-10 overflow-x-auto pb-1">
          <div className="flex w-max min-w-full gap-2" role="group" aria-label="Browse by genre">
            <button
              onClick={() => {
                setShowFavoritesOnly((prev) => !prev);
                setSearchQuery("");
                setPlaylistMeta(null);
              }}
              className={`micro-interact px-4 sm:px-5 py-2.5 rounded-2xl text-[11px] font-semibold uppercase tracking-[0.16em] ${
                showFavoritesOnly
                  ? "bg-pink-500 text-white shadow-[0_0_24px_rgba(236,72,153,0.35)]"
                  : "glass border border-white/5 text-neutral-600 hover:text-white hover:border-white/10"
              }`}
            >
              Favorites
            </button>
            {GENRES.map((g, idx) => (
              <button
                key={g.label}
                onClick={() => handleGenreClick(idx)}
                className={`micro-interact px-4 sm:px-5 py-2.5 rounded-2xl text-[11px] font-semibold uppercase tracking-[0.16em] ${
                  activeGenre === idx
                    ? "bg-indigo-500 text-white shadow-[0_0_24px_rgba(99,102,241,0.4)]"
                    : "glass border border-white/5 text-neutral-600 hover:text-white hover:border-white/10"
                }`}
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
        <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-white/5 glass px-5 py-4">
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
            className="px-4 py-2 rounded-xl border border-white/10 text-neutral-300 hover:text-white hover:border-white/20 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
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
