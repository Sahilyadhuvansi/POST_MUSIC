import { useNavigate } from "react-router-dom";
import {
  Play,
  Music as MusicIcon,
  User,
} from "lucide-react";

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
      className="group relative my-4 overflow-hidden rounded-3xl glass-dark border border-white/5 p-4 transition-all hover:bg-white/10 hover:border-pink-500/30 cursor-pointer shadow-xl animate-fade-in-up"
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl glass-dark border border-white/10 flex items-center justify-center group-hover:border-pink-500/30 transition-colors">
          <MusicIcon className="w-6 h-6 text-neutral-600 group-hover:text-pink-400 transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[11px] font-black text-white tracking-widest uppercase truncate italic">
            {song.title}
          </h4>
          <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-1">
            {song.artist || "Unknown artist"}
          </p>
        </div>
        <button
          onClick={handlePlay}
          className="h-10 w-10 rounded-xl glass border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all transform active:scale-95"
        >
          <Play className="w-4 h-4 fill-current" />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/5 opacity-60">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
          <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">
            Sonic Waveform
          </span>
        </div>
        <span className="text-[8px] font-black text-neutral-700 uppercase tracking-[0.2em]">
          v1.0 Controller
        </span>
      </div>
    </div>
  );
};

/**
 * EmptyStateCard Component
 * Displays a friendly message when no entities are found.
 */
export const EmptyStateCard = ({ message }) => (
  <div className="my-4 p-6 rounded-3xl glass border border-white/5 text-center animate-pulse">
    <div className="w-10 h-10 rounded-full glass-dark mx-auto mb-4 flex items-center justify-center">
      <User className="w-5 h-5 text-neutral-800" />
    </div>
    <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest italic">
      {message}
    </p>
  </div>
);


