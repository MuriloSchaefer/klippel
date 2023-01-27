// graphs manager
import { MODULE_NAME, SECTIONS_REGISTRY_NAME, VIEWPORT_TYPE_REGISTRY_NAME } from "../constants";
import layoutMiddleware from "../store/middlewares";
import ribbonMenuMiddleware from "../store/ribbonMenu/middlewares";
import viewportMiddleware from "../store/viewports/middlewares";

import slice from "../store/slice";
import { StartModuleProps } from "@kernel/modules/base";

export const startModule = ({
  managers: { storeManager, componentRegistryManager },
}: StartModuleProps) => {
  storeManager.functions.loadReducer(MODULE_NAME, slice.reducer);
  storeManager.functions.registerMiddleware(layoutMiddleware);
  storeManager.functions.registerMiddleware(ribbonMenuMiddleware);
  storeManager.functions.registerMiddleware(viewportMiddleware);

  componentRegistryManager.functions.createRegistries({
    [SECTIONS_REGISTRY_NAME]: {},
    [VIEWPORT_TYPE_REGISTRY_NAME]: {},
  })
};
