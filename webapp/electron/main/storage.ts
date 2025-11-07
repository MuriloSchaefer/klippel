import { ipcMain, app } from "electron";
import { type PathLike } from "fs";
import {
  //files
  outputFile,
  appendFile,
  watchFile,
  symlink,
  copyFile,
  remove,
  readFileSync,
  existsSync,
  //dirs
  ensureDir,
  //types
  type WriteFileOptions,
} from "fs-extra";
import { glob, type GlobOptionsWithFileTypesTrue } from "glob";
import { SimpleIntervalJob, Task, type ToadScheduler } from "toad-scheduler";
import type { BrowserWindow } from "electron/main";
import { resolve } from "path";

export const HOME = app.getPath("home") + "/klippel/envs/" + process.env["ENV_NAME"];
export function getAbsPath(path: PathLike, onError?: (err: Error) => void) {
  const absPath = resolve(`${HOME}/${path}`);
  let err;
  if (!absPath.startsWith(HOME)) {
    err = Error("Cannot navegate outside home dir.");
    console.error(`Trying to access outside folder: ${absPath}`);
    onError?.(err);
    throw Error("cannot access data outside home folder");
  }

  return absPath;
}

const storeSessionFile = ".session/Store/state.json";
let storeSessionState: { sessionAutoSaveInterval?: number } | undefined =
  undefined;
if (existsSync(storeSessionFile)) {
  storeSessionState = JSON.parse(
    readFileSync(storeSessionFile, { encoding: "utf-8" })
  );
}
let sessionAutoSaverInterval: number | undefined =
  storeSessionState?.sessionAutoSaveInterval;

