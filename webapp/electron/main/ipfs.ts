import { ipcMain } from "electron";
import { type PathLike } from "fs";
import {
  //types
  type WriteFileOptions,
  ensureDirSync,
} from "fs-extra";
import { type GlobOptionsWithFileTypesTrue } from "glob";
import { getAbsPath } from "./storage";
import { type Helia } from "helia";
import { minimatch } from "minimatch";

export async function initHeliaNode(workspace: string) {
  try {
    const blockStorePath = getAbsPath(
      `workspaces/${workspace}/ipfs/blockstore`
    );
    const dataStorePath = getAbsPath(`workspaces/${workspace}/ipfs/datastore`);
    ensureDirSync(blockStorePath);
    ensureDirSync(dataStorePath);

    // Helia is an ESM-only module but Electron currently only supports CJS
    // at the top level, so we have to use dynamic imports to load it
    const { createHelia } = await import("helia");
    const { FsBlockstore } = await import("blockstore-fs");
    const { FsDatastore } = await import("datastore-fs");

    const blockStore = new FsBlockstore(dataStorePath);
    const dataStore = new FsDatastore(dataStorePath);
    const node = await createHelia({
      blockstore: blockStore,
      datastore: dataStore,
    });
    return node;
  } catch (err) {
    console.error(err);
  }
}

export async function initHeliaHooks(node: Helia) {
  const { mfs } = await import("@helia/mfs");
  const fs = mfs(node);
  // file functions
  ipcMain.on(
    "ipfs-write-blob",
    (event, path, buffer: Blob, options: WriteFileOptions) => {
      buffer.bytes().then((uintArr) => fs.writeBytes(uintArr, path, options));
    }
  );

  ipcMain.handle("ipfs-read-file", async (event, path, options) => {
    return fs.cat(path, options);
  });

  ipcMain.on("ipfs-copy-file", (event, sourcePath, destPath, options) => {
    fs.cp(sourcePath, destPath, options);
  });

  ipcMain.on("ipfs-move-file", (event, sourcePath, destPath, flags) => {
    fs.cp(sourcePath, destPath).then(() => {
      fs.rm(sourcePath);
    });
  });

  ipcMain.on("ipfs-delete-file", (event, path) => {
    fs.rm(path);
  });
  ipcMain.handle("ipfs-exists", async (event, path) => {
    try {
      await fs.stat(path);
      return true
    } catch (error: any) {
      // If the path does not exist, an error (often ENOENT) will be thrown
      if (error.code === "ENOENT") {
        console.log(`Folder does not exist at ${path}`);
        return false;
      } else {
        // Handle other potential errors (e.g., permission issues)
        console.error(`An error occurred: ${error.message}`);
        throw error;
      }
    }
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
      const matchedFiles = [];
      for await (const entry of fs.ls("/")) {
        for (const pattern of patterns) {
          if (minimatch(entry.name, pattern)) {
            matchedFiles.push(entry);
          }
        }
      }

      return matchedFiles;
    }
  );

  ipcMain.on("ipfs-ensure-dir", async (event, path) => {
    try {
      const stat = await fs.stat(path);
      if (stat.type !== "directory") {
        throw Error('there is already a file with that name')
      }
    } catch (error: any) {
      // If the path does not exist, an error (often ENOENT) will be thrown
      if (error.code === "ENOENT") {
        fs.mkdir(path);
      } else {
        // Handle other potential errors (e.g., permission issues)
        console.error(`An error occurred: ${error.message}`);
        throw error;
      }
    }
  });
}
