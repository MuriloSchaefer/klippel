/**
 * jazzLogBuffer — in-memory ring buffer for cojson sync events.
 *
 * The renderer-facing system-tray "Sync logs" panel subscribes to
 * this buffer via IPC (`jazz-sync-logs:subscribe`). Cojson's logger
 * is installed as the entry source through `installCojsonLogTap()`;
 * every log call is sanitised and pushed into the buffer, then
 * batched out to subscribers on a 100 ms tick so a chatty DEBUG
 * stream can't pin the renderer event loop.
 *
 * Storage is in-memory only — the buffer survives renderer reloads
 * (it lives in the main process) but not main-process restarts. A
 * file-backed mode is intentionally out of scope here; see the
 * paired change doc under `Store/docs/changes/2026-05-23-d48a48`.
 */
import { logger as cojsonLogger } from "cojson";

export type SyncLogLevel = "debug" | "info" | "warn" | "error";

export interface SyncLogEntry {
  /** Monotonic id assigned by the buffer; used by the renderer as a
   *  React key and for "since" cursors across batches. */
  id: number;
  /** `Date.now()` at insert. */
  ts: number;
  level: SyncLogLevel;
  message: string;
  /** Already-sanitised attributes (no secrets). */
  attributes?: Record<string, unknown>;
}

/**
 * Hard cap on retained entries. ~50 KB worst case for 100-char
 * messages; oldest entries are dropped on overflow. The number is
 * exposed so tests can assert the cap, but should be considered
 * private to this module.
 */
export const MAX_BUFFER = 500;

/** Attribute keys whose values are replaced with `"[redacted]"`
 *  before an entry lands in the buffer. Cojson does not log secrets
 *  at the levels we care about today; this is defence in depth so
 *  the buffer is safe to surface in the UI and (later) to disk. */
const SECRET_KEY_RE = /(secret|token)$/i;

type Listener = (batch: SyncLogEntry[]) => void;

const buffer: SyncLogEntry[] = [];
const listeners = new Set<Listener>();
let nextId = 1;
let emitEnabled = true;

/** Entries added since the last flush; cleared on every tick. */
let pendingBatch: SyncLogEntry[] = [];
let tickHandle: ReturnType<typeof setInterval> | null = null;
const TICK_MS = 100;

let installed = false;

function sanitiseAttributes(
  attrs: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!attrs) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) {
    out[k] = SECRET_KEY_RE.test(k) ? "[redacted]" : v;
  }
  return out;
}

function record(level: SyncLogLevel, message: string, attrs?: unknown): void {
  const entry: SyncLogEntry = {
    id: nextId++,
    ts: Date.now(),
    level,
    message,
    attributes: sanitiseAttributes(attrs as Record<string, unknown> | undefined),
  };
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
  pendingBatch.push(entry);
}

function flush(): void {
  if (!emitEnabled) return;
  if (pendingBatch.length === 0) return;
  const batch = pendingBatch;
  pendingBatch = [];
  // Copy listeners to a local array so a subscriber that
  // synchronously unregisters during flush doesn't trip the
  // Set-iterator invariant.
  const snapshot = Array.from(listeners);
  for (const listener of snapshot) {
    try {
      listener(batch);
    } catch (err) {
      // A misbehaving subscriber must not poison the next batch for
      // the rest. Log once and continue.
      // eslint-disable-next-line no-console
      console.error("[jazzLogBuffer] subscriber threw", err);
    }
  }
}

/**
 * Attach our `LogSystem` adapter to cojson's logger. Idempotent —
 * safe to call from bootstrap regardless of whether
 * `KLIPPEL_JAZZ_DEBUG` was set (cojson's level filter governs what
 * actually arrives here).
 */
export function installCojsonLogTap(): void {
  if (installed) return;
  installed = true;
  cojsonLogger.setLogSystem({
    debug: (message, attributes) => record("debug", message, attributes),
    info: (message, attributes) => record("info", message, attributes),
    warn: (message, attributes) => record("warn", message, attributes),
    error: (message, attributes) => record("error", message, attributes),
  });
  if (!tickHandle) {
    tickHandle = setInterval(flush, TICK_MS);
    // Don't keep the process alive just to flush sync logs.
    tickHandle.unref?.();
  }
}

export function snapshot(): SyncLogEntry[] {
  return buffer.slice();
}

export function clearBuffer(): void {
  buffer.length = 0;
  pendingBatch.length = 0;
  // Synthetic boundary entry so subscribers see the cut clearly.
  record("info", "[jazzLogBuffer] buffer cleared");
  // Immediate flush so the boundary shows up without the 100 ms tick.
  flush();
}

/** Pauses / resumes outbound emission. The ring buffer keeps
 *  recording regardless; on resume the next tick will flush whatever
 *  accumulated while paused. */
export function setEmitEnabled(enabled: boolean): void {
  emitEnabled = enabled;
}

/**
 * Push an entry directly into the ring buffer, bypassing cojson's
 * logger. The renderer can't tell the difference — entries from
 * here flow into the same `:batch` channel. Used by main-process
 * lifecycle hooks (workspace open, share confirmed, join confirmed)
 * and per-module trace surfaces (`Materials/main/materials.ts`) so
 * users can see correlated events in the system-tray panel even
 * though cojson itself emits very few DEBUG lines.
 */
export function recordEntry(
  level: SyncLogLevel,
  message: string,
  attributes?: Record<string, unknown>,
): void {
  record(level, message, attributes);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only helpers. */
export function __resetForTests(): void {
  buffer.length = 0;
  pendingBatch.length = 0;
  listeners.clear();
  nextId = 1;
  emitEnabled = true;
}
