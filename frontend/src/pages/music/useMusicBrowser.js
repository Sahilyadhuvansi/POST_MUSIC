import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useMusic } from "../../features/music/MusicContext";
import { GENRES } from "./constants";
import {
  searchYouTubeContent,
  fetchPlaylistTracks,
  prefetchYouTubeSearches,
} from "./youtube.service";

export const useMusicBrowser = ({ addToast }) => {
  const {
    savedByUrl,
    savingFavoriteId,
    toggleFavorite,
    getPlayCount,
  } = useMusic();

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [playlistMeta, setPlaylistMeta] = useState(null);
  const [bollywoodAlbums, setBollywoodAlbums] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // ─── Favorites Sort & Order ───────────────────────────────────────────────
  const [favoritesSortBy, setFavoritesSortBy] = useState(() =>
    localStorage.getItem("favorites_sort") || "recent",
  );
  const [customFavoritesOrder, setCustomFavoritesOrder] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("favorites_custom_order") || "[]");
    } catch {
      return [];
    }
  });

  const updateSortBy = useCallback((sort) => {
    setFavoritesSortBy(sort);
    localStorage.setItem("favorites_sort", sort);
  }, []);

  const reorderFavorites = useCallback((newOrder) => {
    setCustomFavoritesOrder(newOrder);
    localStorage.setItem("favorites_custom_order", JSON.stringify(newOrder));
  }, []);

  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const loadMoreRef = useRef(null);

  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("music_recent_searches") || "[]");
    } catch {
      return [];
    }
  });

  const saveSearch = useCallback((term) => {
    if (!term || term.length < 3) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter(
        (s) => s.toLowerCase() !== term.toLowerCase(),
      );
      const next = [term, ...filtered].slice(0, 6);
      localStorage.setItem("music_recent_searches", JSON.stringify(next));
      return next;
    });
  }, []);

  const runSearch = useCallback(
    async (term, options = {}) => {
      const { showBollywoodSections = false } = options;
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      setTracks([]);
      setBollywoodAlbums([]);
      setNextPageToken(null);
      setHasMore(true);

      try {
        if (showBollywoodSections) {
          const [songRes, albumRes] = await Promise.all([
            searchYouTubeContent(term, abortRef.current.signal, {
              type: "video",
              maxResults: "24",
            }),
            searchYouTubeContent(
              "bollywood full album playlist jukebox",
              abortRef.current.signal,
              { type: "playlist", maxResults: "12" },
            ),
          ]);
          setTracks(songRes.tracks || []);
          setBollywoodAlbums(albumRes.tracks || []);
          if (!songRes.tracks?.length && !albumRes.tracks?.length) {
            addToast("No results found. Try a different search.", "info");
          }
        } else {
          const response = await searchYouTubeContent(
            term,
            abortRef.current.signal,
            { ...options, maxResults: "20" },
          );
          setTracks(response.tracks || []);
          setNextPageToken(response.nextPageToken || null);
          if (!response.tracks?.length) {
            addToast("No results found. Try a different search.", "info");
          }
        }
        setPlaylistMeta(null);
      } catch (err) {
        if (err.name === "AbortError" || err.name === "CanceledError") return;
        if (err.message === "quota") {
          addToast("YouTube daily quota reached. Try again tomorrow.", "error");
        } else if (err.message?.includes("VITE_YOUTUBE_API_KEY")) {
          setApiKeyMissing(true);
        } else {
          addToast("Search failed. Check your connection.", "error");
        }
      } finally {
        setLoading(false);
      }
    },
    [addToast],
  );

  const loadMoreInFlightRef = useRef(false);
  const lastLoadedTokenRef = useRef(null);

  const loadMore = useCallback(async () => {
    if (showFavoritesOnly) return;
    if (!hasMore) return;
    if (!nextPageToken) return;
    if (loadMoreInFlightRef.current) return;

    loadMoreInFlightRef.current = true;
    setIsLoadingMore(true);

    try {
      if (lastLoadedTokenRef.current === nextPageToken) return;
      lastLoadedTokenRef.current = nextPageToken;

      const term = searchQuery.trim() || GENRES[activeGenre].term;
      const response = await searchYouTubeContent(term, undefined, {
        type: "video",
        maxResults: "20",
        pageToken: nextPageToken,
      });

      const incoming = Array.isArray(response?.tracks) ? response.tracks : [];

      if (incoming.length > 0) {
        setTracks((prev) => {
          const seen = new Set((prev || []).map((t) => t?._id).filter(Boolean));
          const deduped = incoming.filter(
            (t) => t && t._id && !seen.has(t._id),
          );
          return [...prev, ...deduped];
        });
      }

      const nextToken = response?.nextPageToken || null;
      if (incoming.length === 0 || !nextToken) {
        setHasMore(false);
        setNextPageToken(null);
      } else {
        setNextPageToken(nextToken);
      }
    } catch (err) {
      if (err?.message === "quota") addToast("YouTube quota reached.", "error");
      setHasMore(false);
      setNextPageToken(null);
    } finally {
      loadMoreInFlightRef.current = false;
      setIsLoadingMore(false);
    }
  }, [showFavoritesOnly, hasMore, nextPageToken, searchQuery, activeGenre, addToast]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const canObserve =
      !showFavoritesOnly && hasMore && !isLoadingMore && !!nextPageToken;
    if (!canObserve) return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (cancelled) return;
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "800px 0px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [loadMore, showFavoritesOnly, hasMore, isLoadingMore, nextPageToken]);

  useEffect(() => {
    runSearch(GENRES[0].term, { type: "video", maxResults: "30" });

    if (import.meta.env.VITE_YOUTUBE_API_KEY) {
      const hotQueries = [
        GENRES[0]?.term,
        GENRES.find((g) => g.label === "Trending")?.term,
        "bollywood music",
        "trending music",
      ].filter(Boolean);

      const timer = setTimeout(() => {
        prefetchYouTubeSearches(hotQueries, { type: "video", maxResults: "24" }).catch(
          () => {},
        );
      }, 0);

      return () => {
        clearTimeout(timer);
        abortRef.current?.abort();
      };
    }

    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const term = searchQuery.trim();
    if (term.length < 3) {
      if (isSearching) {
        setIsSearching(false);
        const label = GENRES[activeGenre]?.label;
        if (label === "Bollywood") {
          runSearch(GENRES[activeGenre].term, { showBollywoodSections: true });
        } else if (label === "Trending") {
          runSearch(GENRES[activeGenre].term, { type: "video", maxResults: "30" });
        } else {
          runSearch(GENRES[activeGenre].term);
        }
      }
      return;
    }

    setIsSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveSearch(searchQuery.trim());
      runSearch(searchQuery.trim());
    }, 500);

    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleGenreClick = useCallback(
    (idx) => {
      setActiveGenre(idx);
      setSearchQuery("");
      setIsSearching(false);
      setPlaylistMeta(null);
      setShowFavoritesOnly(false);
      const label = GENRES[idx].label;
      if (label === "Bollywood") {
        runSearch(GENRES[idx].term, { showBollywoodSections: true });
        return;
      }
      if (label === "Trending") {
        runSearch(GENRES[idx].term, { type: "video", maxResults: "30" });
        return;
      }
      runSearch(GENRES[idx].term);
    },
    [runSearch],
  );

  const handleOpenPlaylist = useCallback(
    async (playlist) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      try {
        const playlistTracks = await fetchPlaylistTracks(
          playlist,
          abortRef.current.signal,
        );
        setTracks(playlistTracks);
        setPlaylistMeta({
          title: playlist.title,
          artist: playlist.artist?.username,
        });
        if (!playlistTracks.length) {
          addToast("No playable tracks found in this album/playlist.", "info");
        }
      } catch (err) {
        if (err.name === "AbortError" || err.name === "CanceledError") return;
        if (err.message === "quota") {
          addToast("YouTube daily quota reached. Try again tomorrow.", "error");
        } else {
          addToast("Could not open album right now.", "error");
        }
      } finally {
        setLoading(false);
      }
    },
    [addToast],
  );

  // ─── Favorites list — sorted & ordered ────────────────────────────────────
  const favoriteTracks = useMemo(() => {
    const items = Object.values(savedByUrl).map((item) => ({
      _id: item._id || `fav_${item.youtubeUrl}`,
      title: item.title,
      artist: {
        username:
          item.artist?.username || item.artist?.name || item.artistName || "Saved",
      },
      thumbnail: item.thumbnailUrl || item.thumbnail,
      youtubeUrl: item.youtubeUrl,
      isPlaylist: false,
    }));

    if (favoritesSortBy === "name") {
      return [...items].sort((a, b) =>
        (a.title || "").localeCompare(b.title || ""),
      );
    }
    if (favoritesSortBy === "artist") {
      return [...items].sort((a, b) =>
        (a.artist?.username || "").localeCompare(b.artist?.username || ""),
      );
    }
    if (favoritesSortBy === "most_played") {
      return [...items].sort(
        (a, b) => getPlayCount(b.youtubeUrl) - getPlayCount(a.youtubeUrl),
      );
    }
    if (favoritesSortBy === "custom" && customFavoritesOrder.length > 0) {
      const orderMap = Object.fromEntries(
        customFavoritesOrder.map((id, idx) => [id, idx]),
      );
      return [...items].sort(
        (a, b) =>
          (orderMap[a._id] ?? 999) - (orderMap[b._id] ?? 999),
      );
    }
    // 'recent' — default insertion order
    return items;
  }, [savedByUrl, favoritesSortBy, customFavoritesOrder, getPlayCount]);

  const visibleTracks = useMemo(
    () => (showFavoritesOnly ? favoriteTracks : tracks),
    [showFavoritesOnly, favoriteTracks, tracks],
  );

  const playableVisibleTracks = useMemo(
    () => visibleTracks.filter((t) => !t.isPlaylist && t.youtubeUrl),
    [visibleTracks],
  );

  const isBollywoodView =
    !showFavoritesOnly &&
    !isSearching &&
    GENRES[activeGenre]?.label === "Bollywood" &&
    !playlistMeta;

  const activeGenreLabel = showFavoritesOnly
    ? "Favorites"
    : GENRES[activeGenre]?.label || "Discover";

  return {
    tracks,
    loading,
    activeGenre,
    searchQuery,
    setSearchQuery,
    isSearching,
    apiKeyMissing,
    // favorites (from context)
    savedByUrl,
    savingId: savingFavoriteId,
    toggleFavorite,
    playlistMeta,
    setPlaylistMeta,
    bollywoodAlbums,
    showFavoritesOnly,
    setShowFavoritesOnly,
    recentSearches,
    runSearch,
    handleGenreClick,
    handleOpenPlaylist,
    visibleTracks,
    playableVisibleTracks,
    isBollywoodView,
    activeGenreLabel,
    loadMoreRef,
    // favorites sort & order
    favoritesSortBy,
    setFavoritesSortBy: updateSortBy,
    reorderFavorites,
    customFavoritesOrder,
    favoriteTracks,
  };
};
