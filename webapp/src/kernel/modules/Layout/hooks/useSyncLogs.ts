import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Renderer-side hook over the `jazz-sync-logs:*` IPC. Subscribes on
 * mount, replays the buffer snapshot, and pushes each subsequent
 * batch into local state. The main process throttles batches to one
 * per 100 ms, so the worst-case set-state rate matches that.
 *
 * Exposes `paused` / `setPaused` for the UI's pause control. Pausing
 * flips both:
 *  - the main-process emit gate (`setEnabled(false)`) — stops new
 *    `webContents.send` calls so the renderer event loop isn't woken
 *    by the chatty DEBUG stream while the panel is showing a frozen
 *    view, and
 *  - a local ignore flag — covers in-flight batches that crossed the
 *    IPC boundary before the toggle landed.
 */
export interface SyncLogEntry {
  id: number;
  ts: number;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  attributes?: Record<string, unknown>;
}

interface SyncLogsApi {
  snapshot: () => Promise<SyncLogEntry[]>;
  clear: () => Promise<{ success: true }>;
  setEnabled: (enabled: boolean) => Promise<{ success: true; enabled: boolean }>;
  subscribe: (
    listener: (batch: SyncLogEntry[]) => void,
  ) => Promise<{ initial: SyncLogEntry[]; unsubscribe: () => void }>;
}

const getApi = (): SyncLogsApi | null =>
  (
    globalThis as unknown as {
      electron?: { jazz?: { syncLogs?: SyncLogsApi } };
    }
  ).electron?.jazz?.syncLogs ?? null;

/** Cap the renderer-side list to the same size as the main buffer
 *  (drop oldest on overflow). Keeps the rendered DOM bounded even if
 *  someone holds the panel open through a long DEBUG session. */
const MAX_RENDER = 500;

export interface UseSyncLogs {
  entries: SyncLogEntry[];
  paused: boolean;
  setPaused: (paused: boolean) => void;
  clear: () => void;
  copyAll: () => Promise<void>;
}

export function useSyncLogs(active: boolean): UseSyncLogs {
  const [entries, setEntries] = useState<SyncLogEntry[]>([]);
  const [paused, setPausedState] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    if (!active) return;
    const api = getApi();
    if (!api) return;
    let cancelled = false;
    let detach: (() => void) | null = null;

    void (async () => {
      try {
        const { initial, unsubscribe } = await api.subscribe((batch) => {
          if (pausedRef.current) return;
          setEntries((prev) => {
            const next = prev.concat(batch);
            return next.length > MAX_RENDER
              ? next.slice(next.length - MAX_RENDER)
              : next;
          });
        });
        if (cancelled) {
          unsubscribe();
          return;
        }
        setEntries(initial.slice(-MAX_RENDER));
        detach = unsubscribe;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[useSyncLogs] subscribe failed", err);
      }
    })();

    return () => {
      cancelled = true;
      detach?.();
    };
  }, [active]);

  const setPaused = useCallback((next: boolean) => {
    setPausedState(next);
    const api = getApi();
    void api?.setEnabled(!next);
  }, []);

  const clear = useCallback(() => {
    const api = getApi();
    void api?.clear();
    setEntries([]);
  }, []);

  const copyAll = useCallback(async () => {
    const text = entries
      .map((e) => `[${new Date(e.ts).toISOString()}] ${e.level.toUpperCase()} ${e.message}`)
      .join("\n");
    if (text && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
  }, [entries]);

  return { entries, paused, setPaused, clear, copyAll };
}
