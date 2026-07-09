const skeletonStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.05)",
};

export function ProfileSkeleton() {
  return (
    <div className="space-y-12 max-w-[1400px] mx-auto px-6 pt-16">
      <div className="flex flex-col items-center gap-6">
        <div className="w-32 h-32 rounded-full shimmer" style={skeletonStyle} />
        <div className="space-y-3 w-full max-w-xs">
          <div className="h-8 rounded-2xl w-full shimmer" style={skeletonStyle} />
          <div className="h-4 rounded-xl w-1/2 mx-auto shimmer" style={skeletonStyle} />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-[32px] shimmer"
            style={skeletonStyle}
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
          <div
            className="w-full aspect-square rounded-[26px] shimmer"
            style={skeletonStyle}
          />
          <div className="space-y-2 px-1">
            <div className="h-4 rounded-full w-3/4 shimmer" style={skeletonStyle} />
            <div className="h-3 rounded-full w-1/2 shimmer" style={skeletonStyle} />
          </div>
        </div>
      ))}
    </div>
  );
}
