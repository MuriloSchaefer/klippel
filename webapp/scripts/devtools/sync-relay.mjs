#!/usr/bin/env node
/**
 * sync-relay.mjs — run the cr-sqlite sync relay from source.
 *
 * The relay is TypeScript in `electron/main/sync/`, and the packaged app gets
 * it as a build artifact (`dist/electron/main/sync-relay.js`, an entry of
 * `electron.vite.config.ts`). A debug session should not have to run a full
 * build to get a WebSocket hub, and must not run a *stale* one — a relay built
 * from last week's protocol would fail in a way that looks like a peer bug.
 *
 * So this bundles the same entry point with esbuild — tens of milliseconds for
 * ~4 KB — and runs the result. Same source as the app ships, no build step to
 * remember, nothing to keep in step.
 *
 * Usage:
 *   node scripts/devtools/sync-relay.mjs [--port 4300] [--host 127.0.0.1]
 *
 * `KLIPPEL_SYNC_TOKEN` is read by the relay itself, from the environment
 * rather than argv.
 */
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const WEBAPP = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const ENTRY = join(WEBAPP, "electron", "main", "sync", "relayMain.ts");

// Inside the webapp tree, not a temp dir: `ws` is left external (below), and
// Node resolves it from the requiring file's location.
const outdir = join(WEBAPP, "node_modules", ".cache", "klippel");
mkdirSync(outdir, { recursive: true });
const outfile = join(outdir, "sync-relay.cjs");

await build({
  entryPoints: [ENTRY],
  outfile,
  bundle: true,
  platform: "node",
  target: "node20",
  // CJS on purpose: `ws` reaches for `require` at runtime, and an ESM bundle
  // of it dies with "Dynamic require of events is not supported".
  format: "cjs",
  // Left external so the relay uses the same `ws` the app does, rather than a
  // second copy inlined here.
  external: ["ws"],
  logLevel: "warning",
});

createRequire(import.meta.url)(outfile);
