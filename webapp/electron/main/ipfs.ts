import { ipcMain, app } from "electron";
import { type PathLike } from "fs";
import {
  //files
  outputFile,
  appendFile,
  watchFile,
  copyFile,
  remove,
  readFileSync,
  existsSync,
  //dirs
  ensureDir,
  //types
  type WriteFileOptions,
  ensureDirSync,
} from "fs-extra";
import { glob, type GlobOptionsWithFileTypesTrue } from "glob";
import { type ToadScheduler } from "toad-scheduler";
import type { BrowserWindow } from "electron/main";
import { getAbsPath } from "./storage";
import { Helia } from "helia";

export async function initHeliaNode(workspace: string){
  try {
    ensureDirSync(getAbsPath(`workspaces/${workspace}/ipfs/blockstore`))
    ensureDirSync(getAbsPath(`workspaces/${workspace}/ipfs/datastore`))
    // Helia is an ESM-only module but Electron currently only supports CJS
    // at the top level, so we have to use dynamic imports to load it
    const { createHelia } = await import('helia');
    const { FsBlockstore } = await import('blockstore-fs')
    const { FsDatastore } = await import('datastore-fs')

    const blockStore = new FsBlockstore(getAbsPath(`workspaces/${workspace}/ipfs/blockstore`))
    const dataStore = new FsDatastore(getAbsPath(`workspaces/${workspace}/ipfs/datastore`))
    const node = createHelia({
      blockstore: blockStore,
      datastore: dataStore,

    })
    console.log(node)
    return node
  } catch (err) {
    console.error(err)
  }

}

export function initHeliaHooks(
  node: Helia
) {
  // file functions
  ipcMain.on(
    "ipfs-write-blob",
    (event, path, buffer, options: WriteFileOptions | string) => {

      outputFile(absPath, buffer, options, (err) => {
        if (err) {
          event.sender.send("write-blob-error", err.message);
        } else {
          event.sender.send("blob-written", path);
        }
      });
    }
  );

  ipcMain.on("ipfs-append-file", (event, path, buffer, options) => {

    appendFile(absPath, buffer, (err) => {
      if (err) {
        event.sender.send("append-file-error", err.message);
      } else {
        event.sender.send("file-appended", path);
      }
    });
  });

  ipcMain.handle("ipfs-read-file", async (event, path, options) => {
    return readFileSync(absPath, options);
  });

  ipcMain.on("ipfs-copy-file", (event, sourcePath, destPath, flags) => {
    
    copyFile(absSourcePath, absDestPath, flags, (err) => {
      if (err) {
        event.sender.send("copy-file-error", err.message);
      } else {
        event.sender.send("file-copied", destPath);
      }
    });
  });

  ipcMain.on("ipfs-watch-file", (event, path) => {
    
    watchFile(absPath, (curr, prev) => {
      const eventPrefix = `file-watch-${path}`;
      if (curr.mtime !== prev.mtime) {
        event.sender.send(`${eventPrefix}-changed`, path);
      }
    });
  });

  ipcMain.on("ipfs-move-file", (event, sourcePath, destPath, flags) => {
    
    copyFile(absSourcePath, absDestPath, flags, (err) => {
      if (err) {
        event.sender.send("move-file-error", err.message);
      } else {
        event.sender.send("file-moved", destPath);
      }
    });
  });

  ipcMain.on("ipfs-delete-file", (event, path) => {
    
    remove(absPath, (err) => {
      if (err) {
        event.sender.send("delete-file-error", err.message);
      } else {
        event.sender.send("file-deleted", path);
      }
    });
  });
  ipcMain.handle("exists", (event, path) => {
    
    return existsSync(absPath);
  });

  // Directory functions

  ipcMain.handle(
    "ipfs-search-dir",
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
      return glob(patterns, { ...options, cwd: absDir });
    }
  );

  ipcMain.on("ipfs-ensure-dir", (event, path) => {
    
    
    ensureDir(absPath, (err) => {
      if (err) {
        event.sender.send("create-dir-error", err.message);
      } else {
        event.sender.send("dir-created", path);
      }
    });
  });
}
