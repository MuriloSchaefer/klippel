import { StartModuleProps } from "@kernel/modules/base";
import React from "react";
import Composerviewport from "../components/ComposerViewport";
import ModelSection from "../components/ModelSection";
import { MODULE_NAME } from "../constants";
import middlewares from "../store/middlewares";
import slice from "../store/slice";


export function startModule({
    managers: { storeManager,componentRegistryManager,layoutManager, ribbonMenuManager, viewportManager },
  }: StartModuleProps){
    

    storeManager.functions.loadReducer(MODULE_NAME, slice.reducer)
    storeManager.functions.registerMiddleware(middlewares)
    
    componentRegistryManager.functions.registerComponents({
      ribbonMenuSections: {
        ModelSelector: React.memo(ModelSection),
      },
      viewportTypes: {
        Composer: React.memo(Composerviewport)
      }
    })
    ribbonMenuManager.functions.addNewTab({
      label: "Compositor",
      sectionNames: ['ModelSelector'],
      type: "base"
    })

    //storeManager.functions.registerMiddleware(middleware)
}
