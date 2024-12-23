import fs from "fs";
import type { StorageAPI } from "./typings";

// TODO: add restriction to folders to limit renderer access to FS.
export default {
  open: (path, mode) => {
    const fd = fs.openSync(path, mode);
    var stats = fs.statSync(path);

    return {
      path,
      mode,
      fd,
      stats,
    };
  },
  read: (fd, length, position) => {
    let buffer: Buffer = Buffer.from("");

    fs.readSync(fd, buffer, {
      length,
      position,
    });
    return buffer;
  },
  write: (fd, buffer, offset, length, position) => {
    fs.writeSync(fd, Buffer.from(buffer), offset, length, position);
  },
  close: (fd) => {
    fs.closeSync(fd);
  },
} as StorageAPI;
