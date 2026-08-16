/**
 * capacitor-music-service.js
 *
 * Thin wrapper around the native MusicServicePlugin Capacitor plugin.
 * Manages the Android foreground service for background music playback.
 *
 * On non-Capacitor environments (web browser) every method is a no-op,
 * so the React code can call these unconditionally.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

const isNative = () =>
  typeof window !== "undefined" &&
  window.Capacitor &&
  window.Capacitor.isNativePlatform &&
  window.Capacitor.isNativePlatform();

/**
 * Lazy-load the plugin reference.  Capacitor registers plugins on the
 * `window.Capacitor.Plugins` object which may not exist until the bridge
 * is fully initialised.
 */
const getPlugin = () => {
  if (!isNative()) return null;
  try {
    return window.Capacitor.Plugins.MusicServicePlugin ?? null;
  } catch {
    return null;
  }
};

// ── Service lifecycle ─────────────────────────────────────────────────────────

/**
 * Start the foreground service with the given track metadata.
 * Call this when playback begins or the track changes.
 *
 * @param {{ title: string, artist: string, thumbnail?: string, isPlaying?: boolean }} opts
 */
export async function startMusicService({
  title,
  artist,
  thumbnail,
  isPlaying = true,
}) {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.startService({ title, artist, thumbnail, isPlaying });
  } catch (e) {
    if (import.meta.env.DEV)
      console.warn("[MusicService] startService failed:", e);
  }
}

/**
 * Update the notification metadata (title, artist, thumbnail).
 * Use when the track changes but the service is already running.
 *
 * @param {{ title: string, artist: string, thumbnail?: string }} opts
 */
export async function updateMusicMetadata({ title, artist, thumbnail }) {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.updateMetadata({ title, artist, thumbnail });
  } catch (e) {
    if (import.meta.env.DEV)
      console.warn("[MusicService] updateMetadata failed:", e);
  }
}

/**
 * Update the play/pause state on the notification.
 *
 * @param {boolean} isPlaying
 */
export async function updatePlaybackState(isPlaying) {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.updatePlaybackState({ isPlaying });
  } catch (e) {
    if (import.meta.env.DEV)
      console.warn("[MusicService] updatePlaybackState failed:", e);
  }
}

/**
 * Stop the foreground service and dismiss the notification.
 * Call when the user explicitly stops playback or clears the queue.
 */
export async function stopMusicService() {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.stopService();
  } catch (e) {
    if (import.meta.env.DEV)
      console.warn("[MusicService] stopService failed:", e);
  }
}

// ── Notification action listener ──────────────────────────────────────────────

/**
 * Register a listener for notification button actions.
 * The native side fires `musicServiceAction` events with
 * `{ action: "play" | "pause" | "next" | "previous" | "stop" }`.
 *
 * @param {(action: string) => void} callback
 * @returns {() => void} unsubscribe function
 */
export function onMusicServiceAction(callback) {
  const plugin = getPlugin();
  if (!plugin || !plugin.addListener) return () => {};

  let handle = null;
  let cancelled = false;

  try {
    const res = plugin.addListener("musicServiceAction", (data) => {
      if (data?.action) callback(data.action);
    });

    if (res instanceof Promise) {
      res
        .then((h) => {
          handle = h;
          if (cancelled && handle && typeof handle.remove === "function") {
            try {
              handle.remove();
            } catch {
              /* ignore */
            }
          }
        })
        .catch(() => {});
    } else {
      handle = res;
    }
  } catch {
    return () => {};
  }

  // Return an unsubscribe function
  return () => {
    cancelled = true;
    if (handle && typeof handle.remove === "function") {
      try {
        handle.remove();
      } catch {
        /* ignore */
      }
    }
  };
}
