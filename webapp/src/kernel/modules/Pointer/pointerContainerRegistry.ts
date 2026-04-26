export type ContainerHandlers = {
  close: () => void;
  /** Returns true if the action ran, false if blocked (e.g. disabled). */
  confirm?: () => boolean;
};

let handlerMap: Map<string, ContainerHandlers> | null = null;

/** Called once in startModule. Returns the stable Map reference captured by shortcut closures. */
export const initContainerHandlerMap = (): Map<string, ContainerHandlers> => {
  handlerMap = new Map();
  return handlerMap;
};

/** Returns the handler map. Safe to call from components — startModule always runs before first render. */
export const getContainerHandlerMap = (): Map<string, ContainerHandlers> => {
  if (!handlerMap) throw new Error('[Pointer] containerHandlerMap used before startModule ran');
  return handlerMap;
};
