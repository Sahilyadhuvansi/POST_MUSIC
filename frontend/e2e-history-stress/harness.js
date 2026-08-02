// Stress harness for the Player.jsx back-button history handling.
// The effect below is a VERBATIM copy of Player.jsx:349-372 — do not "improve"
// it here; it must match production. UI state that the popstate handler
// touches (queue/sleep sheets) is included so React batching behaves the same.
import { useEffect, useLayoutEffect, useRef, useState, createElement as h } from "react";
import { createRoot } from "react-dom/client";

// ── Instrumentation ─────────────────────────────────────────────────────────
// Layer the history so assertions can tell WHERE we are:
//   underbase(depth 0) → base(depth 1) → modal entries(depth 2+)
// While minimized we must sit exactly on `base`. `modal` while minimized =
// stale entry. `underbase` = an extra back() ate a real entry.
window.__stats = { pushes: 0, backs: 0, forwards: 0, popstates: 0 };
// Traversals issued but not yet landed (back()/forward() are async). The
// chaos phase reads this to avoid acting on a stale history.state.
window.__inflight = 0;
// Event journal for post-mortem on failures: every history op + popstate,
// with the state we were on at the time.
window.__journal = [];
const jwhere = () => {
  const s = window.history.state || {};
  if (s.modal === "player-expanded") return "modal:" + (s.generation ?? "?");
  if (s.base) return "base";
  if (s.underbase) return "underbase";
  if (s.guard) return "guard";
  return "unknown";
};
const jlog = (type, extra = "") => {
  window.__journal.push(
    `${performance.now().toFixed(1)} ${type} @${jwhere()}${extra ? " " + extra : ""}`,
  );
};
// Guard entries below the markers so a runaway back() can never leave the
// document (which would land on about:blank and kill the instrumentation).
window.history.replaceState({ guard: true }, "");
window.history.pushState({ guard: true }, "");
window.history.pushState({ underbase: true }, "");
window.history.pushState({ base: true }, "");

const origPush = window.history.pushState.bind(window.history);
window.history.pushState = (...a) => {
  window.__stats.pushes++;
  jlog("push", JSON.stringify(a[0]?.generation ?? a[0]));
  return origPush(...a);
};
const origReplace = window.history.replaceState.bind(window.history);
window.history.replaceState = (...a) => {
  jlog("replace", JSON.stringify(a[0]?.generation ?? a[0]));
  return origReplace(...a);
};
const origBack = window.history.back.bind(window.history);
window.history.back = (...a) => {
  window.__stats.backs++;
  window.__inflight++;
  jlog("back()");
  return origBack(...a);
};
const origFwd = window.history.forward.bind(window.history);
window.history.forward = (...a) => {
  window.__stats.forwards++;
  window.__inflight++;
  jlog("forward()");
  return origFwd(...a);
};
window.addEventListener("popstate", (e) => {
  window.__stats.popstates++;
  if (window.__inflight > 0) window.__inflight--;
  // This listener runs before the component's drain handler tags the event,
  // so record the entry now and patch the attribution after all listeners ran.
  const idx =
    window.__journal.push(
      `${performance.now().toFixed(1)} POPSTATE @${jwhere()} (?)`,
    ) - 1;
  queueMicrotask(() => {
    window.__journal[idx] = window.__journal[idx].replace(
      "(?)",
      e.__playerCleanupPop ? "(cleanup)" : "(user)",
    );
  });
});

window.__where = () => {
  const s = window.history.state || {};
  if (s.modal === "player-expanded") return "modal";
  if (s.base) return "base";
  if (s.underbase) return "underbase";
  if (s.guard) return "guard";
  return "unknown:" + JSON.stringify(s);
};

