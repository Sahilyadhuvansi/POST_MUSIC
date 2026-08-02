import { useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Helper to safely obtain the Capacitor App plugin instance.
 * Checks window.Capacitor.Plugins.App first (available when running in native webview),
 * and falls back to dynamic import of @capacitor/app if available.
 */
const getCapacitorApp = async () => {
  if (typeof window !== "undefined" && window.Capacitor?.Plugins?.App) {
    return window.Capacitor.Plugins.App;
  }
  try {
    const { App } = await import("@capacitor/app");
    return App;
  } catch {
    return null;
  }
};

/**
 * useBackButton
 *
 * Implements professional music-app back button behaviour:
 *
 * 1. If on a nested page → navigate back normally.
 * 2. If on a root page ("/" or "/music"):
 *    a. First press → show a toast "Press back again to exit."
 *    b. Second press within 2 s → minimise the app (music keeps playing).
 *
 * Uses the Capacitor @capacitor/app plugin for `backButton` events and
 * `App.minimizeApp()`.  Falls back to a no-op on web.
 *
 * @param {{ addToast?: (msg: string, type?: string) => void }} opts
 */
export function useBackButton({ addToast } = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const lastBackPressRef = useRef(0);

  const handleBackButton = useCallback(
    async (ev) => {
      const isRoot =
        location.pathname === "/" || location.pathname === "/music";

      if (!isRoot) {
        // Nested page → navigate back
        navigate(-1);
        return;
      }

      // Root page → double-back-to-minimise
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        // Second press within 2 s → minimise
        try {
          const AppPlugin = await getCapacitorApp();
          if (AppPlugin && typeof AppPlugin.minimizeApp === "function") {
            await AppPlugin.minimizeApp();
          }
        } catch {
          // If minimiseApp isn't available, do nothing
        }
      } else {
        // First press → show toast
        lastBackPressRef.current = now;
        if (addToast) {
          addToast("Press back again to exit.", "info");
        }
      }
    },
    [location.pathname, navigate, addToast],
  );

  useEffect(() => {
    let removeListener = null;

    const setup = async () => {
      try {
        const AppPlugin = await getCapacitorApp();
        if (AppPlugin && typeof AppPlugin.addListener === "function") {
          const handle = await AppPlugin.addListener("backButton", ({ canGoBack }) => {
            handleBackButton({ canGoBack });
          });
          removeListener = () => {
            if (handle && typeof handle.remove === "function") {
              handle.remove();
            }
          };
        }
      } catch {
        // Not running in Capacitor — no-op on web
      }
    };

    setup();

    return () => {
      if (removeListener) removeListener();
    };
  }, [handleBackButton]);
}
