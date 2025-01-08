import fse from "fs-extra";
import fs from "fs";
import type { PathLike } from "fs";
import type { StorageAPI } from "./typings";
import { ipcRenderer } from "electron";
import { resolve } from "path";

const info = ipcRenderer.sendSync("get-app-info");

function getAbsPath(path: PathLike) {
  const absPath = resolve(`${info.paths.HOME}/${path}`);
  if (!absPath.startsWith(info.paths.HOME))
    throw Error("Cannot navegate outside home dir.");
  return absPath;
}

export default {
  open: (path, flags, mode) => {
    const absPath = getAbsPath(path);
    const fd = fse.openSync(absPath, flags, mode);
    var stats = fse.statSync(absPath);

    return {
      path,
      mode,
      fd,
      stats,
    };
  },
  read: (path, encoding = "utf-8", flag = "r") => {
    const absPath = getAbsPath(path);
    const buffer = fse.readFileSync(absPath, { encoding, flag });
    return buffer;
  },
  write: (pathOrFd, buffer, options) => {
    const absPathOrFd =
      typeof pathOrFd === "string" ? getAbsPath(pathOrFd) : pathOrFd;
    fse.writeFileSync(absPathOrFd, buffer, options);
  },
  close: (fd) => {
    console.debug(`closing file ${fd}`);
    try {
      fse.closeSync(fd);
    } catch (err) {
      console.error(err);
    }
  },
  copy: (sourcePath, destPath, flags) => {
    fse.copyFileSync(sourcePath, destPath, flags);
  },
  move: (sourcePath, destPath, opts) => {
    fse.moveSync(getAbsPath(sourcePath), getAbsPath(destPath), opts);
  },
  watch: (path, listener, options) => {
    fs.watch(getAbsPath(path), options ?? null, listener)
    return
    const stat = fs.statSync(getAbsPath(path))

    if (stat.isSymbolicLink()){
      const realPath = fs.readlinkSync(getAbsPath(path))
      fs.watch(getAbsPath(realPath), options ?? null, listener);
    }else{
      ;
    }
    
  },
  symLink: (sourcePath, destPath, type)=>{
    fse.symlinkSync(getAbsPath(sourcePath), getAbsPath(destPath), type)
  },

  // directory methods
  search: (query, g) => {
    // glob(g, {cwd: info.paths.HOME}, function(err, matches) {
    //   console.log(matches)
    // })
  },
  list: (path) => fse.readdirSync(getAbsPath(path)),
  createDir: (path) => fse.mkdirSync(getAbsPath(path), { recursive: true }),
  deleteDir: (path) => fse.removeSync(getAbsPath(path)),
  createFile: () => {},
  deleteFile: (path) => fse.removeSync(getAbsPath(path)),
  dirStats: (path) => fse.statSync(getAbsPath(path)),
} as StorageAPI;
