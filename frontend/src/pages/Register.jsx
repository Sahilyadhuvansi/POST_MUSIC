import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useToast } from "../components/ui/Toast";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";

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

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (user) navigate("/music", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      addToast("Passwords do not match. Please verify.", "error");
      return;
    }

    if (!agreeTerms) {
      addToast("Please accept the terms to continue.", "info");
      return;
    }

    setLoading(true);

    const result = await register({ username, email, password });
    if (result.success) {
      addToast("Welcome to MusicDiscover!", "success");
      navigate("/");
    } else {
      addToast(
        result.message || "Registration failed. Frequency sync unstable.",
        "error",
      );
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12 overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[15%] -left-[10%] w-[42rem] h-[42rem] bg-indigo-600/12 rounded-full blur-[140px] animate-depth-pulse" />
        <div className="absolute -bottom-[15%] -right-[10%] w-[42rem] h-[42rem] bg-pink-600/10 rounded-full blur-[140px] animate-depth-pulse" style={{ animationDelay: "3s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[22rem] h-[22rem] bg-violet-600/5 rounded-full blur-[110px]" />
      </div>

      {/* Liquid glass card */}
      <div
        className="relative w-full max-w-lg rounded-[40px] p-8 md:p-12 animate-glass-in overflow-hidden"
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
          className="absolute top-0 left-0 right-0 h-[35%] rounded-t-[40px] pointer-events-none"
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
              <Sparkles className="w-8 h-8 text-pink-400" />
              <div className="absolute inset-0 bg-pink-500/20 blur-2xl rounded-full" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight italic">
            Join{" "}
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
            Create your digital hub
          </p>
        </div>

        <form className="relative grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
          {/* Username */}
          <div className="space-y-2 md:col-span-1">
            <label
              htmlFor="reg-username"
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ml-1"
              style={{ color: "rgba(255,255,255,0.32)" }}
            >
              <User className="w-3 h-3" /> Alias
            </label>
            <input
              id="reg-username"
              type="text"
              required
              className="w-full rounded-2xl px-5 py-4 text-sm text-white outline-none transition-all duration-300"
              style={inputBase}
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              onFocus={(e) => Object.assign(e.currentTarget.style, inputFocus)}
              onBlur={(e) => Object.assign(e.currentTarget.style, inputBase)}
            />
          </div>

          {/* Email */}
          <div className="space-y-2 md:col-span-1">
            <label
              htmlFor="reg-email"
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ml-1"
              style={{ color: "rgba(255,255,255,0.32)" }}
            >
              <Mail className="w-3 h-3" /> Frequency
            </label>
            <input
              id="reg-email"
              type="email"
              required
              className="w-full rounded-2xl px-5 py-4 text-sm text-white outline-none transition-all duration-300"
              style={inputBase}
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              onFocus={(e) => Object.assign(e.currentTarget.style, inputFocus)}
              onBlur={(e) => Object.assign(e.currentTarget.style, inputBase)}
            />
          </div>

          {/* Password */}
          <div className="space-y-2 md:col-span-1">
            <label
              htmlFor="reg-password"
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ml-1"
              style={{ color: "rgba(255,255,255,0.32)" }}
            >
              <Lock className="w-3 h-3" /> Password
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                required
                className="w-full rounded-2xl px-5 py-4 pr-14 text-sm text-white outline-none transition-all duration-300"
                style={inputBase}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
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

          {/* Confirm */}
          <div className="space-y-2 md:col-span-1">
            <label
              htmlFor="reg-confirm"
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] ml-1"
              style={{ color: "rgba(255,255,255,0.32)" }}
            >
              <ShieldCheck className="w-3 h-3" /> Verifier
            </label>
            <input
              id="reg-confirm"
              type={showPassword ? "text" : "password"}
              required
              className="w-full rounded-2xl px-5 py-4 text-sm text-white outline-none transition-all duration-300"
              style={inputBase}
              placeholder="Confirm Key"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              onFocus={(e) => Object.assign(e.currentTarget.style, inputFocus)}
              onBlur={(e) => Object.assign(e.currentTarget.style, inputBase)}
            />
          </div>

          <div className="md:col-span-2 px-2">
            <p
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              Minimum 8 characters with at least one uppercase letter required.
            </p>
          </div>

          {/* Terms toggle */}
          <div
            className="md:col-span-2 flex items-center gap-4 rounded-[20px] p-4 transition-all duration-300"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <button
              type="button"
              onClick={() => setAgreeTerms(!agreeTerms)}
              className="relative flex-shrink-0 w-10 h-5 rounded-full transition-all duration-400"
              style={{
                background: agreeTerms
                  ? "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(168,85,247,0.85))"
                  : "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: agreeTerms ? "0 2px 8px rgba(99,102,241,0.4)" : "none",
              }}
            >
              <div
                className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300"
                style={{ transform: agreeTerms ? "translateX(22px)" : "translateX(3px)" }}
              />
            </button>
            <p
              className="text-[10px] font-bold uppercase tracking-widest leading-relaxed"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Accept Universe{" "}
              <Link to="#" className="text-white/70 hover:text-white transition-colors">
                Guidelines
              </Link>{" "}
              &{" "}
              <Link to="#" className="text-white/70 hover:text-white transition-colors">
                Privacy
              </Link>
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !agreeTerms}
            className="md:col-span-2 group relative overflow-hidden rounded-2xl px-6 py-5 text-sm font-black uppercase tracking-[0.18em] transition-all duration-300 hover:brightness-105 active:scale-[0.98] disabled:opacity-30"
            style={{
              background: "linear-gradient(145deg, rgba(245,245,255,0.96), rgba(215,215,240,0.92))",
              border: "1px solid rgba(255,255,255,0.5)",
              boxShadow: "0 4px 20px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
              color: "#08080f",
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              {loading ? "Initializing…" : "Register Identity"}
              {!loading && (
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              )}
            </span>
          </button>
        </form>

        <div
          className="relative mt-12 pt-8 text-center"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>
            ALREADY HAVE A HUB?{" "}
            <Link
              to="/login"
              className="ml-2 font-black uppercase tracking-widest transition-colors duration-300 hover:text-indigo-400"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
