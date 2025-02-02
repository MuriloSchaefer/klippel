import { useCallback, useEffect, useMemo, useState } from "react";
import type { Stats } from "fs";

export default function (
  path: string,
  encoding: BufferEncoding = "utf-8",
  options?: {
    encoding?: BufferEncoding | null | undefined;
    persistent?: boolean | undefined;
    recursive?: boolean | undefined;
  },
    errorHandler?: (e: unknown) => void
  ): Buffer | undefined {
  const storage = window.electron.storage;
  const [_state, setState] = useState<
    { event: "rename" | "change"; filename?: string } | undefined
  >();

  const content = useMemo(() => {
    try {
      console.log('reading file')
      return storage.read(path, encoding);
    } catch (e) {
      console.error(e)
      errorHandler?.(e);
      return undefined;
    }
  }, [path, _state]);
  const listener = useCallback(
    (event: "rename" | "change", filename?: string) =>{
      setState({ event, filename })
    },
    []
  );

  useEffect(() => {
    storage.watch(path, listener, options);
  }, [listener]);

  return content;
}
