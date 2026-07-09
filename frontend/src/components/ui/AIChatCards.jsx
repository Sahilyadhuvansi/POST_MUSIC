import { Play, Music as MusicIcon } from "lucide-react";
import { useMusic } from "../../features/music/MusicContext";

export const SongCard = ({ song }) => {
  const { playTrack } = useMusic();

  const handlePlay = (e) => {
    e.stopPropagation();
    if (!song.youtubeUrl) return;
    const track = { _id: song.id || `ai_${song.title}`, title: song.title, youtubeUrl: song.youtubeUrl, thumbnailUrl: song.thumbnailUrl || null };
    playTrack(track, [track]);
  };

  return (
    <div
      className="group my-2 overflow-hidden rounded-2xl transition-all duration-300"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-3 p-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <MusicIcon className="w-4 h-4 text-neutral-500 group-hover:text-pink-400 transition-colors duration-300" />
        </div>

        <p className="flex-1 min-w-0 text-[11px] font-bold text-white/80 tracking-wider uppercase truncate italic">
          {song.title}
        </p>

        <button
          onClick={handlePlay}
          className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 hover:scale-110 active:scale-95"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
          aria-label={`Play ${song.title}`}
        >
          <Play className="w-3 h-3 fill-current text-white/75" />
        </button>
      </div>
    </div>
  );
};

export const EmptyStateCard = ({ message }) => (
  <div
    className="my-3 p-5 rounded-2xl text-center"
    style={{
      background: "rgba(255,255,255,0.03)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}
  >
    <MusicIcon className="w-6 h-6 text-neutral-700 mx-auto mb-2" />
    <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest italic">
      {message || "Nothing found"}
    </p>
  </div>
);
