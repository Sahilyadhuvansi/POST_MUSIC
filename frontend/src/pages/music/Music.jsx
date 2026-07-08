import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useMusic } from "../../features/music/MusicContext";
import { useLocation } from "react-router-dom";
import { useToast } from "../../components/ui/Toast";
import { Disc, Play, GripVertical, ArrowUpDown, ChevronDown } from "lucide-react";
import { MusicSkeleton } from "../../components/SkeletonLoader";
import MusicCard from "./MusicCard";
import ApiKeyRequired from "./ApiKeyRequired";
import MusicBrowseControls from "./MusicBrowseControls";
import { useMusicBrowser } from "./useMusicBrowser";

const SORT_OPTIONS = [
  { value: "recent", label: "Recently Added" },
  { value: "name", label: "Name" },
  { value: "artist", label: "Artist" },
  { value: "most_played", label: "Most Played" },
  { value: "custom", label: "Custom Order" },
];

const Music = () => {
  const { currentTrack, playTrack, isPlaying } = useMusic();
  const { addToast } = useToast();
  const location = useLocation();

  const {
    loading,
    activeGenre,
    searchQuery,
    setSearchQuery,
    isSearching,
    apiKeyMissing,
    playlistMeta,
    setPlaylistMeta,
    bollywoodAlbums,
    showFavoritesOnly,
    setShowFavoritesOnly,
    runSearch,
    handleGenreClick,
    handleOpenPlaylist,
    visibleTracks,
    playableVisibleTracks,
    isBollywoodView,
    activeGenreLabel,
    loadMoreRef,
    favoritesSortBy,
    setFavoritesSortBy,
    reorderFavorites,
    favoriteTracks,
  } = useMusicBrowser({ addToast });

  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef(null);

  // ─── Drag and drop state ──────────────────────────────────────────────────
  const dragIndexRef = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = useCallback((index) => {
    dragIndexRef.current = index;
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (dropIndex) => {
      const fromIndex = dragIndexRef.current;
      if (fromIndex == null || fromIndex === dropIndex) {
        setDragOverIndex(null);
        return;
      }

      const reordered = [...favoriteTracks];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(dropIndex, 0, moved);

      reorderFavorites(reordered.map((t) => t._id));
      setFavoritesSortBy("custom");
      setDragOverIndex(null);
      dragIndexRef.current = null;
    },
    [favoriteTracks, reorderFavorites, setFavoritesSortBy],
  );

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
    dragIndexRef.current = null;
  }, []);

  // ─── Close sort menu on outside click ─────────────────────────────────────
  useEffect(() => {
    if (!showSortMenu) return;
    const handler = (e) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSortMenu]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const playId = params.get("play");
    if (playId && playableVisibleTracks.length > 0) {
      const track = playableVisibleTracks.find((t) => t._id === playId);
      if (track) playTrack(track, playableVisibleTracks);
    }
  }, [location.search, playableVisibleTracks, playTrack]);

  const featuredTrack = useMemo(() => {
    return visibleTracks.find((t) => !t.isPlaylist) || visibleTracks[0];
  }, [visibleTracks]);

  if (apiKeyMissing) return <ApiKeyRequired />;

  const isDnDEnabled = showFavoritesOnly && favoritesSortBy === "custom";

  return (
    <div className="min-h-screen" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 9rem)" }}>
      {/* pt-24 ensures content clears the fixed header (~80px) on all screen sizes */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-24">

        {/* Hero Section */}
        {!isSearching && !playlistMeta && featuredTrack && !showFavoritesOnly && (
          <div className="relative mb-16 h-[380px] w-full overflow-hidden rounded-[36px] group">
            <img
              src={featuredTrack.thumbnail}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-40 blur-sm transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-8 sm:p-12">
              <div className="flex items-center gap-3 mb-4">
                <div className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 backdrop-blur-md">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                    Featured Energy
                  </p>
                </div>
              </div>
              <h2 className="text-4xl sm:text-6xl font-black text-white italic tracking-tighter mb-6 max-w-2xl leading-[0.9]">
                {featuredTrack.title}
              </h2>
              <button
                onClick={() => playTrack(featuredTrack, playableVisibleTracks)}
                className="flex items-center gap-3 w-fit px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-400 hover:text-white transition-all transform active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" /> Launch Vibe
              </button>
            </div>
          </div>
        )}

        <MusicBrowseControls
          tracksCount={visibleTracks.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSearching={isSearching}
          showFavoritesOnly={showFavoritesOnly}
          setShowFavoritesOnly={setShowFavoritesOnly}
          activeGenre={activeGenre}
          handleGenreClick={handleGenreClick}
          playlistMeta={playlistMeta}
          setPlaylistMeta={setPlaylistMeta}
          runSearch={runSearch}
        />

        {loading && !showFavoritesOnly ? (
          <MusicSkeleton />
        ) : visibleTracks.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center p-12 glass rounded-[48px] border-white/5">
            <div className="relative mb-8">
              <div className="w-24 h-24 glass-dark rounded-full flex items-center justify-center animate-pulse">
                <Disc className="w-10 h-10 text-neutral-800" />
              </div>
              <div className="absolute inset-0 bg-pink-500/10 blur-3xl rounded-full" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2 italic">
              {showFavoritesOnly ? "No favorites yet" : "No results"}
            </h2>
            <p className="text-sm font-medium text-neutral-500 uppercase tracking-widest text-center">
              {showFavoritesOnly
                ? "Tap heart to save tracks"
                : "Try another search"}
            </p>
          </div>
        ) : (
          <>
            {!playlistMeta && (
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    {isSearching
                      ? `Search · ${searchQuery}`
                      : activeGenreLabel}
                  </h2>
                  {showFavoritesOnly && (
                    <p className="text-xs text-neutral-500 mt-1">
                      {favoriteTracks.length} saved track{favoriteTracks.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {/* Favorites sort controls */}
                {showFavoritesOnly && (
                  <div className="flex items-center gap-2">
                    {/* Drag hint */}
                    {favoritesSortBy === "custom" && (
                      <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-500 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.03]">
                        <GripVertical className="w-3.5 h-3.5" />
                        Drag to reorder
                      </div>
                    )}

                    {/* Sort dropdown */}
                    <div className="relative" ref={sortMenuRef}>
                      <button
                        onClick={() => setShowSortMenu((p) => !p)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 text-xs font-semibold transition-all micro-interact"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        {SORT_OPTIONS.find((o) => o.value === favoritesSortBy)?.label || "Sort"}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
                      </button>

                      {showSortMenu && (
                        <div className="absolute top-full right-0 mt-2 z-20 w-48 rounded-2xl border border-white/10 bg-neutral-900/95 shadow-2xl backdrop-blur-xl overflow-hidden">
                          <p className="px-4 pt-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                            Sort by
                          </p>
                          {SORT_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setFavoritesSortBy(opt.value);
                                setShowSortMenu(false);
                              }}
                              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${favoritesSortBy === opt.value ? "text-indigo-400 font-semibold bg-indigo-500/10" : "text-neutral-300 hover:bg-white/5 hover:text-white"}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isBollywoodView && (
              <div className="mb-4">
                <h3 className="text-base font-black text-white">Top Songs</h3>
              </div>
            )}

            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {visibleTracks.map((track, index) => (
                <MusicCard
                  key={track._id}
                  track={track}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  playTrack={playTrack}
                  playableTracks={playableVisibleTracks}
                  handleOpenPlaylist={handleOpenPlaylist}
                  // drag-and-drop only in favorites custom sort mode
                  draggable={showFavoritesOnly && favoritesSortBy === "custom"}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  isDragOver={dragOverIndex === index}
                />
              ))}
            </section>

            {isBollywoodView && bollywoodAlbums.length > 0 && (
              <>
                <div className="mt-12 mb-4 flex items-end justify-between gap-4">
                  <h3 className="text-base font-black text-white">
                    Albums &amp; Playlists
                  </h3>
                </div>

                <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                  {bollywoodAlbums.map((track) => (
                    <MusicCard
                      key={track._id}
                      track={track}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      playTrack={playTrack}
                      playableTracks={playableVisibleTracks}
                      handleOpenPlaylist={handleOpenPlaylist}
                      forceAlbum
                      accent="pink"
                    />
                  ))}
                </section>
              </>
            )}

            {!showFavoritesOnly && (
              <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Music;
