// External imports
import React, { useEffect, useMemo, useState } from "react";
import { Provider } from "react-redux";

// Kernel imports
import ModulesContext from "@kernel/contexts/modules";
import Layout from "@kernel/modules/LayoutModule/components";

// Modules imports
import LayoutModule from "@kernel/modules/LayoutModule";
import GraphModule from "@kernel/modules/Graphs";
import MouseManagerModule from "@kernel/modules/MouseModule";
import SVGModule from "@kernel/modules/SVGModule";

import ServiceWorkerModule from "./modules/ServiceWorkerModule";
import ModulesProvider from "./modules/Loader/components/ModulesProvider";
import StoreProvider from "./modules/Store/components/provider";

// Internal imports

const App = (): React.ReactElement => {
  // const [afterModuleLoad, setAfterModuleLoad] = useState(false)
  // const memoizedModules = useMemo(
  //   () => ({
  //     modules: {
  //       [ServiceWorkerModule.name]: ServiceWorkerModule,
  //       [MouseManagerModule.name]: MouseManagerModule,
  //       [LayoutModule.name]: LayoutModule,
  //       [GraphModule.name]: GraphModule,
  //       [SVGModule.name]: SVGModule,
  //       [ComposerModule.name]: ComposerModule,
  //     },
  //   }),
  //   []
  // );

  // useEffect(()=>{
  //     Object.entries(memoizedModules.modules).forEach(([name, module]) => {
  //       if ('system' in module.hooks && !afterModuleLoad){
  //         console.log( name)
  //         setAfterModuleLoad(true)
  //         module.hooks.system?.afterModuleLoad()
  //       }
  //     });

  // }, [])

  return (
    // First initialize store and then load modules, since the loader requires the store to be already up
    <StoreProvider> 
      <ModulesProvider >
        <div>app</div>
      </ModulesProvider>
    </StoreProvider>
    // <ModulesContext.Provider value={memoizedModules}>
      
    // </ModulesContext.Provider>
  );
};

export default App;
