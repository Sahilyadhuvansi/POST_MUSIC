import { useState } from "react";
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

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();
  const { addToast } = useToast();

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
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40rem] h-[40rem] bg-indigo-600/10 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40rem] h-[40rem] bg-pink-600/10 rounded-full blur-[160px] animate-pulse delay-1000" />
      </div>

      <div className="relative w-full max-w-lg glass rounded-[40px] p-8 md:p-12 shadow-[0_32px_128px_rgba(0,0,0,0.8)] border-white/5">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="relative p-4 rounded-2xl bg-white/5 border border-white/10 shadow-2xl animate-float">
              <Sparkles className="w-8 h-8 text-pink-500" />
              <div className="absolute inset-0 bg-pink-500/20 blur-2xl rounded-full" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight italic">
            Join{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
              MusicDiscover
            </span>
          </h2>
          <p className="mt-3 text-sm text-neutral-500 font-medium uppercase tracking-widest">
            Create your digital hub
          </p>
        </div>

        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          onSubmit={handleSubmit}
        >
          {/* Username */}
          <div className="space-y-2 md:col-span-1">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 ml-1 flex items-center gap-2">
              <User className="w-3 h-3" /> Alias
            </label>
            <input
              type="text"
              required
              className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-sm text-white placeholder-neutral-700 outline-none transition-all focus:border-indigo-500/50 hover:bg-white/[0.08]"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          {/* Email */}
          <div className="space-y-2 md:col-span-1">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 ml-1 flex items-center gap-2">
              <Mail className="w-3 h-3" /> Frequency
            </label>
            <input
              type="email"
              required
              className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-sm text-white placeholder-neutral-700 outline-none transition-all focus:border-indigo-500/50 hover:bg-white/[0.08]"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="space-y-2 md:col-span-1">
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
                autoComplete="new-password"
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

          {/* Confirm */}
          <div className="space-y-2 md:col-span-1">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 ml-1 flex items-center gap-2">
              <ShieldCheck className="w-3 h-3" /> Verifier
            </label>
            <input
              type={showPassword ? "text" : "password"}
              required
              className="w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-sm text-white placeholder-neutral-700 outline-none transition-all focus:border-indigo-500/50 hover:bg-white/[0.08]"
              placeholder="Confirm Key"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="md:col-span-2 px-2">
            <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest">
              Minimum 8 characters with at least one uppercase letter required.
            </p>
          </div>

          {/* Terms */}
          <div className="md:col-span-2 flex items-center gap-4 rounded-[20px] bg-white/[0.02] border border-white/[0.06] p-4 transition-all hover:bg-white/[0.05]">
            <button
              type="button"
              onClick={() => setAgreeTerms(!agreeTerms)}
              className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-all duration-300 ${agreeTerms ? "bg-indigo-500" : "bg-neutral-800"}`}
            >
              <div
                className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${agreeTerms ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest leading-relaxed">
              Accept Universe{" "}
              <Link to="#" className="text-white hover:underline">
                Guidelines
              </Link>{" "}
              &{" "}
              <Link to="#" className="text-white hover:underline">
                Privacy
              </Link>
            </p>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading || !agreeTerms}
            className="md:col-span-2 group relative overflow-hidden rounded-2xl bg-white px-6 py-5 text-sm font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-30"
          >
            <div className="relative z-10 flex items-center justify-center gap-3">
              {loading ? "Initializing..." : "Register Identity"}
              {!loading && (
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              )}
            </div>
          </button>
        </form>

        {/* Navigation Footer */}
        <div className="mt-12 pt-8 border-t border-white/5 text-center">
          <p className="text-xs text-neutral-500 font-medium">
            ALREADY HAVE A HUB?{" "}
            <Link
              to="/login"
              className="ml-2 font-black text-white hover:text-indigo-400 transition-colors uppercase tracking-widest"
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
