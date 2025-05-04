
// graphs manager
import { MODULE_NAME } from "../constants";

import managerSlice from "../store/graphsManager/slice"
import managerMiddlewares from "../store/graphsManager/middlewares"

import instanceMiddlewares from "../store/graphInstance/middlewares"
import { StartModuleProps } from "@kernel/modules/base";
import { SECTIONS_REGISTRY_NAME, VIEWPORT_TYPE_REGISTRY_NAME } from "@kernel/modules/Layout/constants";
import GraphViewport from "../components/GraphViewer";
import { sessionSaver } from "../store/graphInstance/slice";


export const startModule = ({
    managers: { storeManager, componentRegistryManager },
    storage,
  }: StartModuleProps) => {
    // configure session saver
      const store = storeManager.functions.getStore()
      storage.registerSessionSaveListener(
        store ? sessionSaver(store) : ()=>console.log('Missing store. skipping session save!')
      );

    storeManager.functions.loadReducer(MODULE_NAME, managerSlice.reducer)
    storeManager.functions.registerMiddleware(managerMiddlewares)
    storeManager.functions.registerMiddleware(instanceMiddlewares)


  componentRegistryManager.functions.createRegistries({
    [SECTIONS_REGISTRY_NAME]: {},
    [VIEWPORT_TYPE_REGISTRY_NAME]: {
      graph: GraphViewport,
    },
  })

}