import { Link } from "react-router-dom";
import { Music, Home } from "lucide-react";

const NotFound = () => (
  <div className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden">
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-[10%] -right-[10%] w-[40rem] h-[40rem] bg-indigo-600/10 rounded-full blur-[160px]" />
      <div className="absolute -bottom-[10%] -left-[10%] w-[40rem] h-[40rem] bg-pink-600/10 rounded-full blur-[160px]" />
    </div>

    <div className="relative text-center space-y-8 max-w-md">
      <div className="flex justify-center">
        <div className="p-5 rounded-3xl glass border border-white/10 shadow-2xl animate-float">
          <Music className="w-10 h-10 text-indigo-400" />
        </div>
      </div>

      <div className="space-y-3">
        <h1 className="text-[8rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 via-violet-400 to-pink-400">
          404
        </h1>
        <p className="text-2xl font-black text-white italic tracking-tight">
          Signal lost
        </p>
        <p className="text-sm text-neutral-500 font-medium uppercase tracking-[0.2em]">
          This frequency doesn't exist
        </p>
      </div>

      <Link
        to="/music"
        className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-black text-sm font-black uppercase tracking-widest hover:bg-neutral-200 active:scale-[0.98] transition-all shadow-[0_12px_40px_rgba(255,255,255,0.15)]"
      >
        <Home className="w-4 h-4" />
        Return to Base
      </Link>
    </div>
  </div>
);

export default NotFound;
