/**
 * backHandlerRegistry.js
 *
 * Priority-based back-button handler registry.
 *
 * Components register handlers with a priority number — higher priority
 * runs first. If a handler returns true, the back press is consumed and
 * doesn't fall through to lower-priority handlers.
 *
 * Usage:
 *   const unregister = registerBackHandler(async () => {
 *     closeModal();
 *     return true; // consumed
 *   }, 20); // higher than the router fallback (0)
 *
 *   // on unmount:
 *   unregister();
 */

const handlers = [];

export function registerBackHandler(handler, priority = 0) {
  const entry = { handler, priority };
  handlers.push(entry);
  handlers.sort((a, b) => b.priority - a.priority);

  return () => {
    const idx = handlers.indexOf(entry);
    if (idx !== -1) handlers.splice(idx, 1);
  };
}

export async function dispatchBack() {
  const snapshot = [...handlers];
  for (const { handler } of snapshot) {
    // Verify handler hasn't been unregistered during async steps
    if (!handlers.some((entry) => entry.handler === handler)) continue;
    const result = await handler();
    if (result === true) return true;
  }
  return false;
}
