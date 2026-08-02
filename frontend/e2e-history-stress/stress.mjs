// Playwright stress test for Player.jsx back-button history handling.
// Run: node e2e-history-stress/stress.mjs <chromium|webkit> [cycles]
//
// Simulates the user's manual test plan:
//   1. Rapid minimize→expand taps, 50 cycles, no settling between taps
//   2. Same but with hardware/browser Back as the minimize action
//   3. Random chaos mix of taps and Back
// After each phase, verifies:
//   - exactly one history entry per expanded state (depth: base+1 when
//     expanded, base when minimized — never deeper, never underbase)
//   - Back from minimized leaves the page (reaches underbase marker), i.e. no
//     stale swallowed entries
//   - no duplicate/skipped entries (push/back accounting balances)
//   - no console errors, no stale UI state
import { chromium, webkit } from "playwright";
import { createServer } from "vite";
import { fileURLToPath } from "url";
import path from "path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const browserName = process.argv[2] || "chromium";
const CYCLES = parseInt(process.argv[3] || "50", 10);

// ── Vite dev server rooted at the harness dir (resolves react from
// the frontend's node_modules) ───────────────────────────────────────────────
const server = await createServer({
  configFile: false,
  root: dir,
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 0 },
});
await server.listen();
const URL_ = server.resolvedUrls.local[0];

// ── Helpers ──────────────────────────────────────────────────────────────────
const failures = [];
const consoleErrors = [];

function check(cond, msg) {
  if (!cond) failures.push(msg);
}

let journalDump = [];

async function mark(page, label) {
  await page.evaluate((m) => window.__journal?.push("════ " + m), label);
}

async function settle(page) {
  // Let queued popstate/effect-cleanup microtask+task chains drain
  await page.waitForTimeout(120);
  await page.waitForFunction(() => true);
  // Runaway back() past the guard entries unloads the harness document —
  // that's a failure to report, not a crash.
  const alive = await page.evaluate(() => typeof window.__where === "function");
  if (!alive) {
    const href = await page.evaluate(() => location.href);
    failures.push(
      `harness document UNLOADED (now at ${href}) — runaway history.back() escaped the guard entries`,
    );
    report();
  }
}

async function snapshot(page) {
  return page.evaluate(() => {
    if (typeof window.__where !== "function") {
      // Page navigated off the harness document — a runaway back() escaped
      // the guard entries. Report instead of crashing.
      return {
        where: "OFF-DOCUMENT:" + location.href,
        expanded: undefined,
        ui: "(harness gone)",
        stats: {},
      };
    }
    return {
      where: window.__where(),
      expanded: window.__isExpanded,
      ui: document.getElementById("state").textContent,
      stats: { ...window.__stats },
    };
  });
}

async function assertSteadyState(page, label) {
  await settle(page);
  const s = await snapshot(page);
  // UI must not be stale relative to React state
  check(
    (s.expanded && s.ui === "EXPANDED") || (!s.expanded && s.ui === "MINI"),
    `${label}: stale UI — expanded=${s.expanded} ui=${s.ui}`,
  );
  // History position must match state: exactly one entry per expanded state
  if (s.expanded) {
    check(s.where === "modal", `${label}: expanded but history at "${s.where}" (want modal)`);
  } else {
    check(
      s.where === "base",
      `${label}: minimized but history at "${s.where}" (stale entry if "modal", over-popped if "underbase")`,
    );
  }
  return s;
}

// "Back always behaves as expected" — from minimized, back must reach the
// underbase marker in ONE press (no swallowed stale entries).
async function assertCleanBackFromMini(page, label) {
  await settle(page);
  await mark(page, `assertCleanBackFromMini(${label})`);
  const before = await snapshot(page);
  if (before.expanded) {
    await page.click("#minimize");
    await settle(page);
  }
  await page.evaluate(() => window.history.back());
  await settle(page);
  const after = await snapshot(page);
  check(
    after.where === "underbase",
    `${label}: back from minimized landed on "${after.where}" — ${
      after.where === "base" ? "swallowed by a stale entry" : "unexpected"
    }`,
  );
  check(!after.expanded, `${label}: back from minimized re-expanded the player`);
  // restore to base for the next phase
  await page.evaluate(() => window.history.forward());
  await settle(page);
}

// ── Run ──────────────────────────────────────────────────────────────────────
const engine = browserName === "webkit" ? webkit : chromium;
const browser = await engine.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => consoleErrors.push(String(e)));

await page.goto(URL_);
await page.waitForFunction(() => window.__ready === true);
await settle(page);
check((await snapshot(page)).where === "base", "setup: not at base");

// Phase 1: rapid toggle taps, NO settling between taps (as fast as possible)
for (let i = 0; i < CYCLES; i++) {
  await page.click("#expand");
  await page.click("#minimize"); // immediate — races cleanup's history.back()
}
await assertSteadyState(page, `phase1 after ${CYCLES} rapid tap-cycles`);
await assertCleanBackFromMini(page, "phase1");

// Phase 2: expand via tap, minimize via BACK, rapid
for (let i = 0; i < CYCLES; i++) {
  await page.click("#expand");
  await page.evaluate(() => window.history.back()); // hardware back
}
await assertSteadyState(page, `phase2 after ${CYCLES} rapid back-cycles`);
await assertCleanBackFromMini(page, "phase2");

