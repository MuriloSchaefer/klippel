// External imports
import React, { useMemo } from "react";
import { Provider } from "react-redux";

// Kernel imports
import { initializeStore } from "@kernel/store";
import ModulesContext from "@kernel/contexts/modules";
import Layout from "@kernel/modules/LayoutModule/components";

// Modules imports
import LayoutModule from "@kernel/modules/LayoutModule";
import GraphModule from "@kernel/modules/GraphsModule";
import MouseManagerModule from "@kernel/modules/MouseModule";

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
      },
    }),
    [LayoutModule, GraphModule, ComposerModule]
  );

  return (
    <ModulesContext.Provider value={memoizedModules}>
      <Provider store={initializeStore(memoizedModules.modules)}>
        <Layout />
      </Provider>
    </ModulesContext.Provider>
  );
};

export default App;
