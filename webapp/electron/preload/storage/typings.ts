
import type { Stats, Mode} from 'fs'

type File = {
    path: string,
    mode: Mode,
    fd: number
    stats: Stats,
}

export type StorageAPI = {
  open: (path: string, mode: Mode) => File

  read: (fd: number, length?: number, position?: number) => Buffer
  write: (fd: number, buffer: Uint8Array | ReadonlyArray<number> | string, offset?:number, length?:number, position?:number)=>void

  close: (fd: number)=>void
};