// Phase 3: chaos — random mix of expand/minimize taps and back presses,
// including back-while-minimized and double-taps (deterministic PRNG)
let seed = 42;
const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
for (let i = 0; i < CYCLES * 2; i++) {
  const r = rand();
  if (r < 0.4) {
    await mark(page, `chaos#${i} toggle`);
    await page.click("#toggle");
  } else if (r < 0.7) {
    await mark(page, `chaos#${i} expand`);
    await page.click("#expand");
  } else if (r < 0.9) {
    await mark(page, `chaos#${i} minimize`);
    await page.click("#minimize");
  } else {
    // random back press — only when expanded, else we'd leave the page.
    // Check-and-press atomically in-page: a separate snapshot round-trip
    // races in-flight traversals and can over-pop past base (test artifact).
    const pressed = await page.evaluate(() => {
      if (window.__inflight > 0) return false; // state is about to change
      if (window.history.state?.modal !== "player-expanded") return false;
      window.history.back();
      return true;
    });
    if (pressed) await mark(page, `chaos#${i} BACK`);
  }
  if (r > 0.97) await settle(page); // occasional pause like a real user
}
// End chaos in minimized state
await settle(page);
if (await page.evaluate(() => window.__isExpanded)) {
  await page.click("#minimize");
}
await assertSteadyState(page, "phase3 after chaos");
await assertCleanBackFromMini(page, "phase3");

// Phase 4: BRUTAL — expand+minimize dispatched synchronously in ONE JS task,
// so the cleanup's async history.back() from cycle N is still in flight when
// cycle N+1's effect pushes. Faster than any physical tap.
for (let i = 0; i < CYCLES; i++) {
  await page.evaluate(() => {
    document.getElementById("expand").click();
    document.getElementById("minimize").click();
  });
}
await assertSteadyState(page, `phase4 after ${CYCLES} sync double-taps`);
await assertCleanBackFromMini(page, "phase4");

// Phase 5: BRUTAL variant — minimize+re-expand in one task, END EXPANDED.
// cleanup back() racing a fresh pushState is the exact suspected race.
await page.click("#expand");
await settle(page);
for (let i = 0; i < CYCLES; i++) {
  await page.evaluate(() => {
    document.getElementById("minimize").click();
    document.getElementById("expand").click();
  });
}
await settle(page);
await settle(page); // extra drain: in-flight back() traversals
{
  const s = await snapshot(page);
  check(s.expanded && s.ui === "EXPANDED", `phase5: should end expanded, ui=${s.ui}`);
  check(
    s.where === "modal",
    `phase5: expanded but history at "${s.where}" — back would ${
      s.where === "base" ? "leave the page instead of minimizing" : "misbehave"
    }`,
  );
  // Back must minimize, not navigate away
  await page.evaluate(() => window.history.back());
  await settle(page);
  const after = await snapshot(page);
  check(!after.expanded, "phase5: back did not minimize");
  check(after.where === "base", `phase5: after back-minimize, history at "${after.where}"`);
}
await assertCleanBackFromMini(page, "phase5");

// Phase 6: TIMING SWEEP — the real race window is between cleanup's queued
// history.back() traversal and the next expand's pushState. Same-task taps
// get batched away by React (phases 4/5), so sweep every delay 0..24ms
// between minimize and re-expand to straddle that boundary deterministically.
for (let d = 0; d <= 24; d++) {
  await mark(page, `phase6 d=${d}`);
  // ensure expanded
  await page.evaluate(() => {
    const state = document.getElementById("state");
    if (state && state.textContent !== "EXPANDED")
      document.getElementById("expand").click();
  });
  await settle(page);
  // minimize, wait exactly d ms, re-expand — all in-page for precise timing
  await page.evaluate(
    (delay) =>
      new Promise((resolve) => {
        document.getElementById("minimize").click();
        setTimeout(() => {
          document.getElementById("expand").click();
          resolve();
        }, delay);
      }),
    d,
  );
  await settle(page);
  await settle(page);
  const s = await snapshot(page);
  check(
    s.expanded && s.ui === "EXPANDED",
    `phase6 d=${d}ms: race collapsed the player (expanded=${s.expanded} ui=${s.ui} where=${s.where})`,
  );
  check(
    s.where === "modal",
    `phase6 d=${d}ms: expanded but history at "${s.where}" — cleanup back() ate the fresh entry`,
  );
  // back must still minimize cleanly at this offset
  await page.evaluate(() => window.history.back());
  await settle(page);
  const after = await snapshot(page);
  check(!after.expanded, `phase6 d=${d}ms: back did not minimize`);
  check(after.where === "base", `phase6 d=${d}ms: after back, history at "${after.where}"`);
}
await assertCleanBackFromMini(page, "phase6");

// Final: one normal cycle must still work perfectly
await page.click("#expand");
await assertSteadyState(page, "final expand");
await page.evaluate(() => window.history.back());
await assertSteadyState(page, "final back-minimize");
await assertCleanBackFromMini(page, "final");

const stats = (await snapshot(page)).stats;
check(consoleErrors.length === 0, `console errors: ${JSON.stringify(consoleErrors.slice(0, 5))}`);
journalDump = await page.evaluate(() => window.__journal || []);

await browser.close();
await server.close();

report(stats);

// ── Report ───────────────────────────────────────────────────────────────────
function report(stats = null) {
  console.log(`\n=== ${browserName} · ${CYCLES} cycles/phase ===`);
  if (stats) {
    console.log(`history.pushState calls: ${stats.pushes}`);
    console.log(`history.back calls (from cleanup or test): ${stats.backs}`);
    console.log(`popstate events: ${stats.popstates}`);
  }
  console.log(`console errors: ${consoleErrors.length}`);
  if (failures.length) {
    console.log(`\nFAIL (${failures.length}):`);
    for (const f of failures) console.log("  ✗ " + f);
    if (journalDump.length) {
      console.log(`\n── journal (${journalDump.length} events) ──`);
      for (const l of journalDump) console.log("  " + l);
    }
    process.exit(1);
  } else {
    console.log("\nPASS — one entry per expanded state, back clean, no stale UI, no errors");
    process.exit(0);
  }
}
