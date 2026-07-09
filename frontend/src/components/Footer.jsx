import { Link } from "react-router-dom";
import {
  Music,
  Github,
  Twitter,
  Instagram,
  Youtube,
  Mail,
  MapPin,
  ExternalLink,
} from "lucide-react";

const FooterSection = ({ title, children }) => (
  <div className="space-y-5">
    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">
      {title}
    </h4>
    <div className="flex flex-col gap-3">{children}</div>
  </div>
);

const FooterLink = ({ to, children, external = false }) => {
  const base =
    "text-sm text-neutral-500 hover:text-white transition-colors duration-300 flex items-center gap-2 group";
  if (external) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className={base}>
        {children}
        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
    );
  }
  return (
    <Link to={to} className={base}>
      {children}
    </Link>
  );
};

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="relative mt-32 pt-24 pb-12 overflow-hidden"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(4, 4, 8, 0.7)",
        backdropFilter: "blur(40px) saturate(160%)",
        WebkitBackdropFilter: "blur(40px) saturate(160%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
      }}
    >
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/4 w-[28rem] h-[28rem] bg-indigo-500/8 blur-[100px] rounded-full pointer-events-none animate-depth-pulse" />
      <div className="absolute top-0 right-1/4 w-[28rem] h-[28rem] bg-pink-500/8 blur-[100px] rounded-full pointer-events-none animate-depth-pulse" style={{ animationDelay: "3s" }} />

      <div className="mx-auto max-w-[1400px] px-6">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-16 mb-24">
          {/* Brand */}
          <div className="space-y-8">
            <Link
              to="/"
              className="inline-flex items-center gap-3 transition-all duration-300 active:scale-95 group"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-500 group-hover:rotate-[12deg]"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  boxShadow: "0 0 0 1px rgba(168,85,247,0.25), 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.6)",
                }}
              >
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-6 w-6 object-contain"
                />
              </div>
              <span className="text-xl font-black text-white italic uppercase tracking-tighter">
                Music
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
                  Discover
                </span>
              </span>
            </Link>
            <p className="text-neutral-500 text-sm leading-relaxed max-w-xs">
              Your personal music discovery universe. Search, explore, and vibe
              with the global frequency.
            </p>
            <div className="flex gap-3">
              {[Github, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="p-3 rounded-2xl text-neutral-500 hover:text-white transition-all duration-300 hover:scale-110 liquid-sheen-on-hover"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                >
                  <Icon className="w-4.5 h-4.5" />
                </a>
              ))}
            </div>
          </div>

          <FooterSection title="Navigation">
            <FooterLink to="/music">Frequency Hub</FooterLink>
            <FooterLink to="/profile">Your Profile</FooterLink>
          </FooterSection>

          <FooterSection title="Platform">
            <FooterLink to="/register">Join the Frequency</FooterLink>
            <FooterLink to="/login">Sign In</FooterLink>
          </FooterSection>

          <FooterSection title="Connect">
            <div className="space-y-3">
              <div
                className="flex items-center gap-3 p-3 rounded-2xl text-neutral-500"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">uplink@musicdiscover.io</span>
              </div>
              <div
                className="flex items-center gap-3 p-3 rounded-2xl text-neutral-500"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">Global Distribution</span>
              </div>
            </div>
          </FooterSection>
        </div>

        {/* Bottom bar */}
        <div
          className="pt-10 flex flex-col md:flex-row justify-between items-center gap-5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-2 text-neutral-600 text-[10px] font-black uppercase tracking-widest">
            <span>&copy; {currentYear} MusicDiscover Systems</span>
            <span className="w-1 h-1 rounded-full bg-neutral-800" />
            <span className="text-neutral-700">v2.5.0</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            All Systems Operational
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
