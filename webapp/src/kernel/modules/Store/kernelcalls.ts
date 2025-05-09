// graphs manager

import { StartModuleProps } from "../base";
import { sessionSaver } from "./slice";


export const restartModule = ({
  managers: { storeManager },storage
}: StartModuleProps) => {
  // configure session saver
  const store = storeManager.functions.getStore()
  storage.registerSessionSaveListener(
    store ? sessionSaver(store) : ()=>console.log('Missing store. skipping session save!')
  );
};
