// import type { Mode } from "fs";
import { useContext, useMemo } from "react";
import { type File, type Directory } from "../typings";
import { FileSystemRegistryContext } from "../contexts/fileSystemRegistry";

export default function (path: string, createIfNotFound: boolean = true): Directory {
  const storage = window.electron.storage;
  const registry = useContext(FileSystemRegistryContext);
  
  if (createIfNotFound){
    // TODO: create if does not exists.
  }

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
    openFile(subPath, flags, mode){
      const absPath = `${path}/${subPath}`
      if (registry.openFiles[absPath]) return registry.openFiles[absPath];

      console.debug(`opening ${path} - ${mode}`);
      const {fd, stats} = storage.open(absPath, flags, mode)
      const file: File = {
        fd,
        stats,
        read: (encoding, flag) => {
          console.debug(`reading ${absPath}`);
          return storage.read(absPath, encoding, flag);
        },
        write: (buffer, options) => {
          console.debug(`writting ${absPath}`);
          storage.write(absPath, buffer, options);
        },
        close: () => {
          console.debug(`closing ${absPath}`);
          storage.close(fd);
        },
      };
      registry.addFile(absPath, file);
      return file
    }
  }), [path])

  return dir
}
