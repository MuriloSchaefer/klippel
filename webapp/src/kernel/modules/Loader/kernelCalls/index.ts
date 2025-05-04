import { StartModuleProps } from "@kernel/modules/base"
import { MODULE_NAME } from "../constants"
import slice, { sessionSaver } from "../store/slice"


export const start = ({
    managers: { storeManager },
    storage
  }: StartModuleProps) => {
    // configure session saver
    const store = storeManager.functions.getStore()
    storage.registerSessionSaveListener(
      store ? sessionSaver(store) : ()=>console.log('Missing store. skipping session save!')
    );
    storeManager.functions.loadReducer(MODULE_NAME, slice.reducer)
}

export const restart = () => {

}

export const shutdown = () => {

}