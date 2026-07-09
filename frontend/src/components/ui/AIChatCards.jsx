import { useNavigate } from "react-router-dom";
import { Play, Music as MusicIcon, User } from "lucide-react";

/**
 * SongCard Component for AI Chat
 * Renders a clickable song preview with audio trigger capability.
 */
export const SongCard = ({ song }) => {
  const navigate = useNavigate();

  const handlePlay = (e) => {
    e.stopPropagation();
    navigate(`/music?play=${song.id}`);
  };

  return (
    <div
      onClick={() => navigate(`/music?select=${song.id}`)}
      className="group relative my-3 overflow-hidden rounded-2xl cursor-pointer animate-fade-in-up transition-all duration-350 liquid-sheen-on-hover"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center gap-3 p-3">
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <MusicIcon className="w-5 h-5 text-neutral-600 group-hover:text-pink-400 transition-colors duration-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[11px] font-black text-white/85 tracking-wider uppercase truncate italic">
            {song.title}
          </h4>
        </div>
        <button
          onClick={handlePlay}
          className="h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 flex-shrink-0"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        >
          <Play className="w-3.5 h-3.5 fill-current text-white/80" />
        </button>
      </div>
    </div>
  );
};

/**
 * EmptyStateCard Component
 * Displays a friendly message when no entities are found.
 */
export const EmptyStateCard = ({ message }) => (
  <div
    className="my-3 p-5 rounded-2xl text-center"
    style={{
      background: "rgba(255,255,255,0.03)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.07)",
    }}
  >
    <div
      className="w-9 h-9 rounded-full mx-auto mb-3 flex items-center justify-center"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <User className="w-4 h-4 text-neutral-700" />
    </div>
    <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest italic">
      {message}
    </p>
  </div>
);
