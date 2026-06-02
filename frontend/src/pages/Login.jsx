import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useToast } from "../components/ui/Toast";
import { User, Lock, Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login({
      email: identifier,
      username: identifier,
      password,
    });

    if (result.success) {
      addToast("Welcome back to the universe.", "success");
      navigate("/");
    } else {
      addToast(
        result.message || "Authentication failed. Check your credentials.",
        "error",
      );
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[40rem] h-[40rem] bg-indigo-600/10 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40rem] h-[40rem] bg-pink-600/10 rounded-full blur-[160px] animate-pulse delay-1000" />
      </div>

      <div className="relative w-full max-w-md glass rounded-[32px] p-8 md:p-10 shadow-[0_32px_128px_rgba(0,0,0,0.8)] border-white/5">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="relative p-4 rounded-2xl bg-white/5 border border-white/10 shadow-2xl animate-float">
              <Sparkles className="w-8 h-8 text-indigo-400" />
              <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight italic">
            Access{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
              MusicDiscover
            </span>
          </h2>
          <p className="mt-3 text-sm text-neutral-500 font-medium uppercase tracking-widest">
            Enter your credentials
          </p>
        </div>

        {/* Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Identity */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 ml-1 flex items-center gap-2">
              <User className="w-3 h-3" /> Identity
            </label>
            <input
              type="text"
              required
              className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-sm text-white placeholder-neutral-700 outline-none transition-all focus:border-indigo-500/50 hover:bg-white/[0.08]"
              placeholder="Email or Username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
            />
          </div>

          {/* Key */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 ml-1 flex items-center gap-2">
              <Lock className="w-3 h-3" /> Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 pr-14 text-sm text-white placeholder-neutral-700 outline-none transition-all focus:border-indigo-500/50 hover:bg-white/[0.08]"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-neutral-600 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full overflow-hidden rounded-2xl bg-white px-6 py-4.5 text-sm font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-50"
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              {loading ? "Authenticating..." : "Enter Universe"}
              {!loading && (
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              )}
            </div>
          </button>
        </form>

        {/* Navigation Footer */}
        <div className="mt-10 pt-8 border-t border-white/5 text-center">
          <p className="text-xs text-neutral-500 font-medium">
            NEW HERE?{" "}
            <Link
              to="/register"
              className="ml-2 font-black text-white hover:text-indigo-400 transition-colors uppercase tracking-widest"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
