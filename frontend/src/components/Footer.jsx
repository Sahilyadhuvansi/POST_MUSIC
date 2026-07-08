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

/**
 * PRODUCTION FOOTER v2.5.0
 * Deep clean & modular architecture
 */
const FooterSection = ({ title, children }) => (
  <div className="space-y-6">
    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">
      {title}
    </h4>
    <div className="flex flex-col gap-3">{children}</div>
  </div>
);

const FooterLink = ({ to, children, external = false }) => {
  const base =
    "text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-2 group";
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
    <footer className="relative mt-32 border-t border-white/5 bg-black/40 backdrop-blur-3xl pt-24 pb-12 overflow-hidden">
      {/* Background Polish Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto max-w-[1400px] px-6">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-16 mb-24">
          {/* Brand Identity Hub */}
          <div className="space-y-8">
            <Link
              to="/"
              className="inline-flex items-center gap-3 active:scale-95 transition-transform group"
            >
              <div className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-white shadow-xl transition-all group-hover:rotate-[10deg]">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-6 w-6 object-contain drop-shadow-[0_0_10px_rgba(255,100,200,0.6)]"
                />
              </div>
              <span className="text-xl font-black text-white italic uppercase tracking-tighter">
                Music
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
                  Discover
                </span>
              </span>
            </Link>
            <p className="text-neutral-400 text-sm leading-relaxed max-w-xs">
              Your personal music discovery universe. Search, explore, and vibe
              with the global frequency.
            </p>
            <div className="flex gap-4">
              {[Github, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="p-3 rounded-2xl glass-dark border-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <FooterSection title="Navigation">
            <FooterLink to="/music">Frequency Hub</FooterLink>
            <FooterLink to="/ai-picks">AI Picks</FooterLink>
            <FooterLink to="/profile">Your Profile</FooterLink>
          </FooterSection>

          <FooterSection title="Platform">
            <FooterLink to="/register">Join the Frequency</FooterLink>
            <FooterLink to="/login">Sign In</FooterLink>
          </FooterSection>

          <FooterSection title="Connect">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-neutral-400">
                <div className="p-2.5 rounded-xl bg-white/5">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="text-sm">uplink@musicdiscover.io</span>
              </div>
              <div className="flex items-center gap-3 text-neutral-400">
                <div className="p-2.5 rounded-xl bg-white/5">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-sm">Global Distribution</span>
              </div>
            </div>
          </FooterSection>
        </div>

        {/* Global Footer Base */}
        <div className="border-t border-white/5 pt-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-neutral-500 text-[10px] font-black uppercase tracking-widest">
            <span>&copy; {currentYear} MusicDiscover Systems</span>
            <span className="w-1 h-1 rounded-full bg-neutral-800" />
            <span className="text-neutral-600">v2.5.0 Production Build</span>
          </div>
          <div className="flex items-center gap-8">
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
