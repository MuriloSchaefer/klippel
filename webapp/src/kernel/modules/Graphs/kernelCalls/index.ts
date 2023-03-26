
// graphs manager
import { MODULE_NAME } from "../constants";

import managerSlice from "../store/graphsManager/slice"
import managerMiddlewares from "../store/graphsManager/middlewares"

import instanceMiddlewares from "../store/graphInstance/middlewares"
import { StartModuleProps } from "@kernel/modules/base";


export const startModule = ({
    managers: { storeManager },
  }: StartModuleProps) => {
    storeManager.functions.loadReducer(MODULE_NAME, managerSlice.reducer)
    storeManager.functions.registerMiddleware(managerMiddlewares)
    storeManager.functions.registerMiddleware(instanceMiddlewares)

}