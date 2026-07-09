// --- API CONFIGURATION ---
// Priorities:
// 1) VITE_API_URL from environment (recommended)
// 2) Local development fallback
// 3) Production domain fallback map

const FRONTEND_HOST = window.location.hostname;
const FRONTEND_ORIGIN = window.location.origin.replace(/\/+$/, "");
const ENV_API_URL = (import.meta.env.VITE_API_URL || "").trim();

const normalizeApiBase = (rawUrl) => {
  if (!rawUrl) return "";
  const sanitized = rawUrl.trim().replace(/\/+$/, "");
  return sanitized.endsWith("/api") ? sanitized.slice(0, -4) : sanitized;
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

const normalizedEnvApiBase = normalizeApiBase(ENV_API_URL);
const isLocalHost = (host) => LOCAL_HOSTS.has(host);

const isEnvPointingToFrontend =
  !!normalizedEnvApiBase &&
  !isLocalHost(FRONTEND_HOST) &&
  (normalizedEnvApiBase === FRONTEND_ORIGIN ||
    normalizedEnvApiBase === `https://${FRONTEND_HOST}` ||
    normalizedEnvApiBase === `http://${FRONTEND_HOST}`);

const isPlaceholderEnv =
  !!normalizedEnvApiBase && normalizedEnvApiBase.includes("your-backend-name");

const PRODUCTION_API_FALLBACKS = {
  "music-discover.vercel.app": "https://post-music.onrender.com",
};

const FALLBACK_API_URL = LOCAL_HOSTS.has(FRONTEND_HOST)
  ? "http://localhost:3001"
  : PRODUCTION_API_FALLBACKS[FRONTEND_HOST] || "";

const effectiveEnvApiBase =
  isEnvPointingToFrontend || isPlaceholderEnv ? "" : normalizedEnvApiBase;

export const API_URL = normalizeApiBase(
  effectiveEnvApiBase || FALLBACK_API_URL,
);

if (!API_URL) {
  console.warn(
    "[config] API URL is not configured. Set VITE_API_URL in your frontend environment (Vercel Project Settings → Environment Variables).",
  );
} else if (isEnvPointingToFrontend) {
  console.warn(
    `[config] Ignoring VITE_API_URL (${ENV_API_URL}) because it points to the frontend domain. Falling back to ${API_URL}.`,
  );
} else if (isPlaceholderEnv) {
  console.warn(
    `[config] Ignoring VITE_API_URL (${ENV_API_URL}) because it is a placeholder. Falling back to ${API_URL}.`,
  );
}

export const DEFAULT_AVATAR =
  import.meta.env.VITE_DEFAULT_AVATAR ||
  "https://www.gravatar.com/avatar/?d=mp&f=y&s=200";

export const IMAGEKIT_UPLOAD_URL =
  import.meta.env.VITE_IMAGEKIT_UPLOAD_URL ||
  "https://upload.imagekit.io/api/v1/files/upload";