export function initStorageHooks(
  scheduler: ToadScheduler,
  mainWindow: BrowserWindow
) {
  // file functions
  ipcMain.on(
    "write-blob",
    (event, path, buffer, options: WriteFileOptions | string) => {
      const absPath = getAbsPath(path, (err) =>
        event.sender.send("write-blob-error", err.message)
      );
      if (!absPath) return;

      outputFile(absPath, buffer, options, (err) => {
        if (err) {
          event.sender.send("write-blob-error", err.message);
        } else {
          event.sender.send("blob-written", path);
        }
      });
    }
  );

  ipcMain.on("append-file", (event, path, buffer, options) => {
    const absPath = getAbsPath(path, (err) =>
      event.sender.send("append-file-error", err.message)
    );
    if (!absPath) return;

    appendFile(absPath, buffer, (err) => {
      if (err) {
        event.sender.send("append-file-error", err.message);
      } else {
        event.sender.send("file-appended", path);
      }
    });
  });

  ipcMain.handle("read-file", async (event, path, options) => {
    const absPath = getAbsPath(path, (err) =>
      event.sender.send(`file-read-${path}-error`, err.message)
    );
    if (!absPath) return;
    return readFileSync(absPath, options);
  });

  ipcMain.on("copy-file", (event, sourcePath, destPath, flags) => {
    const absSourcePath = getAbsPath(sourcePath);
    const absDestPath = getAbsPath(destPath);
    if (!absSourcePath || !absDestPath) return;
    if (absSourcePath === absDestPath) {
      event.sender.send(
        "copy-file-error",
        "Source and destination paths are the same"
      );
      return;
    }
    copyFile(absSourcePath, absDestPath, flags, (err) => {
      if (err) {
        event.sender.send("copy-file-error", err.message);
      } else {
        event.sender.send("file-copied", destPath);
      }
    });
  });

  ipcMain.on("watch-file", (event, path) => {
    const absPath = getAbsPath(path, (err) =>
      event.sender.send(`file-watch-${path}-error`, err.message)
    );
    if (!absPath) return;
    watchFile(absPath, (curr, prev) => {
      const eventPrefix = `file-watch-${path}`;
      if (curr.mtime !== prev.mtime) {
        event.sender.send(`${eventPrefix}-changed`, path);
      }
    });
  });

  ipcMain.on("move-file", (event, sourcePath, destPath, flags) => {
    const absSourcePath = getAbsPath(sourcePath, (err) =>
      event.sender.send("move-file-error", err.message)
    );
    const absDestPath = getAbsPath(destPath, (err) =>
      event.sender.send("move-file-error", err.message)
    );
    if (!absSourcePath || !absDestPath) return;
    if (absSourcePath === absDestPath) {
      event.sender.send(
        "move-file-error",
        "Source and destination paths are the same"
      );
      return;
    }
    copyFile(absSourcePath, absDestPath, flags, (err) => {
      if (err) {
        event.sender.send("move-file-error", err.message);
      } else {
        event.sender.send("file-moved", destPath);
      }
    });
  });

  ipcMain.on("sym-link", (event, sourcePath, destPath, type) => {
    const absSourcePath = getAbsPath(sourcePath, (err) =>
      event.sender.send("sym-link-error", err.message)
    );
    const absDestPath = getAbsPath(destPath, (err) =>
      event.sender.send("sym-link-error", err.message)
    );
    if (!absSourcePath || !absDestPath) return;
    if (absSourcePath === absDestPath) {
      event.sender.send(
        "sym-link-error",
        "Source and destination paths are the same"
      );
      return;
    }
    symlink(absSourcePath, absDestPath, type, (err) => {
      if (err) {
        event.sender.send("sym-link-error", err.message);
      } else {
        event.sender.send("file-symlinked", destPath);
      }
    });
  });
  ipcMain.on("delete-file", (event, path) => {
    const absPath = getAbsPath(path, (err) =>
      event.sender.send("delete-file-error", err.message)
    );
    if (!absPath) return;
    remove(absPath, (err) => {
      if (err) {
        event.sender.send("delete-file-error", err.message);
      } else {
        event.sender.send("file-deleted", path);
      }
    });
  });
  ipcMain.handle("exists", (event, path) => {
    const absPath = getAbsPath(path, (err) =>
      event.sender.send("exists-error", err.message)
    );
    if (!absPath) return;
    return existsSync(absPath);
  });

  // Directory functions

  ipcMain.handle(
    "search-dir",
    async (
      event,
      dir: PathLike,
      patterns: string[],
      options: Omit<GlobOptionsWithFileTypesTrue, "cwd"> = {
        stat: true,
        withFileTypes: true,
      }
    ) => {
      // ts-ignore
      const absDir = getAbsPath(dir, (err) =>
        event.sender.send("search-dir-error", err.message)
      );
      if (!absDir) return;
      return glob(patterns, { ...options, cwd: absDir });
    }
  );

  ipcMain.on("ensure-dir", (event, path) => {
    const absPath = getAbsPath(path, (err) =>
      event.sender.send("create-dir-error", err.message)
    );
    if (!absPath) return;
    ensureDir(absPath, (err) => {
      if (err) {
        event.sender.send("create-dir-error", err.message);
      } else {
        event.sender.send("dir-created", path);
      }
    });
  });

  ipcMain.on("pause-session-auto-saver", () => {
    sessionAutoSaverInterval = undefined;
    scheduler.removeById("save-session");
  });
  ipcMain.on("resume-session-auto-saver", (_, interval) => {
    sessionAutoSaverInterval = interval;
    scheduler.addSimpleIntervalJob(
      new SimpleIntervalJob(
        { seconds: interval, runImmediately: false },
        saveSessionTask,
        { id: "save-session", preventOverrun: true }
      )
    );
  });

  // Scheduler tasks
  const saveSessionTask = new Task("save-session", () => {
    console.debug("Call save session!");
    mainWindow.webContents.send("save-session");
  });

  if (sessionAutoSaverInterval) {
    scheduler.addSimpleIntervalJob(
      new SimpleIntervalJob(
        { seconds: sessionAutoSaverInterval, runImmediately: false },
        saveSessionTask,
        { id: "save-session", preventOverrun: true }
      )
    );
  }
}
