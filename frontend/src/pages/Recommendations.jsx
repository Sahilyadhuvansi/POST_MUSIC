import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Sparkles,
  Music,
  TrendingUp,
  Zap,
  Radio,
  Play,
  Headphones,
  Disc,
} from "lucide-react";
import api from "../services/api";
import { useToast } from "../components/ui/Toast";
import { useMusic } from "../features/music/MusicContext";

const AINexus = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState("");
  const { addToast } = useToast();
  const { playTrack } = useMusic();
  const abortRef = useRef(null);

  const fetchRecommendations = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    try {
      setLoading(true);
      const response = await api.get("/ai/recommendations", {
        params: { limit: 10, mood: mood || undefined },
        signal: abortRef.current.signal,
      });

      if (response.data.success) {
        setRecommendations(response.data.data);
      }
    } catch (error) {
      if (error.name === "AbortError" || error.name === "CanceledError") return;
      addToast(
        error.response?.data?.error ||
          "AI uplink failed. Could not sync with Nexus.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [mood, addToast]);

  useEffect(() => {
    fetchRecommendations();
    return () => abortRef.current?.abort();
  }, [fetchRecommendations]);

  const moods = useMemo(() => [
    { id: "chill", label: "Equilibrium", icon: <Radio className="w-4 h-4" /> },
    { id: "energetic", label: "Hyperdrive", icon: <Zap className="w-4 h-4" /> },
    {
      id: "focus",
      label: "Singularity",
      icon: <TrendingUp className="w-4 h-4" />,
    },
    { id: "happy", label: "Euphoria", icon: <Sparkles className="w-4 h-4" /> },
    {
      id: "sad",
      label: "Melancholy",
      icon: <Headphones className="w-4 h-4" />,
    },
  ], []);

  return (
    <div className="mx-auto max-w-[1400px] px-6 pt-16 pb-24 min-h-screen">
      {/* Nexus Header */}
      <div className="mb-20 border-b border-white/5 pb-10 flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl glass border-white/10 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500">
              Neural Sync
            </p>
          </div>
          <h1 className="text-6xl font-black text-white italic tracking-tighter">
            AI
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
              Nexus
            </span>
          </h1>
          <p className="text-sm font-medium text-neutral-500 uppercase tracking-[0.2em] opacity-60">
            Architectural music picks tailored to your current frequency
          </p>
        </div>
      </div>

      {/* Mood Matrix */}
      <div className="mb-12">
        <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-6 px-2">
          Frequency Filter
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setMood("")}
            className={`px-8 py-4 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all duration-300 border ${
              mood === ""
                ? "bg-white text-black border-white shadow-[0_12px_40px_rgba(255,255,255,0.2)] scale-105"
                : "glass border-white/5 text-neutral-500 hover:text-white hover:bg-white/5"
            }`}
          >
            Universal
          </button>
          {moods.map((m) => (
            <button
              key={m.id}
              onClick={() => setMood(m.id)}
              className={`flex items-center gap-3 px-8 py-4 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all duration-300 border ${
                mood === m.id
                  ? "bg-indigo-500 text-white border-indigo-500 shadow-[0_12px_40px_rgba(79,70,229,0.3)] scale-105"
                  : "glass border-white/5 text-neutral-500 hover:text-white hover:bg-white/5"
              }`}
            >
              {m.icon}
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Output */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse glass-dark h-32 rounded-[32px] border border-white/5"
            />
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 rounded-[48px] glass border-white/5">
          <div className="relative mb-8">
            <Disc className="w-16 h-16 text-neutral-800 animate-spin-slow" />
            <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full" />
          </div>
          <p className="text-xl font-bold text-neutral-400 italic mb-2">
            Nexus is silent
          </p>
          <p className="text-xs font-black text-neutral-600 uppercase tracking-[0.2em]">
            Try adjusting your search frequency
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-enter">
          {recommendations.map((music) => (
            <div
              key={music._id}
              className="group relative glass-dark border border-white/5 rounded-[40px] p-6 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_48px_128px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-center gap-6">
                {/* Visual Identity */}
                <div className="relative h-24 w-24 rounded-[32px] overflow-hidden shadow-2xl shrink-0 group-hover:rotate-3 transition-transform duration-700">
                  {music.thumbnailUrl || music.thumbnail ? (
                    <img
                      src={music.thumbnailUrl || music.thumbnail}
                      alt=""
                      className="h-full w-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all"
                    />
                  ) : (
                    <div className="h-full w-full bg-neutral-900 flex items-center justify-center">
                      <Music className="w-8 h-8 text-neutral-700" />
                    </div>
                  )}
                  <button
                    onClick={() => playTrack(music, recommendations)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Play className="w-8 h-8 text-white fill-white" />
                  </button>
                </div>

                {/* Intel */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5 overflow-hidden">
                    <h3 className="font-black text-xl text-white italic truncate tracking-tight">
                      {music.title}
                    </h3>
                    <div className="px-2.5 py-1 rounded-lg glass border-white/5 text-[8px] font-black uppercase text-indigo-400 tracking-widest shrink-0">
                      {music.genre || "Audio Track"}
                    </div>
                  </div>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">
                    Architect:{" "}
                    <span className="text-white">
                      @{music.artist?.username || "unknown-artist"}
                    </span>
                  </p>

                  {music.recommendationReason && (
                    <div className="flex items-center gap-3 text-[9px] font-black text-indigo-400 glass px-4 py-2.5 rounded-2xl border-white/10 uppercase tracking-widest w-fit group-hover:bg-indigo-500 group-hover:text-white transition-all">
                      <Sparkles className="w-3.5 h-3.5" />
                      {music.recommendationReason}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => playTrack(music, recommendations)}
                  className="p-4 rounded-full glass border-white/5 text-neutral-500 hover:text-white hover:bg-white/10 transition-all shadow-xl active:scale-90"
                >
                  <Play className="w-5 h-5 fill-current" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AINexus;
