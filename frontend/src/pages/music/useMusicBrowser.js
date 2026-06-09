import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import api from "../../services/api";
import { GENRES } from "./constants";
import {
  searchYouTubeContent,
  fetchPlaylistTracks,
  prefetchYouTubeSearches,
} from "./youtube.service";
import { normalizeYoutubeUrl } from "../../utils/youtube";

export const useMusicBrowser = ({ addToast }) => {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [playlistMeta, setPlaylistMeta] = useState(null);
  const [savedByUrl, setSavedByUrl] = useState({});
  const [bollywoodAlbums, setBollywoodAlbums] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const debounceRef = useRef(null);
  const abortRef = useRef(null);

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

  const hydrateSavedMap = useCallback(async () => {
    try {
      const res = await api.get("/music/mine");
      const map = (res.data?.musics || []).reduce((acc, item) => {
        if (item.youtubeUrl) {
          const normalizedUrl = normalizeYoutubeUrl(item.youtubeUrl);
          if (normalizedUrl) {
            acc[normalizedUrl] = {
              ...item,
              youtubeUrl: normalizedUrl,
              _id: item._id || item.id,
            };
          }
        }
        return acc;
      }, {});
      setSavedByUrl(map);
    } catch {
      // Silent fail for guests / auth issues
    }
  }, []);

  const toggleFavorite = useCallback(
    async (track) => {
      if (!track?.youtubeUrl) return;
      setSavingId(track._id);
      try {
        const normalizedUrl = normalizeYoutubeUrl(track.youtubeUrl);
        if (!normalizedUrl) {
          addToast("Invalid track URL", "error");
          setSavingId(null);
          return;
        }

        const existing = savedByUrl[normalizedUrl];

        if (existing?._id) {
          await api.delete(`/music/${existing._id}`);
          setSavedByUrl((prev) => {
            const next = { ...prev };
            delete next[normalizedUrl];
            return next;
          });
          addToast("Removed from favorites", "info");
          return;
        }

        const res = await api.post("/music", {
          title: track.title,
          youtubeUrl: normalizedUrl,
          thumbnailUrl: track.thumbnail,
        });

        const saved = res.data?.music;
        if (saved?.youtubeUrl) {
          const savedNormalizedUrl = normalizeYoutubeUrl(saved.youtubeUrl);
          if (savedNormalizedUrl) {
            setSavedByUrl((prev) => ({
              ...prev,
              [savedNormalizedUrl]: {
                ...saved,
                youtubeUrl: savedNormalizedUrl,
                _id: saved._id || saved.id,
              },
            }));
          }
        }

        addToast("Added to favorites", "success");
      } catch (err) {
        addToast(err.response?.data?.error || "Failed to save track", "error");
      } finally {
        setSavingId(null);
      }
    },
    [addToast, savedByUrl],
  );

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
              {
                type: "playlist",
                maxResults: "12",
              },
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
        console.error("Search failure:", err);
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

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !nextPageToken || !hasMore || showFavoritesOnly)
      return;

    setIsLoadingMore(true);
    try {
      const term = searchQuery.trim() || GENRES[activeGenre].term;
      const response = await searchYouTubeContent(term, undefined, {
        type: "video",
        maxResults: "20",
        pageToken: nextPageToken,
      });

      if (response.tracks?.length) {
        setTracks((prev) => [...prev, ...response.tracks]);
        setNextPageToken(response.nextPageToken || null);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      if (err.message === "quota") {
        addToast("YouTube quota reached.", "error");
        setHasMore(false);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoadingMore,
    nextPageToken,
    hasMore,
    showFavoritesOnly,
    searchQuery,
    activeGenre,
    addToast,
  ]);

  useEffect(() => {
    const handleScroll = () => {
      if (showFavoritesOnly || isLoadingMore || !nextPageToken) return;
      const { scrollHeight, scrollTop, clientHeight } =
        document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight * 0.85) {
        loadMore();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMore, showFavoritesOnly, isLoadingMore, nextPageToken]);

  useEffect(() => {
    runSearch(GENRES[0].term, { type: "video", maxResults: "30" });
    hydrateSavedMap();

    if (import.meta.env.VITE_YOUTUBE_API_KEY) {
      const hotQueries = [
        GENRES[0]?.term,
        GENRES.find((genre) => genre.label === "Trending")?.term,
        "bollywood music",
        "trending music",
      ].filter(Boolean);

      const timer = setTimeout(() => {
        prefetchYouTubeSearches(hotQueries, {
          type: "video",
          maxResults: "24",
        }).catch(() => {});
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
        const activeLabel = GENRES[activeGenre]?.label;
        const isTrending = activeLabel === "Trending";
        const isBollywood = activeLabel === "Bollywood";

        if (isBollywood) {
          runSearch(GENRES[activeGenre].term, { showBollywoodSections: true });
        } else if (isTrending) {
          runSearch(GENRES[activeGenre].term, {
            type: "video",
            maxResults: "30",
          });
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

  const favoriteTracks = useMemo(
    () =>
      Object.values(savedByUrl).map((item) => ({
        _id: item._id || `fav_${item.youtubeUrl}`,
        title: item.title,
        artist: {
          username:
            item.artist?.username ||
            item.artist?.name ||
            item.artistName ||
            "Saved",
        },
        thumbnail: item.thumbnailUrl || item.thumbnail,
        youtubeUrl: item.youtubeUrl,
        isPlaylist: false,
      })),
    [savedByUrl],
  );

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
    savingId,
    playlistMeta,
    setPlaylistMeta,
    savedByUrl,
    bollywoodAlbums,
    showFavoritesOnly,
    setShowFavoritesOnly,
    recentSearches,
    runSearch,
    toggleFavorite,
    handleGenreClick,
    handleOpenPlaylist,
    visibleTracks,
    playableVisibleTracks,
    isBollywoodView,
    activeGenreLabel,
  };
};
