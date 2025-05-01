import type { PathLike } from "fs";
import type { StorageAPI } from "./typings";
import { ipcRenderer, IpcRendererEvent } from "electron";
import { resolve } from "path";

const info = ipcRenderer.sendSync("get-app-info");

ipcRenderer.on("blob-written", (event, path) => {
  console.log("Saved file " + path);
});
ipcRenderer.on("write-blob-error", (event, errMessage) => {
  console.error("Error writting blob: " + errMessage);
});

ipcRenderer.on("file-appended", (event, path) => {
  console.log("File appended " + path);
});
ipcRenderer.on("append-file-error", (event, errMessage) => {
  console.error("Error appending file: " + errMessage);
});

ipcRenderer.on("file-copied", (event, path) => {
  console.log("File copied " + path);
});
ipcRenderer.on("copy-file-error", (event, errMessage) => {
  console.error("Error copying file: " + errMessage);
});
ipcRenderer.on("file-moved", (event, path) => {
  console.log("File moved " + path);
});
ipcRenderer.on("move-file-error", (event, errMessage) => {
  console.error("Error moving file: " + errMessage);
});

ipcRenderer.on("file-symlinked", (event, path) => {
  console.log("File sym linked " + path);
});
ipcRenderer.on("sym-link-error", (event, errMessage) => {
  console.error("Error sym linking file: " + errMessage);
});

ipcRenderer.on("file-deleted", (event, path) => {
  console.log("File deleted" + path);
});
ipcRenderer.on("delete-file-error", (event, errMessage) => {
  console.error("Error deleting file: " + errMessage);
});


export default {
  writeBlob: async (path, blob, options = {}) => {
    const buffer = Buffer.from(await blob.arrayBuffer());

    ipcRenderer.send("write-blob", path, buffer, options);
  },
  appendFile: async (path, blob, options = {}) => {
    const buffer = Buffer.from(await blob.arrayBuffer());

    ipcRenderer.send("append-file", path, buffer, options);
  },
  readFile: async (path) => {
    ipcRenderer.once(`file-read-${path}-error`, (event, errMessage) => {
      console.error("Error reading file: " + errMessage);
    });

    return ipcRenderer.invoke("read-file", path);
  },
  copyFile: async (sourcePath, destPath, flags) => {
    ipcRenderer.send("copy-file", sourcePath, destPath, flags);
  },
  watchFile: async (path, listener) => {
    console.debug(`Watching file ${path}`);
    const errorCallback = (event: IpcRendererEvent, err: string) =>
      console.error("Error watching file: " + err);
    ipcRenderer.on(`file-watch-${path}-error`, errorCallback);

    ipcRenderer.on(`file-watch-${path}-changed`, (path) => {
      listener(ipcRenderer.invoke("read-file", path));
    });
  },
  moveFile: async (sourcePath, destPath, flags) => {
    ipcRenderer.send("move-file", sourcePath, destPath, flags);
  },
  symLink: (sourcePath, destPath, type) => {
    ipcRenderer.send("sym-link", sourcePath, destPath, type);
  },
  deleteFile: async (path) => {
    ipcRenderer.send("delete-file", path);
  },

  // directory methods
  searchDir: async (dir, patterns, options) => {
    return ipcRenderer.invoke("search-dir", dir, patterns, options);
  },
  ensureDir: async (
    path,
    options = {
      mode: 666,
    }
  ) => {
    ipcRenderer.send("ensure-dir", path, options);
  },
} as StorageAPI;
