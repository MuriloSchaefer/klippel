import type { PathLike } from "fs";

const storage = globalThis.electron.storage;

let cached: string | null = null;

const sanitize = (workspace: string): string => {
  const s = String(workspace).replace(/[\\/]/g, "").replace(/\.\./g, "");
  if (!s) throw new Error("workspaceScope: empty workspace name");
  return s;
};

export const getCurrentWorkspace = async (): Promise<string> => {
  if (cached) return cached;
  try {
    const exists = await storage.exists(".session/Store/state.json");
    if (!exists) {
      cached = "pessoal";
      return cached;
    }
    const content = await storage.readFile<string>(".session/Store/state.json", {
      encoding: "utf-8",
    });
    const parsed = JSON.parse(content) as { selectedWorkspace?: string };
    cached = parsed?.selectedWorkspace || "pessoal";
  } catch {
    cached = "pessoal";
  }
  return cached;
};

export const setCurrentWorkspace = (ws: string): void => {
  cached = sanitize(ws);
};

const scope = (workspace: string, path: PathLike): string => {
  const ws = sanitize(workspace);
  const p = String(path).replace(/^\/+/, "");
  return `workspaces/${ws}/${p}`;
};

type Storage = typeof storage;

export const forWorkspace = (workspace: string): Storage =>
  ({
    writeBlob: (path, blob, opts) =>
      storage.writeBlob(scope(workspace, path), blob, opts),
    appendFile: (path, blob, opts) =>
      storage.appendFile(scope(workspace, path), blob, opts),
    readFile: <T = Buffer>(path: PathLike, opts?: { encoding?: string; flag?: string }) =>
      storage.readFile<T>(scope(workspace, path), opts),
    exists: (path) => storage.exists(scope(workspace, path)),
    copyFile: (src, dst, flags) =>
      storage.copyFile(scope(workspace, src), scope(workspace, dst), flags),
    watchFile: (path, listener) =>
      storage.watchFile(scope(workspace, path), listener),
    moveFile: (src, dst, flags) =>
      storage.moveFile(scope(workspace, src), scope(workspace, dst), flags),
    deleteFile: (path) => storage.deleteFile(scope(workspace, path)),
    symLink: (src, dst, type) =>
      storage.symLink(scope(workspace, src), scope(workspace, dst), type),
    searchDir: <T = Array<{ name: string }>>(
      dir: PathLike,
      patterns: string[],
      opts?: object,
    ) => storage.searchDir<T>(scope(workspace, dir), patterns, opts),
    ensureDir: (path, opts) => storage.ensureDir(scope(workspace, path), opts),
  }) as Storage;

export const currentWorkspaceStorage = async (): Promise<Storage> =>
  forWorkspace(await getCurrentWorkspace());

// Storage handle that re-resolves the workspace on every operation. Use this
// when the consumer's lifetime can span a workspace switch (e.g. per-graph
// instances that get persisted long after module-import time). Callers must
// have awaited `getCurrentWorkspace()` at least once to warm the cache —
// `Store/slice.ts` does this during boot.
export const workspaceStorage: Storage = new Proxy({} as Storage, {
  get(_target, prop) {
    if (!cached) {
      throw new Error(
        `workspaceStorage.${String(prop)} accessed before cache warmup. ` +
        `Ensure getCurrentWorkspace() was awaited (Store slice boot does this).`,
      );
    }
    const handle = forWorkspace(cached) as unknown as Record<string, unknown>;
    return handle[prop as string];
  },
});
