import type { WriteFileOptions, PathLike } from "fs";
import type { SymlinkType } from "fs-extra";
import type { GlobOptions } from "glob";

export type StorageAPI = {
  // listeners
  registerSessionSaveListener: (listener: () => void) => void;
  saveSession: () => void;
  getAutoSaverInterval: () => Promise<number | undefined>;
  pauseAutoSessionSaver: () => void;
  resumeAutoSessionSaver: (interval?: number) => void;
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
