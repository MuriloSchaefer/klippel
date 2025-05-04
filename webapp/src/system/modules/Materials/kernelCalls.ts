import React from "react"
import { StartModuleProps } from "@kernel/modules/base"

import { MODULE_NAME } from "./constants"
import slice, { sessionSaver } from "./store/slice"

import MaterialTypesSection from "./components/MaterialTypesSection"

import materialTypesMiddlewares from './store/materialTypes/middlewares'
import materialsMiddlewares from './store/materials/middlewares'
import moduleMiddlewares from './store/middlewares'

import { loadMaterialTypes } from "./store/materialTypes/actions"
import { loadMaterials } from "./store/materials/actions"


export function startModule({
    dispatch,
    managers: { storeManager,componentRegistryManager,layoutManager, ribbonMenuManager, viewportManager }, storage
  }: StartModuleProps){
    // configure session saver
    const store = storeManager.functions.getStore()
    storage.registerSessionSaveListener(
      store ? sessionSaver(store) : ()=>console.log('Missing store. skipping session save!')
    );
    
    storeManager.functions.loadReducer(MODULE_NAME, slice.reducer)
    storeManager.functions.registerMiddleware(moduleMiddlewares)
    storeManager.functions.registerMiddleware(materialTypesMiddlewares)
    storeManager.functions.registerMiddleware(materialsMiddlewares)

    dispatch(loadMaterialTypes({}))
    dispatch(loadMaterials({}))
    
    componentRegistryManager.functions.registerComponents({
      ribbonMenuSections: {
        MaterialTypeSection: React.memo(MaterialTypesSection),
      }
    })
    ribbonMenuManager.functions.addNewTab({
      label: "Materiais",
      sectionNames: ['MaterialTypeSection'],
      type: "base"
    })

    //storeManager.functions.registerMiddleware(middleware)
}