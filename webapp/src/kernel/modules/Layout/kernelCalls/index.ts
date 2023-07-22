// graphs manager
import { MODULE_NAME, SECTIONS_REGISTRY_NAME, VIEWPORT_TYPE_REGISTRY_NAME } from "../constants";
import layoutMiddleware from "../store/middlewares";
import ribbonMenuMiddleware from "../store/ribbonMenu/middlewares";
import viewportMiddleware from "../store/viewports/middlewares";
import viewportGroupsMiddleware from "../store/viewports/groups/middlewares";
import panelsMiddleware from "../store/panels/middlewares";

import slice from "../store/slice";
import { StartModuleProps } from "@kernel/modules/base";
import HomeViewport from "../components/ViewportManager/HomeViewport";
import { switchTheme } from "../store/actions";

export const startModule = ({
  dispatch,
  managers: { storeManager, componentRegistryManager },
}: StartModuleProps) => {
  storeManager.functions.loadReducer(MODULE_NAME, slice.reducer);

  const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
  if (darkThemeMq.matches) {
    dispatch(switchTheme({theme: 'dark'}))
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
  })
};
