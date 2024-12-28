
import type { Stats, Mode, WriteFileOptions, PathLike, OpenMode} from 'fs'

type File = {
    path: string,
    mode: Mode,
    fd: number
    stats: Stats,
}

export type StorageAPI = {
  // files
  open: (path: PathLike, flags: OpenMode, mode?: Mode | null) => File
  read: (path: string, encoding?: BufferEncoding | null | undefined, flag?: string) => Buffer
  write: (pathOrFd: string | number, buffer: NodeJS.ArrayBufferView | string, options: WriteFileOptions)=>void
  close: (fd: number)=>void

  // directories
  search: (q: string, ext: string)=>any
  list: (path: string)=>void
  createDir: (path: string)=>void
  deleteDir: (path: string)=>void
  createFile: (path: string, buffer: Buffer)=>void
  deleteFile: (path: string)=>void
  dirStats: (path: string)=>any
};
