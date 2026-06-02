import { Music, Disc, Trash2, Play, Pause } from "lucide-react";

const ProfileUniverseSection = ({
  isEditing,
  universe,
  loadingUniverse,
  currentTrack,
  isPlaying,
  playTrack,
  handleDeleteTrack,
}) => {
  if (isEditing) return null;

  return (
    <div className="mt-16 sm:mt-24">
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-2xl glass border-white/10 text-indigo-400 shadow-xl">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white italic tracking-tighter">
              Nexus Universe
            </h2>
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mt-1">
              Your personal resonance frequency
            </p>
          </div>
        </div>
        <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em]">
          {universe.length} Saved
        </p>
      </div>

      {loadingUniverse ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-[32px] glass-dark animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : universe.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-[40px] glass border-white/5 border-dashed">
          <Disc className="w-10 h-10 text-neutral-800 mb-4 animate-spin-slow" />
          <p className="text-sm font-bold text-neutral-500 italic">
            Universe is silent. Discover music to start your collection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {universe.map((track) => (
            <div
              key={track._id}
              className={`group relative p-4 rounded-[32px] border transition-all duration-500 ${
                currentTrack?._id === track._id
                  ? "bg-indigo-500/10 border-indigo-500/30"
                  : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
              }`}
            >
              <div className="flex items-center gap-5">
                <div className="relative h-14 w-14 rounded-2xl overflow-hidden shadow-2xl shrink-0">
                  <img
                    src={track.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700"
                  />
                  <button
                    onClick={() => playTrack(track, universe)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {currentTrack?._id === track._id && isPlaying ? (
                      <Pause className="w-5 h-5 text-white fill-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    )}
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-black text-white truncate uppercase italic tracking-tight mb-1">
                    {track.title}
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                    Captured Vibe
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteTrack(track._id)}
                  className="p-3 rounded-2xl border border-white/5 bg-white/5 hover:bg-red-500/20 text-neutral-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileUniverseSection;
