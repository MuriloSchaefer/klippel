import { app, ipcMain } from "electron";
import { type PathLike } from "fs";
import {
  //files
  outputFile,
  appendFile,
  watchFile,
  symlink,
  copyFile,
  readFile,
  remove,
  //dirs
  ensureDir,
  //types
  type WriteFileOptions,
} from "fs-extra";
import { resolve } from "path";
import { glob, type GlobOptionsWithFileTypesTrue } from "glob";

function getAbsPath(path: PathLike, onError?: (err: Error) => void) {
  const HOME = app.getPath("home") + "/klippel";
  const absPath = resolve(`${HOME}/${path}`);
  let err;
  if (!absPath.startsWith(HOME)) {
    err = Error("Cannot navegate outside home dir.");
    console.error(`Trying to access outside folder: ${absPath}`);
    onError?.(err);
    return;
  }

  return absPath;
}

export function initStorageHooks() {
  console.debug("initializingHooks");
  ipcMain.on(
    "write-blob",
    (event, path, buffer, options: WriteFileOptions | string) => {
      const absPath = getAbsPath(path, (err) =>
        event.sender.send("write-blob-error", err.message)
      );
      if (!absPath) return;

      console.debug(
        `storage function=write-blob size=${buffer.length} path=${absPath}`
      );
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

  ipcMain.handle("read-file", async (event, path) => {
    const absPath = getAbsPath(path, (err) =>
      event.sender.send(`file-read-${path}-error`, err.message)
    );
    if (!absPath) return;

    readFile(absPath, (err, data) => {
      if (err) {
        event.sender.send(`file-read-${path}-error`, err.message);
      } else {
        return Buffer.from(data);
      }
    });
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
  })


  // Directory functions

  ipcMain.handle(
    "search-dir",
    async (
      event,
      dir: PathLike,
      patterns: string[],
      options: GlobOptionsWithFileTypesTrue = {
        stat: true,
        withFileTypes: true,
      }
    ) => {
      // ts-ignore
      const absDir = getAbsPath(dir, (err) =>
        event.sender.send("search-dir-error", err.message)
      );
      if (!absDir) return;
      return glob(patterns, options);
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
}
