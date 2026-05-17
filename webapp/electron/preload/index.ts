import { contextBridge } from "electron";
import storage from "./storage";
import jazz from "./jazz";

// Custom APIs for renderer
// interface for communicating between renderer and main process.
export const api = {
  storage,
  jazz,
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
  window.electron = api;
}
