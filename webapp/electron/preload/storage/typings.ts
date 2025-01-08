import type { Stats, Mode, WriteFileOptions, PathLike, OpenMode } from "fs";
import type { MoveOptions, SymlinkType } from "fs-extra";

type FileMetadata = {
  path: string;
  mode: Mode;
  fd: number;
  stats: Stats;
};

export type StorageAPI = {
  // files
  open: (path: PathLike, flags: OpenMode, mode?: Mode | null) => FileMetadata;
  read: (
    path: PathLike,
    encoding?: BufferEncoding | null | undefined,
    flag?: string
  ) => Buffer;
  write: (
    pathOrFd: string | number,
    buffer: NodeJS.ArrayBufferView | string,
    options: WriteFileOptions
  ) => void;
  close: (fd: number) => void;
  copy: (sourcePath: PathLike, destPath: PathLike, flags: number) => void;
  move: (
    sourcePath: PathLike,
    destPath: PathLike,
    options: MoveOptions
  ) => void;
  watch: (
    path: PathLike,
    listener: (event: "rename" | "change", filename: string) => void,
    options?: {
      encoding?: BufferEncoding | null | undefined;
      persistent?: boolean | undefined;
      recursive?: boolean | undefined;
    }
  ) => void;
  symLink: (
    sourcePath: PathLike,
    destPath: PathLike,
    type?: SymlinkType
  ) => void;

  // directories
  search: (q: string, glob: string) => any;
  list: (path: string) => void;
  createDir: (path: string) => void;
  deleteDir: (path: string) => void;
  createFile: (path: string, buffer: Buffer) => void;
  deleteFile: (path: string) => void;
  dirStats: (path: string) => any;
};
