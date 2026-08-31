/**
 * Reading `.session/` files without letting one of them take the app down.
 *
 * Every restore in this module runs inside a rehydration that builds the
 * store's initial state, before there is a store or an error boundary. A
 * `JSON.parse` that throws there does not degrade a feature — it stops the
 * renderer mounting at all, and the user gets a blank window with nothing in
 * the UI that can fix it.
 *
 * A broken file is not an exotic case either. Session writes are
 * fire-and-forget (`storage.writeBlob` is not awaited), so an app that quits
 * moments after a save leaves a truncated or zero-byte file behind. That is
 * how this was found: a peer killed just after joining a workspace left an
 * empty `dirtyViewports.json`, and every later boot rendered nothing.
 *
 * The trade is one-sided: a dropped session file costs a restored tab, a theme,
 * a panel width. A dropped renderer costs the application.
 */

/** Parse one session file, falling back when it is empty or unreadable. */
export const parseSessionFile = <T>(
  raw: string | null | undefined,
  path: string,
  fallback: T,
): T => {
  if (!raw || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(
      `[Layout] ignoring unreadable session file "${path}" — ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return fallback;
  }
};
