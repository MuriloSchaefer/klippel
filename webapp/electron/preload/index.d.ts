// import { ElectronAPI } from '@electron-toolkit/preload'
import type { StorageAPI } from './storage/typings'

type API = {
  storage: StorageAPI
}

declare global {
  interface Window {
    // electron: ElectronAPI
    api: unknown
  }
}
