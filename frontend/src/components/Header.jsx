import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { Music, User, LogOut, Menu, X } from "lucide-react";
import { DEFAULT_AVATAR } from "../config";

const NavLink = ({
  to,
  children,
  icon: Icon,
  isStatic = false,
  location,
  onClick,
}) => {
  const active =
    location.pathname === to || (isStatic && location.pathname === "/");
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
        active
          ? "text-white bg-white/12 shadow-[0_2px_12px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.16)] border border-white/12"
          : "text-neutral-400 hover:text-white hover:bg-white/6 border border-transparent hover:border-white/8"
      }`}
      onClick={onClick}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </Link>
  );
};

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "py-3 border-b border-white/[0.06]"
          : "py-5 border-b border-transparent"
      }`}
      style={
        scrolled
          ? {
              background: "rgba(6, 6, 12, 0.72)",
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
            }
          : {}
      }
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 group transition-all duration-300 active:scale-95"
        >
          <div className="relative">
            <div
              className="h-10 w-10 overflow-hidden rounded-full transition-all duration-500 group-hover:rotate-[12deg]"
              style={{
                boxShadow:
                  "0 0 0 1px rgba(168,85,247,0.3), 0 0 20px rgba(168,85,247,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
              }}
            >
              <img
                src="/logo.png"
                alt="Logo"
                className="h-full w-full object-cover rounded-full"
              />
            </div>
            <div className="absolute inset-0 bg-purple-500/15 blur-2xl rounded-full scale-0 group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
          </div>
          <span className="text-xl font-black text-white italic uppercase tracking-tighter">
            Music
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
              Discover
            </span>
          </span>
        </Link>

        {/* Desktop nav pill */}
        <div
          className="hidden md:flex items-center gap-1 p-1 rounded-full"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 2px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <NavLink
            to="/music"
            icon={Music}
            isStatic={true}
            location={location}
            onClick={closeMobile}
          >
            Vibes
          </NavLink>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="p-1 rounded-full transition-all duration-300 hover:scale-105"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="h-9 w-9 rounded-full overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
                  <img
                    src={user.profilePic || DEFAULT_AVATAR}
                    alt={user.username}
                    className="h-full w-full rounded-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-500"
                  />
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-full text-neutral-500 hover:text-white transition-all duration-300 hover:bg-white/5"
                style={{ border: "1px solid transparent" }}
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-3">
              <Link
                to="/login"
                className="px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors duration-300"
              >
                Identify
              </Link>
              <Link
                to="/register"
                className="px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 hover:brightness-110 active:scale-95"
                style={{
                  background:
                    "linear-gradient(145deg, rgba(99,102,241,0.9), rgba(236,72,153,0.8))",
                  border: "1px solid rgba(255,255,255,0.18)",
                  boxShadow:
                    "0 4px 16px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
                  color: "white",
                }}
              >
                Deploy Hub
              </Link>
            </div>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-3 rounded-2xl text-neutral-400 transition-all duration-300"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
            }}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 right-0 transition-all duration-400 ${
          mobileOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
        style={{
          background: "rgba(6, 6, 12, 0.85)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        <div className="p-6 space-y-2">
          <NavLink
            to="/music"
            icon={Music}
            isStatic={true}
            location={location}
            onClick={closeMobile}
          >
            Vibes
          </NavLink>
          {user ? (
            <>
              <NavLink
                to="/profile"
                icon={User}
                location={location}
                onClick={closeMobile}
              >
                Personal Hub
              </NavLink>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 p-4 w-full rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-red-400 mt-3 transition-all duration-300"
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.15)",
                }}
              >
                <LogOut className="w-4 h-4" /> Terminate Session
              </button>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-3 pt-4">
              <Link
                to="/login"
                onClick={closeMobile}
                className="p-4 text-center text-xs font-black uppercase tracking-[0.2em] text-neutral-300 rounded-2xl transition-all duration-300"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                Access Identity
              </Link>
              <Link
                to="/register"
                onClick={closeMobile}
                className="p-4 text-center text-xs font-black uppercase tracking-[0.2em] text-white rounded-2xl transition-all duration-300 hover:brightness-110"
                style={{
                  background:
                    "linear-gradient(145deg, rgba(99,102,241,0.9), rgba(236,72,153,0.8))",
                  border: "1px solid rgba(255,255,255,0.18)",
                  boxShadow: "0 4px 20px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                Init Profile
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Header;