// ── Component ────────────────────────────────────────────────────────────────
function Harness() {
  const [isExpanded, setIsExpanded] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showQueueSheet, setShowQueueSheet] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showSleepSheet, setShowSleepSheet] = useState(false);

  // ══ mirrored from Player.jsx history handling ═══════════════════════════
  const backHandledRef = useRef(false);
  const activeHistoryEntryRef = useRef(null);
  const expansionGenerationRef = useRef(0);
  // history.back() is async — track in-flight cleanup pops so a rapid
  // re-expand can't push a fresh entry that the stale pop then eats.
  const pendingBacksRef = useRef(0);
  const deferredPushRef = useRef(null);
  const isExpandedRef = useRef(false);
  useLayoutEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  useEffect(() => {
    // Mounted once, so it's registered before any expansion popstate handler
    // (those are only added on expand) and runs first on each dispatch.
    // Attributes popstates caused by our own cleanup back() and performs any
    // push that was deferred behind them.
    const drain = (event) => {
      if (pendingBacksRef.current === 0) return;
      pendingBacksRef.current--;
      // Mark this dispatch as our own cleanup pop so the expansion popstate
      // handler (which runs after us) ignores it. The flag lives on the
      // event object, so it's scoped to exactly this dispatch.
      if (event) event.__playerCleanupPop = true;
      if (pendingBacksRef.current > 0) return;
      if (deferredPushRef.current) {
        const { entryId, generation } = deferredPushRef.current;
        deferredPushRef.current = null;
        if (activeHistoryEntryRef.current === entryId) {
          window.history.pushState(
            { modal: "player-expanded", entryId, generation },
            "",
          );
        }
      } else if (isExpandedRef.current && !activeHistoryEntryRef.current) {
        // Minimize + re-expand landed in one React batch: isExpanded never
        // toggled, so the expansion effect didn't re-run and no entry exists
        // for the current expanded state. Recreate it now that the pop landed.
        const generation = expansionGenerationRef.current + 1;
        expansionGenerationRef.current = generation;
        const entryId = `player-expanded:${generation}:${Date.now()}`;
        activeHistoryEntryRef.current = entryId;
        window.history.pushState(
          { modal: "player-expanded", entryId, generation },
          "",
        );
        backHandledRef.current = false;
      }
    };
    window.addEventListener("popstate", drain);
    return () => window.removeEventListener("popstate", drain);
  }, []);

  const minimizePlayer = () => {
    if (backHandledRef.current) return;

    const currentState = window.history.state;
    const entryId = activeHistoryEntryRef.current;
    const generation = expansionGenerationRef.current;

    backHandledRef.current = true;
    activeHistoryEntryRef.current = null;
    deferredPushRef.current = null; // cancel any not-yet-pushed entry

    setIsExpanded(false);
    setShowQueueSheet(false);
    setShowSleepSheet(false);

    if (
      entryId &&
      currentState?.modal === "player-expanded" &&
      currentState?.generation === generation &&
      currentState?.entryId === entryId
    ) {
      pendingBacksRef.current++;
      window.history.back();
    }
  };

  useLayoutEffect(() => {
    if (!isExpanded) return;

    const generation = expansionGenerationRef.current + 1;
    expansionGenerationRef.current = generation;

    const entryId = `player-expanded:${generation}:${Date.now()}`;
    activeHistoryEntryRef.current = entryId;
    const currentState = window.history.state;
    if (pendingBacksRef.current > 0) {
      // A cleanup back() is still in flight — the current entry is about to
      // be popped. Pushing now would let that pop eat the fresh entry, so
      // defer the push until the pop lands (handled in the drain listener).
      deferredPushRef.current = { entryId, generation };
    } else {
      const historyAction =
        currentState?.modal === "player-expanded"
          ? window.history.replaceState.bind(window.history)
          : window.history.pushState.bind(window.history);
      historyAction({ modal: "player-expanded", entryId, generation }, "");
    }
    backHandledRef.current = false;

    const h = (event) => {
      if (backHandledRef.current) return;
      if (event?.__playerCleanupPop) return; // our own cleanup pop, not user Back

      const state = event?.state ?? window.history.state;
      const entryId = activeHistoryEntryRef.current;
      const generation = expansionGenerationRef.current;
      const isStaleModalEntry =
        state?.modal === "player-expanded" &&
        (state?.generation !== generation || state?.entryId !== entryId);
      if (isStaleModalEntry) return;

      backHandledRef.current = true;
      activeHistoryEntryRef.current = null;
      setIsExpanded(false);
      setShowQueueSheet(false);
      setShowSleepSheet(false);
    };
    window.addEventListener("popstate", h);
    return () => {
      window.removeEventListener("popstate", h);
      // If the player is deactivating without minimizePlayer() or the popstate
      // handler having run (a direct setIsExpanded(false), or unmount while
      // expanded), our history entry is still on the stack — pop it here so
      // the next Back doesn't just re-minimize an already-minimized player.
      if (!backHandledRef.current) {
        const state = window.history.state;
        const staleEntryId = activeHistoryEntryRef.current;
        if (
          staleEntryId &&
          state?.modal === "player-expanded" &&
          state?.entryId === staleEntryId
        ) {
          backHandledRef.current = true;
          activeHistoryEntryRef.current = null;
          pendingBacksRef.current++;
          window.history.back();
        }
      }
    };
  }, [isExpanded]);
  // ══ end mirrored block ═══════════════════════════════════════════════════

  window.__isExpanded = isExpanded;

  return h(
    "div",
    null,
    h("div", { id: "state" }, isExpanded ? "EXPANDED" : "MINI"),
    h("button", { id: "expand", onClick: () => setIsExpanded(true) }, "expand"),
    h(
      "button",
      { id: "minimize", onClick: () => minimizePlayer() },
      "minimize",
    ),
    h(
      "button",
      { id: "toggle", onClick: () => setIsExpanded((v) => !v) },
      "toggle",
    ),
  );
}

createRoot(document.getElementById("root")).render(h(Harness));
window.__ready = true;
