import { contextBridge, ipcRenderer } from "electron";
import storage from "./storage";

// Custom APIs for renderer
// interface for communicating between renderer and main process.
export const api = {
  // constants: ipcRenderer.sendSync("get-app-info") as {paths: {
  //   HOME: string;
  //   CONFIG: string;
  //   TEMP: string;
  // }},
  storage,
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    // contextBridge.exposeInMainWorld('electron', electronAPI) UNSAFE!
    contextBridge.exposeInMainWorld("electron", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  //   window.electron = electronAPI // UNSAFE!
  // @ts-ignore (define in dts)
  window.electron = api;
}
