import { StartModuleProps } from "@kernel/modules/base"
import { MODULE_NAME } from "./constants"
import slice from "./store/slice"

import materialTypesMiddlewares from './store/materialTypes/middlewares'
import { loadMaterialTypes } from "./store/materialTypes/actions"


export function startModule({
    dispatch,
    managers: { storeManager,componentRegistryManager,layoutManager, ribbonMenuManager, viewportManager },
  }: StartModuleProps){
    
    storeManager.functions.loadReducer(MODULE_NAME, slice.reducer)
    storeManager.functions.registerMiddleware(materialTypesMiddlewares)

    dispatch(loadMaterialTypes({}))
    
    // componentRegistryManager.functions.registerComponents({
    //   ribbonMenuSections: {
    //     ModelSelector: React.memo(ModelSection),
    //   },
    //   viewportTypes: {
    //     Composer: React.memo(Composerviewport)
    //   }
    // })
    // ribbonMenuManager.functions.addNewTab({
    //   label: "Compositor",
    //   sectionNames: ['ModelSelector'],
    //   type: "base"
    // })

    //storeManager.functions.registerMiddleware(middleware)
}