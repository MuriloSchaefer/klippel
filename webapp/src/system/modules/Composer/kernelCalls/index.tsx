import { StartModuleProps } from "@kernel/modules/base";
import React from "react";
import Composerviewport from "../components/ComposerViewport";
import ModelSection from "../components/ModelSection";
import { MODULE_NAME } from "../constants";
import middlewares from "../store/middlewares";
import graphMiddlewares from "../store/composition/middlewares";
import slice from "../store/slice";
import DebuggerViewport from "../components/DebuggerViewport";


export function startModule({
    managers: { storeManager,componentRegistryManager,layoutManager, ribbonMenuManager, viewportManager },
  }: StartModuleProps){
    storeManager.functions.loadReducer(MODULE_NAME, slice.reducer)
    storeManager.functions.registerMiddleware(middlewares)
    storeManager.functions.registerMiddleware(graphMiddlewares)
    
    componentRegistryManager.functions.registerComponents({
      ribbonMenuSections: {
        ModelSelector: React.memo(ModelSection),
      },
      viewportTypes: {
        Composer: React.memo(Composerviewport),
        DebuggerViewport: DebuggerViewport
      }
    })
    ribbonMenuManager.functions.addNewTab({
      label: "Compositor",
      sectionNames: ['ModelSelector'],
      type: "base"
    })

    //storeManager.functions.registerMiddleware(middleware)
}
