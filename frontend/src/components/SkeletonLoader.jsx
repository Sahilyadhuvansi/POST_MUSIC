export function ProfileSkeleton() {
  return (
    <div className="space-y-12 max-w-[1400px] mx-auto px-6 pt-16">
      <div className="flex flex-col items-center gap-6">
        <div className="w-32 h-32 rounded-[40px] bg-white/5 shimmer" />
        <div className="space-y-3 w-full max-w-xs">
          <div className="h-8 bg-white/5 rounded-2xl w-full shimmer" />
          <div className="h-4 bg-white/5 rounded-xl w-1/2 mx-auto shimmer" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-white/5 rounded-[32px] shimmer"
          />
        ))}
      </div>
    </div>
  );
}

export function MusicSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="w-full aspect-square bg-white/5 rounded-[32px] shimmer" />
          <div className="space-y-2">
            <div className="h-4 bg-white/5 rounded-full w-3/4 shimmer" />
            <div className="h-3 bg-white/5 rounded-full w-1/2 shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
