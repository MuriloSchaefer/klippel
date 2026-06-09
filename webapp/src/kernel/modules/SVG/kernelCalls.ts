// graphs manager

import { PostBootInitializationProps, StartModuleProps } from "../base";
import {
  MODULE_NAME,
  SVG_TOOLBOX_CONTEXT_ID,
  SVG_TOOLBOX_ROTATE_SHORTCUT_ID,
  SVG_TOOLBOX_SCALE_SHORTCUT_ID,
  SVG_TOOLBOX_CLIP_SHORTCUT_ID,
} from "./constants";
import middlewares from "./store/middlewares";
import slice, { sessionSaver } from "./store/slice";

const clickToolboxButton = (testId: string) => () =>
  (
    document.querySelector(
      `[data-testid="${testId}"]`,
    ) as HTMLButtonElement | null
  )?.click();

export const startModule = ({
  managers: { storeManager, componentRegistryManager },
  storage,
}: StartModuleProps) => {
  // configure session saver
  const store = storeManager.functions.getStore()
  storage.registerSessionSaveListener(
    store ? sessionSaver(store) : ()=>console.log('Missing store. skipping session save!')
  );

  storeManager.functions.loadReducer(MODULE_NAME, slice.reducer);
  storeManager.functions.registerMiddleware(middlewares);
  //   storeManager.functions.registerMiddleware(ribbonMenuMiddleware);
  //   storeManager.functions.registerMiddleware(viewportMiddleware);
  //   storeManager.functions.registerMiddleware(panelsMiddleware);

  //   componentRegistryManager.functions.createRegistries({
  //     [SECTIONS_REGISTRY_NAME]: {},
  //     [VIEWPORT_TYPE_REGISTRY_NAME]: {
  //       home: HomeViewport,
  //     },
  //   })
};

export function postBootInitialization({
  managers: { keyboardManager },
}: PostBootInitializationProps) {
  // svgtoolbox bindings — registered once here; the toolbar's ShortcutProvider
  // pushes/pops the SVG/Toolbox context while it is on screen (i.e. while an
  // element is selected). Actions click the toolbar buttons by data-testid.
  keyboardManager.functions.registerShortcuts([
    {
      id: SVG_TOOLBOX_ROTATE_SHORTCUT_ID,
      key: "r",
      contextId: SVG_TOOLBOX_CONTEXT_ID,
      action: clickToolboxButton("svgtoolbox-rotate"),
      description: "Rotate mode",
      enabled: true,
    },
    {
      id: SVG_TOOLBOX_SCALE_SHORTCUT_ID,
      key: "s",
      contextId: SVG_TOOLBOX_CONTEXT_ID,
      action: clickToolboxButton("svgtoolbox-scale"),
      description: "Scale mode",
      enabled: true,
    },
    {
      id: SVG_TOOLBOX_CLIP_SHORTCUT_ID,
      key: "x",
      contextId: SVG_TOOLBOX_CONTEXT_ID,
      action: clickToolboxButton("svgtoolbox-clip"),
      description: "Clip into element",
      enabled: true,
    },
  ]);
}
