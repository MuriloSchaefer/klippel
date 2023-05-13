import React from "react"
import { StartModuleProps } from "@kernel/modules/base"
import slice from "./store/slice"
import { MODULE_NAME } from "./constants"



export function startModule({
    dispatch,
    managers: { storeManager,componentRegistryManager,layoutManager, ribbonMenuManager, viewportManager },
  }: StartModuleProps){
    
    storeManager.functions.loadReducer(MODULE_NAME, slice.reducer)
    // storeManager.functions.registerMiddleware(materialTypesMiddlewares)
    // storeManager.functions.registerMiddleware(materialsMiddlewares)

    // dispatch(loadMaterialTypes({}))
    // dispatch(loadMaterials({}))
    
    // componentRegistryManager.functions.registerComponents({
    //   ribbonMenuSections: {
    //     MaterialTypeSection: React.memo(MaterialTypesSection),
    //   }
    // })
    // ribbonMenuManager.functions.addNewTab({
    //   label: "Materiais",
    //   sectionNames: ['MaterialTypeSection'],
    //   type: "base"
    // })

    //storeManager.functions.registerMiddleware(middleware)
}