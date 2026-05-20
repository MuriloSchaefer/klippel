import { contextBridge } from "electron";
import storage from "./storage";
import jazz from "./jazz";

// Whitelisted env vars surfaced to the renderer at preload time. Boot-time
// configuration only — read once when the preload script loads. Keep this
// list minimal; anything beyond debug-workflow knobs should go through a
// proper IPC handler instead of leaking process.env to the renderer.
const env = {
  KLIPPEL_INITIAL_WORKSPACE: process.env.KLIPPEL_INITIAL_WORKSPACE ?? "",
  KLIPPEL_JAZZ_SYNC_URL: process.env.KLIPPEL_JAZZ_SYNC_URL ?? "",
};

// Custom APIs for renderer
// interface for communicating between renderer and main process.
export const api = {
  storage,
  jazz,
  env,
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
