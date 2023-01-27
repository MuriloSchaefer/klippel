import { StartModuleProps } from "@kernel/modules/base"
import { StoreManager } from "@kernel/modules/Store/hooks/useStoreManager"
import { MODULE_NAME } from "../constants"
import slice from "../store/slice"


export const start = ({
    managers: { storeManager },
  }: StartModuleProps) => {
    storeManager.functions.loadReducer(MODULE_NAME, slice.reducer)
}

export const restart = () => {

}

export const shutdown = () => {

}