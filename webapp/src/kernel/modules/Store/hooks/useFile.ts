// import type { Mode } from "fs";
import { useContext, useMemo } from "react";
import { FileSystemRegistryContext } from "../contexts/fileSystemRegistry";
import { File } from "../typings";

export default function (path: string, mode: string | number = "r"): File {
  const storage = window.electron.storage;
  const registry = useContext(FileSystemRegistryContext);

  const file = useMemo(()=>{
    if (registry.openFiles[path]) return registry.openFiles[path]; // Skip if it is already open.

    console.debug(`opening ${path} - ${mode}`);
    const {fd, stats} = storage.open(path, mode);
    const file: File = {
      fd,
      stats,
      read: (length, position) => {
        console.debug(`reading ${path}`);

        // grab from window since this object lifecycle is different than the hook one.
        // hook will get destroyed and collected by GC after each re-render.
        // file will be held in a context to further use. Therefore it should not have references to outside.
        const storage = window.electron.storage;
        const buffer = storage.read(fd, length, position);
        return buffer;
      },
      write: (buffer, offset, length, position) => {
        console.debug(`writting ${path}`);

        const storage = window.electron.storage;
        storage.write(fd, buffer, offset, length, position);
      },
      close: () => {
        //console.log("close");
        storage.close(fd);
      },
    };

    // causes re-render
    registry.addFile(path, file);
    return file
  }, [path, mode])

  return file
}
