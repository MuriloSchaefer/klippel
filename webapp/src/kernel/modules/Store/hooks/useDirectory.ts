// import type { Mode } from "fs";
import { useMemo } from "react";
import { type Directory } from "../typings";

export default function (path: string): Directory {
  const storage = window.electron.storage;

  const dir: Directory = useMemo(()=>({
    path,
    stats: storage.dirStats(path),
    search(q, ext){},
    list(){
      return storage.list(path)
    },
    createDir(name){
      return storage.createDir(`${path}/${name}`)
    },
    deleteDir(name){
      return storage.deleteDir(`${path}/${name}`)
    },
    createFile(name, buffer){
      return storage.createFile(`${path}/${name}`, buffer)
    },
    deleteFile(name){
      return storage.deleteFile(`${path}/${name}`)
    },
  }), [path])

  return dir
}
