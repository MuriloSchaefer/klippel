// graphs manager

import { StartModuleProps } from "../base";
import { MODULE_NAME } from "./constants";
import middlewares from "./store/middlewares";
import slice, { sessionSaver } from "./store/slice";


export const startModule = ({
  managers: { storeManager },storage
}: StartModuleProps) => {
  // configure session saver
  const store = storeManager.functions.getStore()
  storage.registerSessionSaveListener(
    store ? sessionSaver(store) : ()=>console.log('Missing store. skipping session save!')
  );
   storeManager.functions.loadReducer(MODULE_NAME, slice.reducer);
   storeManager.functions.registerMiddleware(middlewares);
};
