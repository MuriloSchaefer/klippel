// graphs manager

import { StartModuleProps } from "../base";
import { MODULE_NAME } from "./constants";
import middlewares from "./store/middlewares";
import slice from "./store/slice";


export const startModule = ({
  managers: { storeManager, componentRegistryManager },
}: StartModuleProps) => {
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
