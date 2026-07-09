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
      </div>

      {loadingUniverse ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-[32px] animate-pulse shimmer"
              style={{ border: "1px solid rgba(255,255,255,0.05)" }}
            />
          ))}
        </div>
      ) : universe.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-[40px]"
          style={{
            background: "rgba(255,255,255,0.02)",
            backdropFilter: "blur(16px)",
            border: "1px dashed rgba(255,255,255,0.08)",
          }}
        >
          <Disc className="w-10 h-10 text-neutral-800 mb-4 animate-spin-slow" />
          <p className="text-sm font-bold text-neutral-600 italic">
            Universe is silent. Discover music to start your collection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {universe.map((track) => (
            <div
              key={track._id}
              className="group relative p-4 rounded-[32px] transition-all duration-500 liquid-sheen-on-hover overflow-hidden"
              style={
                currentTrack?._id === track._id
                  ? {
                      background: "rgba(99,102,241,0.1)",
                      border: "1px solid rgba(99,102,241,0.3)",
                      backdropFilter: "blur(20px)",
                      boxShadow: "0 4px 20px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
                    }
                  : {
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      backdropFilter: "blur(20px)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                    }
              }
            >
              <div className="flex items-center gap-5">
                <div className="relative h-14 w-14 rounded-2xl overflow-hidden shadow-2xl shrink-0">
                  <img
                    src={track.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700"
                  />
                  <button
                    onClick={() => playTrack(track, universe)}
                    className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    {currentTrack?._id === track._id && isPlaying ? (
                      <Pause className="w-5 h-5 text-white fill-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    )}
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-black text-white/90 truncate uppercase italic tracking-tight mb-1">
                    {track.title}
                  </h3>
                </div>
                <button
                  onClick={() => handleDeleteTrack(track._id)}
                  className="p-3 rounded-2xl text-neutral-600 hover:text-red-400 transition-all duration-300 opacity-0 group-hover:opacity-100 micro-interact"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
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
