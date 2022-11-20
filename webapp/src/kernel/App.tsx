// External imports
import React, { useEffect, useMemo, useState } from "react";
import { Provider } from "react-redux";

// Kernel imports
import { initializeStore } from "@kernel/store";
import ModulesContext from "@kernel/contexts/modules";
import Layout from "@kernel/modules/LayoutModule/components";

// Modules imports
import LayoutModule from "@kernel/modules/LayoutModule";
import GraphModule from "@kernel/modules/GraphsModule";
import MouseManagerModule from "@kernel/modules/MouseModule";
import SVGModule from "@kernel/modules/SVGModule";

import ComposerModule from "modules/Composer";
import ServiceWorkerModule from "./modules/ServiceWorkerModule";

// Internal imports

const App = (): React.ReactElement => {
  const memoizedModules = useMemo(
    () => ({
      modules: {
        [ServiceWorkerModule.name]: ServiceWorkerModule,
        [MouseManagerModule.name]: MouseManagerModule,
        [LayoutModule.name]: LayoutModule,
        [GraphModule.name]: GraphModule,
        [ComposerModule.name]: ComposerModule,
        [SVGModule.name]: SVGModule,
      },
    }),
    [LayoutModule, GraphModule, ComposerModule]
  );
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(()=>{
      console.log(memoizedModules.modules, isLoaded)
      Object.entries(memoizedModules.modules).forEach(([name, module]) => {
        if (!isLoaded && 'system' in module.hooks){
          console.log( name)
          module.hooks.system?.afterModuleLoad()
        }
      });
      setIsLoaded(true)

  }, [memoizedModules.modules])

  return (
    <ModulesContext.Provider value={memoizedModules}>
      <Provider store={initializeStore(memoizedModules.modules)}>
        <Layout />
      </Provider>
    </ModulesContext.Provider>
  );
};

export default App;
