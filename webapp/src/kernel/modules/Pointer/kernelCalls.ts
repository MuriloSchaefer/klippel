// graphs manager
import { StartModuleProps } from "@kernel/modules/base";
import { MODULE_NAME } from "./constants";
import slice from "./store/slice";


export const startModule = ({
  managers: { storeManager, componentRegistryManager },
}: StartModuleProps) => {
    console.group('Starting pointer module')
    storeManager.functions.loadReducer(MODULE_NAME, slice.reducer);
  
//   storeManager.functions.registerMiddleware(panelsMiddleware);

//   componentRegistryManager.functions.createRegistries({
//     [SECTIONS_REGISTRY_NAME]: {},
//     [VIEWPORT_TYPE_REGISTRY_NAME]: {
//       home: HomeViewport,
//     },
//   })
    console.info('Pointer module started')
    console.groupEnd()
};
