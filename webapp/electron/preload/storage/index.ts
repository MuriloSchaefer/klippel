import fs from "fs-extra";
import type { StorageAPI } from "./typings";

// TODO: add restriction to folders to limit renderer access to FS.
export default {
  open: (path, flags, mode) => {
    const fd = fs.openSync(path, flags, mode);
    var stats = fs.statSync(path);

    return {
      path,
      mode,
      fd,
      stats,
    };
  },
  read: (path, encoding = "utf-8", flag = "r") => {
    const buffer = fs.readFileSync(path, { encoding, flag });
    return buffer;
  },
  write: (pathOrFd, buffer, options) => {
    fs.writeFileSync(pathOrFd, buffer, options);
  },
  close: (fd) => {
    console.debug(`closing file ${fd}`);
    try {
      fs.closeSync(fd);
    } catch (err) {
      console.error(err);
    }
  },

  dirStats: (path) => {
    return fs.statSync(path);
  },
} as StorageAPI;
