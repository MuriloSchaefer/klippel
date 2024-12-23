import React, { createContext, useMemo, useState } from "react";
import { Directory, File } from "../typings";

export type FileSystemRegistryType = {
  openFiles: {
    [path: string]: File;
  };
  openDirectories: {
    [path: string]: Directory;
  };
  addFile: (path: string, file: File) => void;
  removeFile: (path: string) => void;
  addDirectory: (path: string, directory: Directory) => void;
  removeDirectory: (path: string) => void;
};
const INITIAL_VALUE = {
  openFiles: {},
  openDirectories: {},
  addFile: () => null,
  removeFile: () => null,
  addDirectory: () => null,
  removeDirectory: () => null,
};
export const FileSystemRegistryContext =
  createContext<FileSystemRegistryType>(INITIAL_VALUE);

export const Provider = ({
  children,
}: {
  children: React.ReactElement | React.ReactElement[];
}) => {
  const [state, setState] = useState<FileSystemRegistryType>(INITIAL_VALUE);
  const actions: Omit<FileSystemRegistryType, 'openDirectories' | 'openFiles'> = {
    addFile: (path, file) =>
      setState((state) => ({
        ...state,
        openFiles: { ...state.openFiles, [path]: file },
      })),
    removeFile: (path) =>
      setState((state) => ({
        ...state,
        openFiles: Object.entries(state.openFiles).reduce(
          (acc, [p, f]) => (p === path ? acc : { ...acc, [p]: f }),
          {}
        ),
      })),
    addDirectory: (path, dir) =>
      setState((state) => ({
        ...state,
        openDirectories: { ...state.openDirectories, [path]: dir },
      })),
    removeDirectory: (path) =>
      setState((state) => ({
        ...state,
        openDirectories: Object.entries(state.openDirectories).reduce(
          (acc, [p, d]) => (p === path ? acc : { ...acc, [p]: d }),
          {}
        ),
      })),
  };
  const values = useMemo<FileSystemRegistryType>(
    () => ({
      ...state,
      ...actions
    }),
    [state]
  );

  return (
    <FileSystemRegistryContext.Provider value={values}>
      {children}
    </FileSystemRegistryContext.Provider>
  );
};

export default React.memo(Provider);
