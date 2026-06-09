import { useEffect, useMemo } from "react";
import { useMusic } from "../../features/music/MusicContext";
import { useLocation } from "react-router-dom";
import { useToast } from "../../components/ui/Toast";
import { Disc } from "lucide-react";
import { MusicSkeleton } from "../../components/SkeletonLoader";
import MusicCard from "./MusicCard";
import ApiKeyRequired from "./ApiKeyRequired";
import MusicBrowseControls from "./MusicBrowseControls";
import { useMusicBrowser } from "./useMusicBrowser";

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
    savingId,
    playlistMeta,
    setPlaylistMeta,
    savedByUrl,
    bollywoodAlbums,
    showFavoritesOnly,
    setShowFavoritesOnly,
    runSearch,
    toggleFavorite,
    handleGenreClick,
    handleOpenPlaylist,
    visibleTracks,
    playableVisibleTracks,
    isBollywoodView,
    activeGenreLabel,
    loadMoreRef,
  } = useMusicBrowser({ addToast });

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

  if (apiKeyMissing) {
    return <ApiKeyRequired />;
  }

  return (
    <div className="min-h-screen pb-32">
      <div className="mx-auto max-w-[1400px] px-6 pt-16">
        {/* Hero Section */}
        {!isSearching && !playlistMeta && featuredTrack && (
          <div className="relative mb-16 h-[400px] w-full overflow-hidden rounded-[40px] group">
            <img
              src={featuredTrack.thumbnail}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-40 blur-sm transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-10 sm:p-14">
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
                    {isSearching ? `Search · ${searchQuery}` : activeGenreLabel}
                  </h2>
                </div>
              </div>
            )}

            {isBollywoodView && (
              <div className="mb-4">
                <h3 className="text-base font-black text-white">Top Songs</h3>
              </div>
            )}

            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {visibleTracks.map((track) => (
                <MusicCard
                  key={track._id}
                  track={track}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  playTrack={playTrack}
                  playableTracks={playableVisibleTracks}
                  handleOpenPlaylist={handleOpenPlaylist}
                  savedByUrl={savedByUrl}
                  savingId={savingId}
                  toggleFavorite={toggleFavorite}
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
                      savedByUrl={savedByUrl}
                      savingId={savingId}
                      toggleFavorite={toggleFavorite}
                      forceAlbum
                      accent="pink"
                    />
                  ))}
                </section>
              </>
            )}

            {/* IntersectionObserver sentinel (load more pagination) */}
            {!showFavoritesOnly && (
              <div
                ref={loadMoreRef}
                className="h-1 w-full"
                aria-hidden="true"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Music;
