import { useContext, useEffect, useMemo } from "react";
import { FileSystemRegistryContext } from "../contexts/fileSystemRegistry";
import { File } from "../typings";
import type { Mode, OpenMode } from "fs";

export default function (path: string, flags: OpenMode = 'r', mode?: Mode | null): File {
  const storage = window.electron.storage;
  const registry = useContext(FileSystemRegistryContext);

  const file = useMemo(()=>{
    if (registry.openFiles[path]) return registry.openFiles[path]; // Skip if it is already open.

    console.debug(`opening ${path} - ${mode}`);
    const {fd, stats} = storage.open(path, flags, mode);
    const file: File = {
      fd,
      stats,
      read: (encoding, flag) => {
        console.debug(`reading ${path}`);
        return storage.read(path, encoding, flag);
      },
      write: (buffer, options) => {
        console.debug(`writting ${path}`);
        storage.write(path, buffer, options);
      },
      close: () => {
        console.debug(`closing ${path}`);
        storage.close(fd);
      },
    };

    // causes re-render
    registry.addFile(path, file);
    return file
  }, [path, mode])

  useEffect(()=>{
    return ()=> file.close()
  }, [])

  return file
}
