import type { WriteFileOptions, PathLike } from "fs";
import type { SymlinkType } from "fs-extra";
import type { GlobOptions } from "glob";

export type SessionStorageApi = {
  // listeners
  /**
   * Register a whole-session writer. A listener may return a promise; the
   * session save resolves only once every listener has settled, so callers can
   * know the snapshot is fully on disk.
   */
  registerSessionSaveListener: (listener: () => void | Promise<void>) => void;
  /** Run every registered writer. Resolves when the snapshot is on disk. */
  saveSession: () => Promise<void>;
  getAutoSaverInterval: () => Promise<number | undefined>;
  pauseAutoSessionSaver: () => void;
  resumeAutoSessionSaver: (interval?: number) => void;
}

export type StorageAPI = {
  // file functions
  writeBlob: (
    path: PathLike,
    blob: Blob,
    options?: WriteFileOptions
  ) => Promise<void>;
  appendFile: (
    path: PathLike,
    blob: Blob,
    options?: WriteFileOptions
  ) => Promise<void>;
  readFile: <T = Buffer>(
    path: PathLike, options?: {encoding?: string, flag?: string}
  ) => Promise<T>;
  exists: (path: PathLike) => Promise<boolean>;
  copyFile: (
    sourcePath: PathLike,
    destPath: PathLike,
    flags?: number
  ) => Promise<void>;
  watchFile: (path: PathLike, listener: (blob: Promise<Blob>)=>void) => Promise<void>;
  moveFile: (
    sourcePath: PathLike,
    destPath: PathLike,
    flags?: number)=>Promise<void>;
  deleteFile: (path: PathLike) => Promise<void>;


  symLink: (
    sourcePath: PathLike,
    destPath: PathLike,
    type?: SymlinkType
  ) => Promise<void>;

  // directories
  searchDir: <T = Array<{name: string}> >(dir: PathLike, patterns: string[], options?: GlobOptions | {}) => Promise<T>; // Results<GlobOptions>
  ensureDir: (path: PathLike, options?: {mode: number}) => Promise<void>;
};
