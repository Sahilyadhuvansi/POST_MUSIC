import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useToast } from "../components/ui/Toast";
import { User, Lock, Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";

const inputBase = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.09)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.2)",
};
const inputFocus = {
  border: "1px solid rgba(99,102,241,0.5)",
  boxShadow: "0 0 0 3px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.08)",
};

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (user) navigate("/music", { replace: true });
  }, [user, navigate]);

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
      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[15%] -right-[10%] w-[42rem] h-[42rem] bg-indigo-600/12 rounded-full blur-[140px] animate-depth-pulse" />
        <div className="absolute -bottom-[15%] -left-[10%] w-[42rem] h-[42rem] bg-pink-600/10 rounded-full blur-[140px] animate-depth-pulse" style={{ animationDelay: "3s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20rem] h-[20rem] bg-violet-600/5 rounded-full blur-[100px]" />
      </div>

      {/* Liquid glass card */}
      <div
        className="relative w-full max-w-md rounded-[36px] p-8 md:p-10 animate-glass-in overflow-hidden"
        style={{
          background: "linear-gradient(160deg, rgba(14,14,22,0.8) 0%, rgba(7,7,12,0.88) 100%)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.35), 0 32px 100px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.14)",
        }}
      >
        {/* Top liquid sheen */}
        <div
          className="absolute top-0 left-0 right-0 h-[40%] rounded-t-[36px] pointer-events-none"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.07), transparent)" }}
        />

        {/* Header */}
        <div className="relative text-center mb-10">
          <div className="flex justify-center mb-6">
            <div
              className="relative p-4 rounded-2xl animate-float"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              <Sparkles className="w-8 h-8 text-indigo-400" />
              <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight italic">
            Access{" "}
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #818cf8, #f472b6)" }}
            >
              MusicDiscover
            </span>
          </h2>
          <p
            className="mt-3 text-[10px] font-black uppercase tracking-[0.25em]"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            Enter your credentials
          </p>
        </div>

        {/* Form */}
        <form className="relative space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              htmlFor="login-identifier"
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ml-1"
              style={{ color: "rgba(255,255,255,0.32)" }}
            >
              <User className="w-3 h-3" /> Identity
            </label>
            <input
              id="login-identifier"
              type="text"
              required
              className="w-full rounded-2xl px-5 py-4 text-sm text-white outline-none transition-all duration-300"
              style={inputBase}
              placeholder="Email or Username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              onFocus={(e) => Object.assign(e.currentTarget.style, inputFocus)}
              onBlur={(e) => Object.assign(e.currentTarget.style, inputBase)}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="login-password"
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ml-1"
              style={{ color: "rgba(255,255,255,0.32)" }}
            >
              <Lock className="w-3 h-3" /> Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                className="w-full rounded-2xl px-5 py-4 pr-14 text-sm text-white outline-none transition-all duration-300"
                style={inputBase}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                onFocus={(e) => Object.assign(e.currentTarget.style, inputFocus)}
                onBlur={(e) => Object.assign(e.currentTarget.style, inputBase)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 transition-colors duration-300"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full overflow-hidden rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-[0.18em] transition-all duration-300 hover:brightness-105 active:scale-[0.98] disabled:opacity-40"
            style={{
              background: "linear-gradient(145deg, rgba(245,245,255,0.96), rgba(215,215,240,0.92))",
              border: "1px solid rgba(255,255,255,0.5)",
              boxShadow: "0 4px 20px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
              color: "#08080f",
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              {loading ? "Authenticating…" : "Enter Universe"}
              {!loading && (
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              )}
            </span>
          </button>
        </form>

        <div
          className="relative mt-10 pt-8 text-center"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>
            NEW HERE?{" "}
            <Link
              to="/register"
              className="ml-2 font-black uppercase tracking-widest transition-colors duration-300 hover:text-indigo-400"
              style={{ color: "rgba(255,255,255,0.65)" }}
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
