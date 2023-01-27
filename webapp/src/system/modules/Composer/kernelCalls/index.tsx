import { StartModuleProps } from "@kernel/modules/base";
import { ILayoutModule } from "@kernel/modules/Layout";
import { ModulesContextType } from "@kernel/modules/Loader/context";
import { StoreManager } from "@kernel/modules/Store/hooks/useStoreManager";
import { Button } from "@mui/material";
import React from "react";
import { MODULE_NAME } from "../constants";

//import slice from "../store/Slice";

const testSection = React.memo(()=><>test my custom section</>)
const testSection2 = React.memo(()=><>test my custom section 2</>)


const composerComp = React.memo(()=><>test my composer</>)

export function startModule({
    managers: { storeManager,componentRegistryManager,layoutManager, ribbonMenuManager, viewportManager },
  }: StartModuleProps){
    // componentRegistryManager.functions.registerComponents()
    viewportManager.functions.registerViewportTypes({
      Composer: composerComp
    })
    
    ribbonMenuManager.functions.addNewTab({
      label: "Compositor",
      sections: {
        ModelSelector: testSection,
        PrinterSection: testSection2
      },
      type: "base"
    })

    


    //storeManager.functions.loadReducer(MODULE_NAME, slice.reducer)
    //storeManager.functions.registerMiddleware(middleware)
}
