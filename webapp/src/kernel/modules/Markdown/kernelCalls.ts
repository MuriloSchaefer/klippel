// graphs manager

import { StartModuleProps } from "../base";
import { MODULE_NAME } from "./constants";
import middlewares from "./store/middlewares";
import slice from "./store/slice";


export const startModule = ({
  managers: { storeManager },
}: StartModuleProps) => {
   storeManager.functions.loadReducer(MODULE_NAME, slice.reducer);
   storeManager.functions.registerMiddleware(middlewares);
};
