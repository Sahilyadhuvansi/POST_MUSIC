import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  dispatchBack,
  registerBackHandler,
} from "../utils/backHandlerRegistry";

export function useBackButton({ addToast } = {}) {
  const navigate = useNavigate();
  const lastPressRef = useRef(0);

  // Refs so we can always clean up synchronously without worrying about
  // the async .then() callback completing first.
  const removeRouterRef = useRef(() => {});
  const removeNativeRef = useRef(() => {});
  const appPluginRef = useRef(null);

  // Load the Capacitor App plugin once (synchronously if already loaded).
  const loadAppPlugin = useCallback(async () => {
    if (appPluginRef.current) return appPluginRef.current;
    if (typeof window !== "undefined" && window.Capacitor?.Plugins?.App) {
      appPluginRef.current = window.Capacitor.Plugins.App;
      return appPluginRef.current;
    }
    try {
      const { App } = await import("@capacitor/app");
      appPluginRef.current = App;
      return App;
    } catch {
      return null;
    }
  }, []);

  // Register router fallback — lowest priority in the stack.
  // This returns immediately (the handler itself is lazy), so we can
  // capture the unregister in a ref right away.
  const unregisterRouter = useCallback(
    registerBackHandler(async () => {
      const AppPlugin = await loadAppPlugin();
      const nativeCanGoBack =
        AppPlugin?.canGoBack != null
          ? (await AppPlugin.canGoBack()).canGoBack
          : false;

      const routerCanGoBack = window.history.state?.idx > 0;

      if (nativeCanGoBack || routerCanGoBack) {
        navigate(-1);
        return true;
      }
      return false;
    }, 0),
    [navigate, loadAppPlugin],
  );

  // Set up the native Capacitor back-button listener.  The App plugin is
  // loaded lazily, but the cleanup functions are captured in refs
  // *immediately* so that the useEffect cleanup below can always call
  // them — even if the async setup hasn't completed yet.
  useEffect(() => {
    removeRouterRef.current = unregisterRouter;
    let isMounted = true;

    loadAppPlugin().then((AppPlugin) => {
      if (!isMounted) return;
      if (!AppPlugin || typeof AppPlugin.addListener !== "function") return;

      const listenerResult = AppPlugin.addListener("backButton", async () => {
        const consumed = await dispatchBack();
        if (consumed) return;

        const now = Date.now();
        if (now - lastPressRef.current < 2000) {
          try {
            const plugin = await loadAppPlugin();
            if (plugin?.minimizeApp) await plugin.minimizeApp();
          } catch {
            // minimizeApp unavailable — no-op
          }
        } else {
          lastPressRef.current = now;
          if (addToast) addToast("Press back again to exit.", "info");
        }
      });

      const finish = (handle) => {
        if (!handle || typeof handle.remove !== "function") return;
        if (!isMounted) {
          try {
            handle.remove();
          } catch {
            /* ignore */
          }
          return;
        }
        removeNativeRef.current = () => {
          try {
            handle.remove();
          } catch {
            /* already gone */
          }
        };
      };

      if (listenerResult instanceof Promise) {
        listenerResult.then((handle) => finish(handle)).catch(() => {});
      } else {
        finish(listenerResult);
      }
    });

    return () => {
      isMounted = false;
      removeRouterRef.current();
      removeNativeRef.current();
      removeNativeRef.current = () => {};
    };
  }, [unregisterRouter, loadAppPlugin, addToast]);
}
