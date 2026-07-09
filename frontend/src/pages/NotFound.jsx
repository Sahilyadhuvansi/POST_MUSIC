import { Link } from "react-router-dom";
import { Music, Home } from "lucide-react";

const NotFound = () => (
  <div className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden">
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-[15%] -right-[10%] w-[42rem] h-[42rem] bg-indigo-600/10 rounded-full blur-[140px] animate-depth-pulse" />
      <div className="absolute -bottom-[15%] -left-[10%] w-[42rem] h-[42rem] bg-pink-600/8 rounded-full blur-[140px] animate-depth-pulse" style={{ animationDelay: "3s" }} />
    </div>

    <div className="relative text-center space-y-8 max-w-md animate-glass-in">
      <div className="flex justify-center">
        <div
          className="p-5 rounded-3xl animate-float"
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          <Music className="w-10 h-10 text-indigo-400" />
        </div>
      </div>

      <div className="space-y-3">
        <h1
          className="text-[8rem] font-black leading-none tracking-tighter text-transparent bg-clip-text"
          style={{ backgroundImage: "linear-gradient(135deg, #818cf8, #a78bfa, #f472b6)" }}
        >
          404
        </h1>
        <p className="text-2xl font-black text-white italic tracking-tight">
          Signal lost
        </p>
        <p
          className="text-sm font-medium uppercase tracking-[0.2em]"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          This frequency doesn&apos;t exist
        </p>
      </div>

      <Link
        to="/music"
        className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
        style={{
          background: "linear-gradient(145deg, rgba(245,245,255,0.95), rgba(215,215,240,0.9))",
          border: "1px solid rgba(255,255,255,0.4)",
          boxShadow: "0 4px 20px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.6)",
          color: "#08080f",
        }}
      >
        <Home className="w-4 h-4" />
        Return to Base
      </Link>
    </div>
  </div>
);

export default NotFound;
