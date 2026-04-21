// graphs manager
import {
  MODULE_NAME,
  SECTIONS_REGISTRY_NAME,
  SYSTEM_TRAY_REGISTRY_NAME,
  VIEWPORT_TYPE_REGISTRY_NAME,
} from "../constants";
import layoutMiddleware from "../store/middlewares";
import ribbonMenuMiddleware from "../store/ribbonMenu/middlewares";
import viewportMiddleware from "../store/viewports/middlewares";
import viewportGroupsMiddleware from "../store/viewports/groups/middlewares";
import panelsMiddleware from "../store/panels/middlewares";

import slice, { sessionSaver } from "../store/slice";
import { PostBootInitializationProps, StartModuleProps } from "@kernel/modules/base";
import HomeViewport from "../components/ViewportManager/HomeViewport";
import { switchTheme } from "../store/actions";
import { type PaletteMode } from "@mui/material";
import { selectTab } from "../store/ribbonMenu/actions";

export const startModule = ({
  dispatch,
  managers: { storeManager, componentRegistryManager },
  storage,
}: StartModuleProps) => {
  // configure session saver
  const store = storeManager.functions.getStore()
  storage.registerSessionSaveListener(
    store ? sessionSaver(store) : ()=>console.log('Missing store. skipping session save!')
  );

  storeManager.functions.loadReducer(MODULE_NAME, slice.reducer);

  const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
  const storedTheme = localStorage.getItem("theme");
  if (darkThemeMq.matches && !storedTheme) {
    dispatch(switchTheme({ theme: "dark" }));
  } else if (storedTheme) {
    dispatch(switchTheme({ theme: storedTheme as PaletteMode }));
  }

  storeManager.functions.registerMiddleware(layoutMiddleware);
  storeManager.functions.registerMiddleware(ribbonMenuMiddleware);
  storeManager.functions.registerMiddleware(viewportMiddleware);
  storeManager.functions.registerMiddleware(viewportGroupsMiddleware);
  storeManager.functions.registerMiddleware(panelsMiddleware);

  componentRegistryManager.functions.createRegistries({
    [SECTIONS_REGISTRY_NAME]: {},
    [VIEWPORT_TYPE_REGISTRY_NAME]: {
      home: HomeViewport,
    },
    [SYSTEM_TRAY_REGISTRY_NAME]: {}
  });
};

export const postBootInitialization = ({managers: { storeManager, keyboardManager, ribbonMenuManager },}: PostBootInitializationProps) => {
  Object.entries(ribbonMenuManager.tabs ?? {}).forEach(([name, tab], index) => {
    const contextId = `${MODULE_NAME}/RibbonMenu`
    const id = `${contextId}/${index}`
    keyboardManager.functions.registerShortcuts([
      {
        id: id,
        key: 'Alt+' + (index + 1),
        contextId: contextId,
        action: () => document.getElementById(id)?.click(),
        description: 'Seleciona tab ' + name,
        enabled: true,
      }
    ], {context: 'RibbonMenu'})
  });
}
