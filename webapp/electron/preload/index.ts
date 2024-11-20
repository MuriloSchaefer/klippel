import { contextBridge } from 'electron'
// import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
// interface for communicating between renderer and main process.
const api = {
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    // contextBridge.exposeInMainWorld('electron', electronAPI) UNSAFE!
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
//   window.electron = electronAPI // UNSAFE!
  // @ts-ignore (define in dts)
  window.api = api
}
