import type { Stats, Mode, WriteFileOptions, PathLike, OpenMode } from "fs";
import type { MoveOptions, SymlinkType } from "fs-extra";
import type { GlobOptionsWithFileTypesTrue } from "glob";

type FileMetadata = {
  path: string;
  mode: Mode;
  fd: number;
  stats: Stats;
};

export type StorageAPI = {
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
  readFile: (
    path: PathLike,
  ) => Promise<Blob>;
  copyFile: (
    sourcePath: PathLike,
    destPath: PathLike,
    flags?: number
  ) => Promise<void>;
  watchFile: (path: PathLike, listener: (blob: Promise<Blob>)=>void) => void;
  moveFile: (
    sourcePath: PathLike,
    destPath: PathLike,
    flags?: number)=>void;
  deleteFile: (path: PathLike) => void;


  symLink: (
    sourcePath: PathLike,
    destPath: PathLike,
    type?: SymlinkType
  ) => void;

  // directories
  searchDir: (dir: PathLike, patterns: string[], options: GlobOptionsWithFileTypesTrue) => Promise<FileMetadata[]>;
  ensureDir: (path: PathLike, options?: {mode: number}) => void;
};
